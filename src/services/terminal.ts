import * as vscode from "vscode";
import { GlobalState } from "../state";

function isTerminalActive(terminal: vscode.Terminal): boolean {
  return vscode.window.terminals.includes(terminal);
}

function findExistingAirTerminal(procName: string): vscode.Terminal | undefined {
  const terminalName = `air (${procName})`;
  return vscode.window.terminals.find(t => t.name === terminalName);
}

function setupTerminalTracking(terminal: vscode.Terminal) {
  const terminalDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
    if (closedTerminal === terminal) {
      GlobalState.setAirTerminal(undefined);
      GlobalState.removeDisposable(terminalDisposable);
      terminalDisposable.dispose();
    }
  });

  GlobalState.addDisposable(terminalDisposable);
}

export function ensureAirStarted(procName: string, airCommand: string) {
  const storedTerminal = GlobalState.getAirTerminal();

  if (storedTerminal) {
    if (isTerminalActive(storedTerminal)) {
      storedTerminal.show(true);
      storedTerminal.sendText(airCommand, true);
      return;
    }
    GlobalState.setAirTerminal(undefined);
  }

  const existingTerminal = findExistingAirTerminal(procName);
  if (existingTerminal) {
    setupTerminalTracking(existingTerminal);
    GlobalState.setAirTerminal(existingTerminal);
    existingTerminal.show(true);
    existingTerminal.sendText(airCommand, true);
    return;
  }

  const t = vscode.window.createTerminal({
    name: `air (${procName})`,
    env: {
      ...process.env,
      PROC_NAME: procName
    }
  });

  setupTerminalTracking(t);
  GlobalState.setAirTerminal(t);
  t.show(true);
  t.sendText(airCommand, true);
}
