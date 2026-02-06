import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { GlobalState } from "../state";
import { log, showLogs } from "./log";

const GO_EXTENSION_ID = "golang.go";
const GLOBAL_STATE_KEY = "ignite.goDebugAdapterBackups";

function shouldRemoveLine(line: string): boolean {
  if (line.includes("Failed to continue: Check the debug console for details")) return true;
  if (line.includes("Failed to continue:") && line.includes("ECONNREFUSED")) return true;
  if (line.includes("connect ECONNREFUSED")) return true;
  return false;
}

function applyPatch(content: string): string {
  let out = content
    .split("\n")
    .filter((line) => !shouldRemoveLine(line))
    .join("\n");
  out = out.replace(/\bshowUser\s*:\s*!0\b/g, "showUser:!1");
  out = out.replace(/\bshowUser\s*:\s*true\b/gi, "showUser:false");
  out = out.replace(/"showUser"\s*:\s*!0\b/g, '"showUser":!1');
  out = out.replace(/"showUser"\s*:\s*true\b/gi, '"showUser":false');
  out = out.replace(/\.showUser\s*=\s*!0\b/g, ".showUser=!1");
  out = out.replace(/\.showUser\s*=\s*true\b/gi, ".showUser=false");
  out = out.replace(/\[\s*["']showUser["']\s*\]\s*=\s*!0\b/g, '["showUser"]=!1');
  out = out.replace(/\[\s*["']showUser["']\s*\]\s*=\s*true\b/gi, '["showUser"]=false');
  return out;
}

function contentNeedsPatch(content: string): boolean {
  if (
    content.includes("Failed to continue: Check the debug console for details") ||
    (content.includes("Failed to continue:") && content.includes("ECONNREFUSED")) ||
    content.includes("connect ECONNREFUSED")
  ) {
    return true;
  }
  if (/showUser/.test(content) && (/!0\b/.test(content) || /:\s*true\b/i.test(content) || /=\s*true\b/i.test(content))) {
    return true;
  }
  return false;
}

function getGoExtensionPath(): string | null {
  const goExt = vscode.extensions.getExtension(GO_EXTENSION_ID);
  return goExt?.extensionPath ?? null;
}

function listJsFilesInDir(dirPath: string): string[] {
  const out: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dirPath, e.name);
      if (e.isFile() && e.name.endsWith(".js")) out.push(full);
      if (e.isDirectory()) {
        out.push(...listJsFilesInDir(full));
      }
    }
  } catch {
    // ignore
  }
  return out;
}

export function patch(): void {
  const extPath = getGoExtensionPath();
  if (!extPath) return;

  const distPath = path.join(extPath, "dist");
  const outPath = path.join(extPath, "out");
  const nodeModulesPath = path.join(extPath, "node_modules");
  const dirsToScan = [distPath, outPath, nodeModulesPath].filter((d) => fs.existsSync(d));
  const ctx = GlobalState.getContext();
  if (!ctx?.globalState) return;

  const backups: Record<string, string> = {};
  const patchedFiles: string[] = [];

  for (const dir of dirsToScan) {
    for (const filePath of listJsFilesInDir(dir)) {
      try {
        const content = fs.readFileSync(filePath, "utf8");
        if (!contentNeedsPatch(content)) continue;

        const patched = applyPatch(content);
        if (patched === content) continue;

        const relativeKey = path.relative(extPath, filePath);
        if (!relativeKey.includes("node_modules")) {
          backups[relativeKey] = content;
        }
        fs.writeFileSync(filePath, patched, "utf8");
        patchedFiles.push(path.relative(extPath, filePath));
      } catch {
        // ignore
      }
    }
  }

  if (Object.keys(backups).length > 0) {
    ctx.globalState.update(GLOBAL_STATE_KEY, backups);
  }

  if (patchedFiles.length > 0) {
    log(`Ignite: Go debug adapter patch applied (${patchedFiles.length} files).`);
    for (const file of patchedFiles) {
      log(`  patched: ${file}`);
    }
    showLogs(true);
  } else {
    log("Ignite: Go debug adapter patch skipped (no changes needed).");
  }
}

export function restore(): void {
  const extPath = getGoExtensionPath();
  if (!extPath) return;

  const ctx = GlobalState.getContext();
  if (!ctx?.globalState) return;

  const backups = ctx.globalState.get<Record<string, string>>(GLOBAL_STATE_KEY);
  if (!backups || Object.keys(backups).length === 0) return;

  const restoredFiles: string[] = [];

  for (const [relativeKey, originalContent] of Object.entries(backups)) {
    try {
      const filePath = path.join(extPath, relativeKey);
      if (!fs.existsSync(filePath)) continue;

      const current = fs.readFileSync(filePath, "utf8");
      const expectedPatched = applyPatch(originalContent);
      if (current !== expectedPatched) continue;

      fs.writeFileSync(filePath, originalContent, "utf8");
      restoredFiles.push(relativeKey);
    } catch {
      // ignore
    }
    delete backups[relativeKey];
  }

  ctx?.globalState?.update(GLOBAL_STATE_KEY, Object.keys(backups).length > 0 ? backups : undefined);

  if (restoredFiles.length > 0) {
    log(`Ignite: Go debug adapter patch restored (${restoredFiles.length} files).`);
    for (const file of restoredFiles) {
      log(`  restored: ${file}`);
    }
    showLogs(true);
  } else {
    log("Ignite: Go debug adapter restore skipped (no backups).");
  }
}
