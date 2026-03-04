import * as vscode from "vscode";
import { GlobalState } from "./state";
import { restore as restoreGoDebugAdapter } from "./services/goDebugAdapterPatch";

export async function stopAll() {
  GlobalState.setRunning(false);

  const activeSessions = vscode.debug.activeDebugSession
    ? [vscode.debug.activeDebugSession]
    : [];

  for (const session of activeSessions) {
    if (session.name.startsWith("Ignite")) {
      await vscode.debug.stopDebugging(session);
    }
  }

  restoreGoDebugAdapter();

  const airTerminal = GlobalState.getAirTerminal();
  if (airTerminal) {
    airTerminal.dispose();
    GlobalState.setAirTerminal(undefined);
  }

  vscode.window.showInformationMessage("Ignite stopped.");
}

export function deactivate() {
  GlobalState.setRunning(false);
  GlobalState.getAirTerminal()?.dispose();
  GlobalState.getStatusItem()?.dispose();
  GlobalState.disposeAll();
}
