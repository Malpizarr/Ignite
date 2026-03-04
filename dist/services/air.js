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
exports.ensureAirReady = ensureAirReady;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const MIN_AIR_VERSION = "1.60.0";
const AIR_INSTALL_COMMAND = "go install github.com/air-verse/air@latest";
const AIR_DOCS_URL = "https://github.com/air-verse/air";
function parseSemver(text) {
    const match = text.match(/\bv?(\d+)\.(\d+)\.(\d+)\b/);
    if (!match)
        return null;
    return `${match[1]}.${match[2]}.${match[3]}`;
}
function compareSemver(a, b) {
    const pa = a.split(".").map((n) => Number.parseInt(n, 10));
    const pb = b.split(".").map((n) => Number.parseInt(n, 10));
    for (let i = 0; i < 3; i++) {
        const da = pa[i] ?? 0;
        const db = pb[i] ?? 0;
        if (da > db)
            return 1;
        if (da < db)
            return -1;
    }
    return 0;
}
async function getAirVersion() {
    try {
        const { stdout, stderr } = await execFileAsync("air", ["-v"], { timeout: 2500 });
        return parseSemver(`${stdout}\n${stderr}`);
    }
    catch {
        try {
            const { stdout, stderr } = await execFileAsync("air", ["--version"], { timeout: 2500 });
            return parseSemver(`${stdout}\n${stderr}`);
        }
        catch {
            return null;
        }
    }
}
async function inspectAir() {
    const version = await getAirVersion();
    if (!version) {
        return { installed: false, reason: "missing" };
    }
    if (compareSemver(version, MIN_AIR_VERSION) < 0) {
        return { installed: true, version, reason: "outdated" };
    }
    return { installed: true, version, reason: "ok" };
}
function runInstallInTerminal() {
    const terminal = vscode.window.createTerminal({ name: "Ignite: Install Air" });
    terminal.show(true);
    terminal.sendText(AIR_INSTALL_COMMAND, true);
}
async function ensureAirReady() {
    const result = await inspectAir();
    if (result.reason === "ok")
        return true;
    if (result.reason === "missing") {
        const action = await vscode.window.showErrorMessage("Ignite requires Air, but it was not found in PATH.", "Install Air", "Open docs", "Cancel");
        if (action === "Install Air") {
            runInstallInTerminal();
        }
        else if (action === "Open docs") {
            await vscode.env.openExternal(vscode.Uri.parse(AIR_DOCS_URL));
        }
        return false;
    }
    const action = await vscode.window.showWarningMessage(`Ignite requires Air >= v${MIN_AIR_VERSION}. Detected: v${result.version}.`, "Update Air", "Open docs", "Cancel");
    if (action === "Update Air") {
        runInstallInTerminal();
    }
    else if (action === "Open docs") {
        await vscode.env.openExternal(vscode.Uri.parse(AIR_DOCS_URL));
    }
    return false;
}
