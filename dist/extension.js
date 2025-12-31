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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const helpers_1 = require("./helpers");
const auto_attach_1 = require("./auto_attach");
const ui_1 = require("./ui");
const config_1 = require("./config");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand(config_1.COMMANDS.START, () => (0, auto_attach_1.startAutoAttach)()), vscode.commands.registerCommand(config_1.COMMANDS.OPEN, () => (0, ui_1.openMiniUI)()), vscode.commands.registerCommand(config_1.COMMANDS.STOP, () => (0, helpers_1.stopAll)()));
    const config = (0, config_1.getConfiguration)();
    const currentName = config.processName;
    (0, helpers_1.setStatus)(`$(play) Ignite: ${currentName}`, config_1.COMMANDS.OPEN, "Click to start or configure");
}
function deactivate() {
    (0, helpers_1.deactivate)();
}
