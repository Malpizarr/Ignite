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
const ui_1 = require("./services/ui");
const session_1 = require("./session");
const auto_attach_1 = require("./auto_attach");
const state_1 = require("./state");
const config_1 = require("./config");
const updater_1 = require("./services/updater");
function getExtensionVersion() {
    const ext = vscode.extensions.getExtension("local.ignite");
    return ext?.packageJSON?.version ?? "?";
}
async function openMiniUI() {
    const config = (0, config_1.getConfiguration)();
    const currentName = config.processName;
    const version = getExtensionVersion();
    const pick = await vscode.window.showQuickPick([
        { label: state_1.GlobalState.isRunning() ? "$(stop) Stop" : "$(play) Start", description: `Process: ${currentName}` },
        { label: "$(pencil) Change process", description: `Current: ${currentName}` },
        { label: "$(gear) Change command", description: `Current: ${config.airCommand}` },
        { label: "$(trash) Reset terminal", description: "Closes the internal Air terminal if created by extension" },
        { label: "$(sync) Reset Config", description: "Clears manual process name and start command" },
        { label: "$(cloud-download) Check for updates", description: `Current: v${version} · Download and install if available` }
    ], { title: `Ignite: Control Panel (v${version})`, placeHolder: "Select an action" });
    if (!pick)
        return;
    if (pick.label.includes("Change process")) {
        const next = await vscode.window.showInputBox({
            title: "Process / Binary Name",
            value: currentName,
            prompt: "e.g. api, worker, payments... (used as PROC_NAME and for process matching)",
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return "Process name cannot be empty";
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
                    return "Process name can only contain alphanumeric characters, underscores, and hyphens";
                }
                return null;
            }
        });
        if (!next)
            return;
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.PROCESS_NAME, next.trim());
        vscode.window.showInformationMessage(`Process changed to: ${next.trim()}`);
        if (!state_1.GlobalState.isRunning()) {
            (0, ui_1.setStatus)(`$(play) Ignite: ${next.trim()}`, config_1.COMMANDS.OPEN, "Click to start or configure");
        }
        return;
    }
    if (pick.label.includes("Change command")) {
        const currentCmd = config.airCommand;
        const next = await vscode.window.showInputBox({
            title: "Start Command (Watcher)",
            value: currentCmd,
            prompt: "e.g. make run, air, go run main.go...",
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return "Command cannot be empty";
                }
                return null;
            }
        });
        if (!next)
            return;
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.AIR_COMMAND, next.trim());
        vscode.window.showInformationMessage(`Command updated to: ${next.trim()}`);
        return;
    }
    if (pick.label.includes("Reset Config")) {
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.PROCESS_NAME, undefined);
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.AIR_COMMAND, undefined);
        await (0, config_1.updateConfiguration)(config_1.CONFIG_KEYS.POLL_MS, undefined);
        const newConfig = (0, config_1.getConfiguration)();
        vscode.window.showInformationMessage(`Configuration reset. Auto-detected process: ${newConfig.processName}`);
        if (!state_1.GlobalState.isRunning()) {
            (0, ui_1.setStatus)(`$(play) Ignite: ${newConfig.processName}`, config_1.COMMANDS.OPEN, "Click to start or configure");
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
    if (pick.label.includes("Check for updates")) {
        await updater_1.Updater.checkForUpdates(true);
        return;
    }
    if (state_1.GlobalState.isRunning()) {
        await (0, session_1.stopAll)();
    }
    else {
        await (0, auto_attach_1.startAutoAttach)();
    }
}
