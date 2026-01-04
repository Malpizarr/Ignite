import * as vscode from "vscode";
import { ensureAirStarted, escapeForPgrepEre, setStatus, sleep, isProcessRunning, waitForPid, getProcessCommand } from "./helpers";
import { GlobalState } from "./state";
import { getConfiguration, COMMANDS } from "./config";

async function startAutoAttach() {
  if (GlobalState.isRunning()) {
    vscode.window.showInformationMessage("Already running.");
    return;
  }

  const config = getConfiguration();
  const procName = config.processName;
  const pollMs = config.pollMs;
  const startAir = config.startAir;
  const airCommand = config.airCommand;

  const nameEre = escapeForPgrepEre(procName);
  const pattern = `tmp/${nameEre}($|\\s)|(^|[^a-zA-Z0-9_])${nameEre}($|[^a-zA-Z0-9_])`;

  if (startAir) ensureAirStarted(procName, airCommand);

  GlobalState.setRunning(true);
  setStatus(`$(debug-disconnect) Ignite: waiting for "${procName}"...`, COMMANDS.OPEN, "Waiting for process... Click for options");

  const endedSessions = new Set<string>();
  const termDisp = vscode.debug.onDidTerminateDebugSession((s) => endedSessions.add(s.id));
  let lastPid = 0;

  try {
    while (GlobalState.isRunning()) {
      const pid = await waitForPid(pattern, pollMs);
      if (!GlobalState.isRunning() || !pid) break;

      if (pid === lastPid) {
        await sleep(pollMs);
        continue;
      }

      const cmd = await getProcessCommand(pid);
      if (/(^|\/|\\)\.?air(\.exe)?($|\s)/.test(cmd) || /(^|\/|\\)go(\.exe)?\s+build/.test(cmd)) {
        await sleep(pollMs);
        continue;
      }



      if (!GlobalState.isRunning()) continue;

      await sleep(config.attachDelay);
      if (!(await isProcessRunning(pid))) {
         continue;
      }

      endedSessions.clear();
      setStatus(`$(debug-start) Ignite: attach PID ${pid} (${procName})…`, COMMANDS.OPEN);

      const wsFolder = vscode.workspace.workspaceFolders?.[0];

      const ok = await vscode.debug.startDebugging(wsFolder, {
        name: `Ignite ${procName} (PID ${pid})`,
        type: "go",
        request: "attach",
        mode: "local",
        processId: pid,
        program: wsFolder?.uri.fsPath ?? "${workspaceFolder}",
        showLog: true
      } as vscode.DebugConfiguration);

      if (!ok) {
        setStatus(`$(error) Ignite: failed to attach (PID ${pid}).`, COMMANDS.OPEN);
        await sleep(500);
        continue;
      }

      lastPid = pid;
      setStatus(`$(debug-alt) Ignite: attached (${procName}).`, COMMANDS.OPEN, "Attached. Click for options");

      while (GlobalState.isRunning() && endedSessions.size === 0) {
        await sleep(200);
      }

      if (!GlobalState.isRunning()) break;
      setStatus(`$(debug-disconnect) Ignite: reload detected, retrying...`, COMMANDS.OPEN);
      await sleep(300);
    }
  } finally {
    termDisp.dispose();
    GlobalState.setRunning(false);
    const finalConfig = getConfiguration();
    setStatus(`$(play) Ignite: ${finalConfig.processName}`, COMMANDS.OPEN, "Click to start or configure");
    await sleep(600);
  }
}

export { startAutoAttach };
