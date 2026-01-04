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
exports.DEFAULTS = exports.CONFIG_KEYS = exports.CONFIG_SECTION = exports.COMMANDS = void 0;
exports.getConfiguration = getConfiguration;
exports.updateConfiguration = updateConfiguration;
const vscode = __importStar(require("vscode"));
const state_1 = require("./state");
exports.COMMANDS = {
    START: "autoAttachUI.start",
    OPEN: "autoAttachUI.open",
    STOP: "autoAttachUI.stop",
};
exports.CONFIG_SECTION = "autoAttachUI";
exports.CONFIG_KEYS = {
    PROCESS_NAME: "processName",
    POLL_MS: "pollMs",
    START_AIR: "startAir",
    AIR_COMMAND: "startCommand",
    ATTACH_DELAY: "attachDelay",
};
exports.DEFAULTS = {
    PROCESS_NAME: "ignite",
};
function getConfiguration() {
    const cfg = vscode.workspace.getConfiguration(exports.CONFIG_SECTION);
    const state = state_1.GlobalState.getContext()?.workspaceState;
    const manualName = state?.get(exports.CONFIG_KEYS.PROCESS_NAME);
    const inspect = cfg.inspect(exports.CONFIG_KEYS.PROCESS_NAME);
    const workspaceSetting = inspect?.workspaceValue;
    const globalSetting = inspect?.globalValue;
    let folderName = exports.DEFAULTS.PROCESS_NAME;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        folderName = vscode.workspace.workspaceFolders[0].name;
    }
    const processName = manualName ?? workspaceSetting ?? folderName ?? globalSetting;
    const airCommand = state?.get(exports.CONFIG_KEYS.AIR_COMMAND) ?? cfg.get(exports.CONFIG_KEYS.AIR_COMMAND);
    const pollMs = state?.get(exports.CONFIG_KEYS.POLL_MS) ?? cfg.get(exports.CONFIG_KEYS.POLL_MS);
    const attachDelay = state?.get(exports.CONFIG_KEYS.ATTACH_DELAY) ?? cfg.get(exports.CONFIG_KEYS.ATTACH_DELAY);
    return {
        // processName: cfg.get<string>(CONFIG_KEYS.PROCESS_NAME, DEFAULTS.PROCESS_NAME),
        processName,
        pollMs,
        startAir: cfg.get(exports.CONFIG_KEYS.START_AIR),
        airCommand,
        attachDelay,
    };
}
async function updateConfiguration(key, value, target = vscode.ConfigurationTarget.Workspace) {
    if (key === exports.CONFIG_KEYS.PROCESS_NAME ||
        key === exports.CONFIG_KEYS.AIR_COMMAND ||
        key === exports.CONFIG_KEYS.POLL_MS ||
        key === exports.CONFIG_KEYS.ATTACH_DELAY) {
        const state = state_1.GlobalState.getContext()?.workspaceState;
        if (state) {
            await state.update(key, value);
            return;
        }
    }
    const cfg = vscode.workspace.getConfiguration(exports.CONFIG_SECTION);
    await cfg.update(key, value, target);
}
