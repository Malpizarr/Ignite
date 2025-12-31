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
exports.startAutoAttach = startAutoAttach;
const vscode = __importStar(require("vscode"));
const helpers_1 = require("./helpers");
const state_1 = require("./state");
const config_1 = require("./config");
async function startAutoAttach() {
    if (state_1.GlobalState.isRunning()) {
        vscode.window.showInformationMessage("Already running.");
        return;
    }
    const config = (0, config_1.getConfiguration)();
    const procName = config.processName;
    const pollMs = config.pollMs;
    const startAir = config.startAir;
    const airCommand = config.airCommand;
    const nameEre = (0, helpers_1.escapeForPgrepEre)(procName);
    const pattern = `tmp/${nameEre}($|\\s)|(^|[^a-zA-Z0-9_])${nameEre}($|[^a-zA-Z0-9_])`;
    if (startAir)
        (0, helpers_1.ensureAirStarted)(procName, airCommand);
    state_1.GlobalState.setRunning(true);
    (0, helpers_1.setStatus)(`$(debug-disconnect) Ignite: waiting for "${procName}"...`, config_1.COMMANDS.OPEN, "Waiting for process... Click for options");
    const endedSessions = new Set();
    const termDisp = vscode.debug.onDidTerminateDebugSession((s) => endedSessions.add(s.id));
    let lastPid = 0;
    try {
        while (state_1.GlobalState.isRunning()) {
            const pid = await (0, helpers_1.waitForPid)(pattern, pollMs);
            if (!state_1.GlobalState.isRunning() || !pid)
                break;
            if (pid === lastPid) {
                await (0, helpers_1.sleep)(pollMs);
                continue;
            }
            const cmd = await (0, helpers_1.getProcessCommand)(pid);
            if (/(^|\/|\\)\.?air(\.exe)?($|\s)/.test(cmd) || /(^|\/|\\)go(\.exe)?\s+build/.test(cmd)) {
                await (0, helpers_1.sleep)(pollMs);
                continue;
            }
            if (!state_1.GlobalState.isRunning())
                continue;
            await (0, helpers_1.sleep)(200);
            if (!(await (0, helpers_1.isProcessRunning)(pid))) {
                continue;
            }
            endedSessions.clear();
            (0, helpers_1.setStatus)(`$(debug-start) Ignite: attach PID ${pid} (${procName})…`, config_1.COMMANDS.OPEN);
            const wsFolder = vscode.workspace.workspaceFolders?.[0];
            const ok = await vscode.debug.startDebugging(wsFolder, {
                name: `Ignite ${procName} (PID ${pid})`,
                type: "go",
                request: "attach",
                mode: "local",
                processId: pid,
                program: wsFolder?.uri.fsPath ?? "${workspaceFolder}",
                showLog: true
            });
            if (!ok) {
                (0, helpers_1.setStatus)(`$(error) Ignite: failed to attach (PID ${pid}).`, config_1.COMMANDS.OPEN);
                await (0, helpers_1.sleep)(500);
                continue;
            }
            lastPid = pid;
            (0, helpers_1.setStatus)(`$(debug-alt) Ignite: attached (${procName}).`, config_1.COMMANDS.OPEN, "Attached. Click for options");
            while (state_1.GlobalState.isRunning() && endedSessions.size === 0) {
                await (0, helpers_1.sleep)(200);
            }
            if (!state_1.GlobalState.isRunning())
                break;
            (0, helpers_1.setStatus)(`$(debug-disconnect) Ignite: reload detected, retrying...`, config_1.COMMANDS.OPEN);
            await (0, helpers_1.sleep)(300);
        }
    }
    finally {
        termDisp.dispose();
        state_1.GlobalState.setRunning(false);
        const finalConfig = (0, config_1.getConfiguration)();
        (0, helpers_1.setStatus)(`$(play) Ignite: ${finalConfig.processName}`, config_1.COMMANDS.OPEN, "Click to start or configure");
        await (0, helpers_1.sleep)(600);
    }
}
