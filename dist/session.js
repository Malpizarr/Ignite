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
exports.stopAll = stopAll;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const state_1 = require("./state");
const goDebugAdapterPatch_1 = require("./services/goDebugAdapterPatch");
const common_1 = require("./utils/common");
const config_1 = require("./config");
const regex_1 = require("./utils/regex");
const process_1 = require("./services/process");
async function stopAll() {
    state_1.GlobalState.setRunning(false);
    const trackedSessions = state_1.GlobalState.getDebugSessions();
    const activeSession = vscode.debug.activeDebugSession;
    const sessionsToStop = [...trackedSessions];
    if (activeSession?.name.startsWith("Ignite") && !sessionsToStop.some((s) => s.id === activeSession.id)) {
        sessionsToStop.push(activeSession);
    }
    await Promise.allSettled(sessionsToStop.map((session) => vscode.debug.stopDebugging(session)));
    const waitUntil = Date.now() + 2500;
    while (Date.now() < waitUntil) {
        const stillRunning = state_1.GlobalState.getDebugSessions().length > 0;
        if (!stillRunning)
            break;
        await (0, common_1.sleep)(100);
    }
    state_1.GlobalState.clearDebugSessions();
    (0, goDebugAdapterPatch_1.restore)();
    const airTerminal = state_1.GlobalState.getAirTerminal();
    if (airTerminal) {
        airTerminal.dispose();
        state_1.GlobalState.setAirTerminal(undefined);
    }
    const config = (0, config_1.getConfiguration)();
    const pattern = (0, regex_1.buildProcessPattern)(config.processName);
    await (0, process_1.terminateTargetProcesses)(pattern, config.processName);
    vscode.window.showInformationMessage("Ignite stopped.");
}
function deactivate() {
    state_1.GlobalState.setRunning(false);
    state_1.GlobalState.getAirTerminal()?.dispose();
    state_1.GlobalState.getStatusItem()?.dispose();
    state_1.GlobalState.disposeAll();
}
