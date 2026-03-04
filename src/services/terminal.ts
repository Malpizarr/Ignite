import * as vscode from "vscode";
import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { GlobalState } from "../state";

const execFileAsync = promisify(execFile);
const SHELL_BUILTINS = new Set(["cd", "alias", "export", "unset", "set", "eval", "exec", "source", "."]);

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

function extractExecutable(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) continue;
    return token;
  }
  return null;
}

async function executableExists(execName: string): Promise<boolean> {
  if (!execName) return false;
  if (SHELL_BUILTINS.has(execName)) return true;
  if (execName.includes("/")) {
    return fs.existsSync(execName);
  }
  try {
    await execFileAsync("which", [execName], { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function validateAirCommand(airCommand: string): Promise<boolean> {
  const executable = extractExecutable(airCommand);
  if (!executable) {
    vscode.window.showErrorMessage("Ignite start command is empty.");
    return false;
  }

  const exists = await executableExists(executable);
  if (exists) return true;

  vscode.window.showErrorMessage(
    `Ignite could not find executable: ${executable}. Update autoAttachUI.startCommand or your PATH.`
  );
  return false;
}

function disposeTerminal(terminal: vscode.Terminal | undefined): void {
  if (!terminal) return;
  if (!isTerminalActive(terminal)) return;
  terminal.dispose();
}

export async function ensureAirStarted(procName: string, airCommand: string): Promise<boolean> {
  const valid = await validateAirCommand(airCommand);
  if (!valid) {
    return false;
  }

  const storedTerminal = GlobalState.getAirTerminal();

  if (storedTerminal) {
    disposeTerminal(storedTerminal);
    GlobalState.setAirTerminal(undefined);
  }

  const existingTerminal = findExistingAirTerminal(procName);
  if (existingTerminal) {
    disposeTerminal(existingTerminal);
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
  return true;
}

export async function focusAirTerminal(): Promise<void> {
  const storedTerminal = GlobalState.getAirTerminal();
  if (storedTerminal && isTerminalActive(storedTerminal)) {
    storedTerminal.show(false);
    return;
  }

  const activeTerminal = vscode.window.activeTerminal;
  if (activeTerminal) {
    activeTerminal.show(false);
    return;
  }

  if (vscode.window.terminals.length > 0) {
    vscode.window.terminals[0].show(false);
    return;
  }

  await vscode.commands.executeCommand("workbench.action.terminal.focus");
}
