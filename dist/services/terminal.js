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
exports.ensureAirStarted = ensureAirStarted;
exports.focusAirTerminal = focusAirTerminal;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const state_1 = require("../state");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const SHELL_BUILTINS = new Set(["cd", "alias", "export", "unset", "set", "eval", "exec", "source", "."]);
function isTerminalActive(terminal) {
    return vscode.window.terminals.includes(terminal);
}
function findExistingAirTerminal(procName) {
    const terminalName = `air (${procName})`;
    return vscode.window.terminals.find(t => t.name === terminalName);
}
function setupTerminalTracking(terminal) {
    const terminalDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === terminal) {
            state_1.GlobalState.setAirTerminal(undefined);
            state_1.GlobalState.removeDisposable(terminalDisposable);
            terminalDisposable.dispose();
        }
    });
    state_1.GlobalState.addDisposable(terminalDisposable);
}
function extractExecutable(command) {
    const trimmed = command.trim();
    if (!trimmed)
        return null;
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token))
            continue;
        return token;
    }
    return null;
}
async function executableExists(execName) {
    if (!execName)
        return false;
    if (SHELL_BUILTINS.has(execName))
        return true;
    if (execName.includes("/")) {
        return fs.existsSync(execName);
    }
    try {
        await execFileAsync("which", [execName], { timeout: 2000 });
        return true;
    }
    catch {
        return false;
    }
}
async function validateAirCommand(airCommand) {
    const executable = extractExecutable(airCommand);
    if (!executable) {
        vscode.window.showErrorMessage("Ignite start command is empty.");
        return false;
    }
    const exists = await executableExists(executable);
    if (exists)
        return true;
    vscode.window.showErrorMessage(`Ignite could not find executable: ${executable}. Update autoAttachUI.startCommand or your PATH.`);
    return false;
}
function disposeTerminal(terminal) {
    if (!terminal)
        return;
    if (!isTerminalActive(terminal))
        return;
    terminal.dispose();
}
async function ensureAirStarted(procName, airCommand) {
    const valid = await validateAirCommand(airCommand);
    if (!valid) {
        return false;
    }
    const storedTerminal = state_1.GlobalState.getAirTerminal();
    if (storedTerminal) {
        disposeTerminal(storedTerminal);
        state_1.GlobalState.setAirTerminal(undefined);
    }
    const existingTerminal = findExistingAirTerminal(procName);
    if (existingTerminal) {
        disposeTerminal(existingTerminal);
    }
    const t = vscode.window.createTerminal({
        name: `air (${procName})`,
        env: {
            ...process.env,
            PROC_NAME: procName
        }
    });
    setupTerminalTracking(t);
    state_1.GlobalState.setAirTerminal(t);
    t.show(true);
    t.sendText(airCommand, true);
    return true;
}
async function focusAirTerminal() {
    const storedTerminal = state_1.GlobalState.getAirTerminal();
    if (storedTerminal && isTerminalActive(storedTerminal)) {
        storedTerminal.show(false);
        return;
    }
    const activeTerminal = vscode.window.activeTerminal;
    if (activeTerminal) {
        activeTerminal.show(false);
        return;
    }
    if (vscode.window.terminals.length > 0) {
        vscode.window.terminals[0].show(false);
        return;
    }
    await vscode.commands.executeCommand("workbench.action.terminal.focus");
}
