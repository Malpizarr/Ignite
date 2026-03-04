import * as vscode from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const MIN_AIR_VERSION = "1.60.0";
const AIR_INSTALL_COMMAND = "go install github.com/air-verse/air@latest";
const AIR_DOCS_URL = "https://github.com/air-verse/air";

type AirCheckResult = {
  installed: boolean;
  version?: string;
  reason?: "missing" | "outdated" | "ok";
};

function parseSemver(text: string): string | null {
  const match = text.match(/\bv?(\d+)\.(\d+)\.(\d+)\b/);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10));
  const pb = b.split(".").map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

async function getAirVersion(): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync("air", ["-v"], { timeout: 2500 });
    return parseSemver(`${stdout}\n${stderr}`);
  } catch {
    try {
      const { stdout, stderr } = await execFileAsync("air", ["--version"], { timeout: 2500 });
      return parseSemver(`${stdout}\n${stderr}`);
    } catch {
      return null;
    }
  }
}

async function inspectAir(): Promise<AirCheckResult> {
  const version = await getAirVersion();
  if (!version) {
    return { installed: false, reason: "missing" };
  }
  if (compareSemver(version, MIN_AIR_VERSION) < 0) {
    return { installed: true, version, reason: "outdated" };
  }
  return { installed: true, version, reason: "ok" };
}

function runInstallInTerminal(): void {
  const terminal = vscode.window.createTerminal({ name: "Ignite: Install Air" });
  terminal.show(true);
  terminal.sendText(AIR_INSTALL_COMMAND, true);
}

export async function ensureAirReady(): Promise<boolean> {
  const result = await inspectAir();
  if (result.reason === "ok") return true;

  if (result.reason === "missing") {
    const action = await vscode.window.showErrorMessage(
      "Ignite requires Air, but it was not found in PATH.",
      "Install Air",
      "Open docs",
      "Cancel"
    );
    if (action === "Install Air") {
      runInstallInTerminal();
    } else if (action === "Open docs") {
      await vscode.env.openExternal(vscode.Uri.parse(AIR_DOCS_URL));
    }
    return false;
  }

  const action = await vscode.window.showWarningMessage(
    `Ignite requires Air >= v${MIN_AIR_VERSION}. Detected: v${result.version}.`,
    "Update Air",
    "Open docs",
    "Cancel"
  );
  if (action === "Update Air") {
    runInstallInTerminal();
  } else if (action === "Open docs") {
    await vscode.env.openExternal(vscode.Uri.parse(AIR_DOCS_URL));
  }
  return false;
}
