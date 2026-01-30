import * as vscode from "vscode";
import { GlobalState } from "./state";

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
  
  vscode.window.showInformationMessage("Ignite stopped.");
}

export function deactivate() {
  GlobalState.setRunning(false);
  GlobalState.getAirTerminal()?.dispose();
  GlobalState.getStatusItem()?.dispose();
  GlobalState.disposeAll();
}
