import * as vscode from "vscode";
import { GlobalState } from "./state";

export async function stopAll() {
  GlobalState.setRunning(false);
  vscode.window.showInformationMessage("Ignite stopped.");
}

export function deactivate() {
  GlobalState.setRunning(false);
  GlobalState.getAirTerminal()?.dispose();
  GlobalState.getStatusItem()?.dispose();
  GlobalState.disposeAll();
}
