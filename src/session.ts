import * as vscode from "vscode";
import { GlobalState } from "./state";
import { restore as restoreGoDebugAdapter } from "./services/goDebugAdapterPatch";
import { sleep } from "./utils/common";
import { getConfiguration } from "./config";
import { buildProcessPattern } from "./utils/regex";
import { terminateTargetProcesses } from "./services/process";

export async function stopAll() {
  GlobalState.setRunning(false);

  const trackedSessions = GlobalState.getDebugSessions();
  const activeSession = vscode.debug.activeDebugSession;
  const sessionsToStop = [...trackedSessions];
  if (activeSession?.name.startsWith("Ignite") && !sessionsToStop.some((s) => s.id === activeSession.id)) {
    sessionsToStop.push(activeSession);
  }

  await Promise.allSettled(
    sessionsToStop.map((session) => vscode.debug.stopDebugging(session))
  );

  const waitUntil = Date.now() + 2500;
  while (Date.now() < waitUntil) {
    const stillRunning = GlobalState.getDebugSessions().length > 0;
    if (!stillRunning) break;
    await sleep(100);
  }
  GlobalState.clearDebugSessions();

  restoreGoDebugAdapter();

  const airTerminal = GlobalState.getAirTerminal();
  if (airTerminal) {
    airTerminal.dispose();
    GlobalState.setAirTerminal(undefined);
  }

  const config = getConfiguration();
  const pattern = buildProcessPattern(config.processName);
  await terminateTargetProcesses(pattern, config.processName);

  vscode.window.showInformationMessage("Ignite stopped.");
}

export function deactivate() {
  GlobalState.setRunning(false);
  GlobalState.getAirTerminal()?.dispose();
  GlobalState.getStatusItem()?.dispose();
  GlobalState.disposeAll();
}
