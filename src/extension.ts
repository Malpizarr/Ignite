import * as vscode from "vscode";
import { setStatus, stopAll, deactivate as deactivateHelper } from "./helpers";
import { startAutoAttach } from "./auto_attach";
import { openMiniUI } from "./ui";
import { getConfiguration, COMMANDS } from "./config";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.START, () => startAutoAttach()),
    vscode.commands.registerCommand(COMMANDS.OPEN, () => openMiniUI()),
    vscode.commands.registerCommand(COMMANDS.STOP, () => stopAll())
  );

  const config = getConfiguration();
  const currentName = config.processName;
  setStatus(`$(play) Ignite: ${currentName}`, COMMANDS.OPEN, "Click to start or configure");
}

export function deactivate() {
  deactivateHelper();
}
