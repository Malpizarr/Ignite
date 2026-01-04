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
exports.openMiniUI = openMiniUI;
const vscode = __importStar(require("vscode"));
const helpers_1 = require("./helpers");
const auto_attach_1 = require("./auto_attach");
const state_1 = require("./state");
const config_1 = require("./config");
async function openMiniUI() {
    const config = (0, config_1.getConfiguration)();
    const currentName = config.processName;
    const pick = await vscode.window.showQuickPick([
        { label: state_1.GlobalState.isRunning() ? "$(stop) Stop" : "$(play) Start", description: `Process: ${currentName}` },
        { label: "$(pencil) Change process", description: `Current: ${currentName}` },
        { label: "$(gear) Change command", description: `Current: ${config.airCommand}` },
        { label: "$(settings) Advanced Settings", description: "Poll Interval & Attach Delay" },
        { label: "$(trash) Reset terminal", description: "Closes the internal Air terminal if created by extension" },
        { label: "$(sync) Reset Config", description: "Clears manual process name and start command" }
    ], { title: "Ignite: Control Panel", placeHolder: "Select an action" });
    if (!pick)
        return;
    if (pick.label.includes("Change process")) {
        const next = await vscode.window.showInputBox({
            title: "Process / Binary Name",
            value: currentName,
            prompt: "e.g. api, worker, payments... (used as PROC_NAME and for process matching)"
        });
        if (!next)
            return;
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.PROCESS_NAME, next.trim());
        vscode.window.showInformationMessage(`Process changed to: ${next.trim()}`);
        if (!state_1.GlobalState.isRunning()) {
            (0, helpers_1.setStatus)(`$(play) Ignite: ${next.trim()}`, config_1.COMMANDS.OPEN, "Click to start or configure");
        }
        return;
    }
    if (pick.label.includes("Change command")) {
        const currentCmd = config.airCommand;
        const next = await vscode.window.showInputBox({
            title: "Start Command (Watcher)",
            value: currentCmd,
            prompt: "e.g. make run, air, go run main.go..."
        });
        if (!next)
            return;
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.AIR_COMMAND, next.trim());
        vscode.window.showInformationMessage(`Command updated to: ${next.trim()}`);
        return;
    }
    if (pick.label.includes("Advanced Settings")) {
        const action = await vscode.window.showQuickPick([
            { label: "Poll Interval", description: `Current: ${config.pollMs}ms` },
            { label: "Attach Delay", description: `Current: ${config.attachDelay}ms` }
        ], { title: "Ignite: Advanced Settings" });
        if (!action)
            return;
        if (action.label === "Poll Interval") {
            const val = await vscode.window.showInputBox({
                title: "Poll Interval (ms)",
                value: config.pollMs.toString(),
                prompt: "How often to check for the process."
            });
            if (val) {
                const ms = parseInt(val, 10);
                if (!isNaN(ms) && ms > 0) {
                    await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.POLL_MS, ms);
                    vscode.window.showInformationMessage(`Poll Interval updated to ${ms}ms`);
                }
            }
        }
        if (action.label === "Attach Delay") {
            const val = await vscode.window.showInputBox({
                title: "Attach Delay (ms)",
                value: config.attachDelay.toString(),
                prompt: "Delay after detection before attaching."
            });
            if (val) {
                const ms = parseInt(val, 10);
                if (!isNaN(ms) && ms >= 0) {
                    await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.ATTACH_DELAY, ms);
                    vscode.window.showInformationMessage(`Attach Delay updated to ${ms}ms`);
                }
            }
        }
        return;
    }
    if (pick.label.includes("Reset Config")) {
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.PROCESS_NAME, undefined);
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.AIR_COMMAND, undefined);
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.POLL_MS, undefined);
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.ATTACH_DELAY, undefined);
        const newConfig = (0, config_1.getConfiguration)();
        vscode.window.showInformationMessage(`Configuration reset. Auto-detected process: ${newConfig.processName}`);
        if (!state_1.GlobalState.isRunning()) {
            (0, helpers_1.setStatus)(`$(play) Ignite: ${newConfig.processName}`, config_1.COMMANDS.OPEN, "Click to start or configure");
        }
        return;
    }
    if (pick.label.includes("Reset terminal")) {
        const term = state_1.GlobalState.getAirTerminal();
        if (term) {
            term.dispose();
            state_1.GlobalState.setAirTerminal(undefined);
            vscode.window.showInformationMessage("Air terminal reset.");
        }
        else {
            vscode.window.showInformationMessage("No Air terminal found to reset.");
        }
        return;
    }
    if (state_1.GlobalState.isRunning()) {
        await (0, helpers_1.stopAll)();
    }
    else {
        await (0, auto_attach_1.startAutoAttach)();
    }
}
