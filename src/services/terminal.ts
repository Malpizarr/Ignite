import * as vscode from "vscode";
import { GlobalState } from "../state";

export function ensureAirStarted(procName: string, airCommand: string) {
  if (GlobalState.getAirTerminal()) return;

  const t = vscode.window.createTerminal({
    name: `air (${procName})`,
    env: {
      ...process.env,
      PROC_NAME: procName
    }
  });

  const terminalDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
    if (closedTerminal === t) {
      GlobalState.setAirTerminal(undefined);
      GlobalState.removeDisposable(terminalDisposable);
      terminalDisposable.dispose();
    }
  });

  GlobalState.addDisposable(terminalDisposable);
  GlobalState.setAirTerminal(t);
  t.show(true);
  t.sendText(airCommand, true);
}
