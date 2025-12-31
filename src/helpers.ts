import { execFile } from "child_process";
import * as vscode from "vscode";
import { GlobalState } from "./state";
import { COMMANDS } from "./config";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function setStatus(text: string, command: string = COMMANDS.OPEN, tooltip: string = "Ignite") {
  let item = GlobalState.getStatusItem();
  if (!item) {
    item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    GlobalState.setStatusItem(item);
  }
  item.text = text;
  item.command = command;
  item.tooltip = tooltip;
  item.show();
}

async function isProcessRunning(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("ps", ["-p", pid.toString(), "-o", "state="], (err, stdout) => {
      if (err) {
        resolve(false);
        return;
      }
      const state = stdout.trim();
      resolve(!state.startsWith("Z"));
    });
  });
}

async function getProcessCommand(pid: number): Promise<string> {
  return new Promise((resolve) => {
    execFile("ps", ["-p", pid.toString(), "-o", "command="], (err, stdout) => {
      resolve(err ? "" : stdout.trim());
    });
  });
}

function escapeForPgrepEre(lit: string): string {
  return lit.replace(/[.[\]{}()+*?^$|\\]/g, "\\$&");
}

async function pgrepNewestPid(pattern: string): Promise<number | null> {
  return new Promise((resolve) => {
    execFile("pgrep", ["-n", "-f", pattern], (err, stdout) => {
      if (err) return resolve(null);
      const s = (stdout || "").trim();
      const pid = Number.parseInt(s, 10);
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });
}

async function waitForPid(pattern: string, pollMs: number): Promise<number | null> {
  while (GlobalState.isRunning()) {
    const pid = await pgrepNewestPid(pattern);
    if (pid) return pid;
    await sleep(pollMs);
  }
  return null;
}

function ensureAirStarted(procName: string, airCommand: string) {
  if (GlobalState.getAirTerminal()) return;

  const t = vscode.window.createTerminal({
    name: `air (${procName})`,
    env: {
      ...process.env,
      PROC_NAME: procName
    }
  });

  GlobalState.setAirTerminal(t);
  t.show(true);
  t.sendText(airCommand, true);
}

async function stopAll() {
  GlobalState.setRunning(false);
  vscode.window.showInformationMessage("Ignite stopped.");
}

function deactivate() {
  GlobalState.setRunning(false);
  GlobalState.getAirTerminal()?.dispose();
  GlobalState.getStatusItem()?.dispose();
}

export { sleep, setStatus, isProcessRunning, getProcessCommand, escapeForPgrepEre, pgrepNewestPid, waitForPid, ensureAirStarted, stopAll, deactivate };
