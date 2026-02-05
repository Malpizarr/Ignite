import * as vscode from "vscode";
import { setStatus } from "./services/ui";
import { stopAll, deactivate as deactivateHelper } from "./session";
import { startAutoAttach } from "./auto_attach";
import { openMiniUI } from "./ui";
import { getConfiguration, COMMANDS } from "./config";
import { GlobalState } from "./state";
import { Updater } from "./services/updater";

export function activate(context: vscode.ExtensionContext) {
  GlobalState.setContext(context);
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.START, () => startAutoAttach()),
    vscode.commands.registerCommand(COMMANDS.OPEN, () => openMiniUI()),
    vscode.commands.registerCommand(COMMANDS.STOP, () => stopAll()),
    vscode.commands.registerCommand(COMMANDS.CHECK_UPDATE, () => Updater.checkForUpdates(true))
  );

  const config = getConfiguration();
  const currentName = config.processName;
  setStatus(`$(play) Ignite: ${currentName}`, COMMANDS.OPEN, "Click to start or configure");

  const updateConfig = vscode.workspace.getConfiguration("autoAttachUI");
  if (updateConfig.get<boolean>("autoUpdate", true)) {
    Updater.startAutoCheck();
    context.subscriptions.push({
      dispose: () => Updater.stopAutoCheck(),
    });
  }
}

export function deactivate() {
  deactivateHelper();
}
