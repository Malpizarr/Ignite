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
    AIR_COMMAND: "airCommand",
    ATTACH_DELAY: "attachDelay",
};
exports.DEFAULTS = {
    PROCESS_NAME: "ignite",
    POLL_MS: 300,
    START_AIR: true,
    AIR_COMMAND: "make run",
    ATTACH_DELAY: 5000,
};
function getConfiguration() {
    const cfg = vscode.workspace.getConfiguration(exports.CONFIG_SECTION);
    return {
        processName: cfg.get(exports.CONFIG_KEYS.PROCESS_NAME, exports.DEFAULTS.PROCESS_NAME),
        pollMs: cfg.get(exports.CONFIG_KEYS.POLL_MS, exports.DEFAULTS.POLL_MS),
        startAir: cfg.get(exports.CONFIG_KEYS.START_AIR, exports.DEFAULTS.START_AIR),
        airCommand: cfg.get(exports.CONFIG_KEYS.AIR_COMMAND, exports.DEFAULTS.AIR_COMMAND),
        attachDelay: cfg.get(exports.CONFIG_KEYS.ATTACH_DELAY, exports.DEFAULTS.ATTACH_DELAY),
    };
}
async function updateConfiguration(key, value, target = vscode.ConfigurationTarget.Workspace) {
    const cfg = vscode.workspace.getConfiguration(exports.CONFIG_SECTION);
    await cfg.update(key, value, target);
}
