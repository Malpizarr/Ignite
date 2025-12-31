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
exports.sleep = sleep;
exports.setStatus = setStatus;
exports.isProcessRunning = isProcessRunning;
exports.getProcessCommand = getProcessCommand;
exports.escapeForPgrepEre = escapeForPgrepEre;
exports.pgrepNewestPid = pgrepNewestPid;
exports.waitForPid = waitForPid;
exports.ensureAirStarted = ensureAirStarted;
exports.stopAll = stopAll;
exports.deactivate = deactivate;
const child_process_1 = require("child_process");
const vscode = __importStar(require("vscode"));
const state_1 = require("./state");
const config_1 = require("./config");
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function setStatus(text, command = config_1.COMMANDS.OPEN, tooltip = "Ignite") {
    let item = state_1.GlobalState.getStatusItem();
    if (!item) {
        item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        state_1.GlobalState.setStatusItem(item);
    }
    item.text = text;
    item.command = command;
    item.tooltip = tooltip;
    item.show();
}
async function isProcessRunning(pid) {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)("ps", ["-p", pid.toString(), "-o", "state="], (err, stdout) => {
            if (err) {
                resolve(false);
                return;
            }
            const state = stdout.trim();
            resolve(!state.startsWith("Z"));
        });
    });
}
async function getProcessCommand(pid) {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)("ps", ["-p", pid.toString(), "-o", "command="], (err, stdout) => {
            resolve(err ? "" : stdout.trim());
        });
    });
}
function escapeForPgrepEre(lit) {
    return lit.replace(/[.[\]{}()+*?^$|\\]/g, "\\$&");
}
async function pgrepNewestPid(pattern) {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)("pgrep", ["-n", "-f", pattern], (err, stdout) => {
            if (err)
                return resolve(null);
            const s = (stdout || "").trim();
            const pid = Number.parseInt(s, 10);
            resolve(Number.isFinite(pid) ? pid : null);
        });
    });
}
async function waitForPid(pattern, pollMs) {
    while (state_1.GlobalState.isRunning()) {
        const pid = await pgrepNewestPid(pattern);
        if (pid)
            return pid;
        await sleep(pollMs);
    }
    return null;
}
function ensureAirStarted(procName, airCommand) {
    if (state_1.GlobalState.getAirTerminal())
        return;
    const t = vscode.window.createTerminal({
        name: `air (${procName})`,
        env: {
            ...process.env,
            PROC_NAME: procName
        }
    });
    state_1.GlobalState.setAirTerminal(t);
    t.show(true);
    t.sendText(airCommand, true);
}
async function stopAll() {
    state_1.GlobalState.setRunning(false);
    vscode.window.showInformationMessage("Ignite stopped.");
}
function deactivate() {
    state_1.GlobalState.setRunning(false);
    state_1.GlobalState.getAirTerminal()?.dispose();
    state_1.GlobalState.getStatusItem()?.dispose();
}
