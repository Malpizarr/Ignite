import * as vscode from "vscode";

let running = false;
let statusItem: vscode.StatusBarItem | undefined;
let airTerminal: vscode.Terminal | undefined;

export const GlobalState = {
  isRunning: () => running,
  setRunning: (v: boolean) => { running = v; },

  getStatusItem: () => statusItem,
  setStatusItem: (v: vscode.StatusBarItem | undefined) => { statusItem = v; },

  getAirTerminal: () => airTerminal,
  setAirTerminal: (v: vscode.Terminal | undefined) => { airTerminal = v; }
};
