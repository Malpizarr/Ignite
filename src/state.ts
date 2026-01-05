import * as vscode from "vscode";

let running = false;
let statusItem: vscode.StatusBarItem | undefined;
let airTerminal: vscode.Terminal | undefined;
let extContext: vscode.ExtensionContext | undefined;
let disposables: vscode.Disposable[] = [];

export const GlobalState = {
  isRunning: () => running,
  setRunning: (v: boolean) => { running = v; },

  getStatusItem: () => statusItem,
  setStatusItem: (v: vscode.StatusBarItem | undefined) => { statusItem = v; },

  getAirTerminal: () => airTerminal,
  setAirTerminal: (v: vscode.Terminal | undefined) => { airTerminal = v; },

  getContext: () => extContext,
  setContext: (v: vscode.ExtensionContext) => { extContext = v; },

  addDisposable: (d: vscode.Disposable) => { disposables.push(d); },
  removeDisposable: (d: vscode.Disposable) => {
    const idx = disposables.indexOf(d);
    if (idx >= 0) disposables.splice(idx, 1);
  },
  disposeAll: () => {
    for (const d of disposables) {
      d.dispose();
    }
    disposables = [];
  }
};
