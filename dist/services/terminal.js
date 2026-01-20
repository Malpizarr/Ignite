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
const vscode = __importStar(require("vscode"));
const state_1 = require("../state");
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
function ensureAirStarted(procName, airCommand) {
    const storedTerminal = state_1.GlobalState.getAirTerminal();
    if (storedTerminal) {
        if (isTerminalActive(storedTerminal)) {
            storedTerminal.show(true);
            storedTerminal.sendText(airCommand, true);
            return;
        }
        state_1.GlobalState.setAirTerminal(undefined);
    }
    const existingTerminal = findExistingAirTerminal(procName);
    if (existingTerminal) {
        setupTerminalTracking(existingTerminal);
        state_1.GlobalState.setAirTerminal(existingTerminal);
        existingTerminal.show(true);
        existingTerminal.sendText(airCommand, true);
        return;
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
}
