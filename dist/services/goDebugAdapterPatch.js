"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.patch = patch;
exports.restore = restore;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const state_1 = require("../state");
const log_1 = require("./log");
const GO_EXTENSION_ID = "golang.go";
const GLOBAL_STATE_KEY = "ignite.goDebugAdapterBackups";
function shouldRemoveLine(line) {
    if (line.includes("Failed to continue: Check the debug console for details"))
        return true;
    if (line.includes("Failed to continue:") && line.includes("ECONNREFUSED"))
        return true;
    if (line.includes("connect ECONNREFUSED"))
        return true;
    return false;
}
function applyPatch(content) {
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
function contentNeedsPatch(content) {
    if (content.includes("Failed to continue: Check the debug console for details") ||
        (content.includes("Failed to continue:") && content.includes("ECONNREFUSED")) ||
        content.includes("connect ECONNREFUSED")) {
        return true;
    }
    if (/showUser/.test(content) && (/!0\b/.test(content) || /:\s*true\b/i.test(content) || /=\s*true\b/i.test(content))) {
        return true;
    }
    return false;
}
function getGoExtensionPath() {
    const goExt = vscode.extensions.getExtension(GO_EXTENSION_ID);
    return goExt?.extensionPath ?? null;
}
function listJsFilesInDir(dirPath) {
    const out = [];
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const e of entries) {
            const full = path.join(dirPath, e.name);
            if (e.isFile() && e.name.endsWith(".js"))
                out.push(full);
            if (e.isDirectory()) {
                out.push(...listJsFilesInDir(full));
            }
        }
    }
    catch {
        // ignore
    }
    return out;
}
function patch() {
    const extPath = getGoExtensionPath();
    if (!extPath)
        return;
    const distPath = path.join(extPath, "dist");
    const outPath = path.join(extPath, "out");
    const nodeModulesPath = path.join(extPath, "node_modules");
    const dirsToScan = [distPath, outPath, nodeModulesPath].filter((d) => fs.existsSync(d));
    const ctx = state_1.GlobalState.getContext();
    if (!ctx?.globalState)
        return;
    const backups = {};
    const patchedFiles = [];
    for (const dir of dirsToScan) {
        for (const filePath of listJsFilesInDir(dir)) {
            try {
                const content = fs.readFileSync(filePath, "utf8");
                if (!contentNeedsPatch(content))
                    continue;
                const patched = applyPatch(content);
                if (patched === content)
                    continue;
                const relativeKey = path.relative(extPath, filePath);
                if (!relativeKey.includes("node_modules")) {
                    backups[relativeKey] = content;
                }
                fs.writeFileSync(filePath, patched, "utf8");
                patchedFiles.push(path.relative(extPath, filePath));
            }
            catch {
                // ignore
            }
        }
    }
    if (Object.keys(backups).length > 0) {
        ctx.globalState.update(GLOBAL_STATE_KEY, backups);
    }
    if (patchedFiles.length > 0) {
        (0, log_1.log)(`Ignite: Go debug adapter patch applied (${patchedFiles.length} files).`);
        for (const file of patchedFiles) {
            (0, log_1.log)(`  patched: ${file}`);
        }
        (0, log_1.showLogs)(true);
    }
    else {
        (0, log_1.log)("Ignite: Go debug adapter patch skipped (no changes needed).");
    }
}
function restore() {
    const extPath = getGoExtensionPath();
    if (!extPath)
        return;
    const ctx = state_1.GlobalState.getContext();
    if (!ctx?.globalState)
        return;
    const backups = ctx.globalState.get(GLOBAL_STATE_KEY);
    if (!backups || Object.keys(backups).length === 0)
        return;
    const restoredFiles = [];
    for (const [relativeKey, originalContent] of Object.entries(backups)) {
        try {
            const filePath = path.join(extPath, relativeKey);
            if (!fs.existsSync(filePath))
                continue;
            const current = fs.readFileSync(filePath, "utf8");
            const expectedPatched = applyPatch(originalContent);
            if (current !== expectedPatched)
                continue;
            fs.writeFileSync(filePath, originalContent, "utf8");
            restoredFiles.push(relativeKey);
        }
        catch {
            // ignore
        }
        delete backups[relativeKey];
    }
    ctx?.globalState?.update(GLOBAL_STATE_KEY, Object.keys(backups).length > 0 ? backups : undefined);
    if (restoredFiles.length > 0) {
        (0, log_1.log)(`Ignite: Go debug adapter patch restored (${restoredFiles.length} files).`);
        for (const file of restoredFiles) {
            (0, log_1.log)(`  restored: ${file}`);
        }
        (0, log_1.showLogs)(true);
    }
    else {
        (0, log_1.log)("Ignite: Go debug adapter restore skipped (no backups).");
    }
}
