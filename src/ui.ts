import * as vscode from "vscode";
import { setStatus, stopAll } from "./helpers";
import { startAutoAttach } from "./auto_attach";
import { GlobalState } from "./state";
import { getConfiguration, updateConfiguration, COMMANDS, CONFIG_KEYS } from "./config";

async function openMiniUI() {
  const config = getConfiguration();
  const currentName = config.processName;

  const pick = await vscode.window.showQuickPick(
    [
      { label: GlobalState.isRunning() ? "$(stop) Stop" : "$(play) Start", description: `Process: ${currentName}` },
      { label: "$(pencil) Change process", description: `Current: ${currentName}` },
      { label: "$(gear) Change command", description: `Current: ${config.airCommand}` },
      { label: "$(settings) Advanced Settings", description: "Poll Interval & Attach Delay" },
      { label: "$(trash) Reset terminal", description: "Closes the internal Air terminal if created by extension" },
      { label: "$(sync) Reset Config", description: "Clears manual process name and start command" }
    ],
    { title: "Ignite: Control Panel", placeHolder: "Select an action" }
  );

  if (!pick) return;

  if (pick.label.includes("Change process")) {
    const next = await vscode.window.showInputBox({
      title: "Process / Binary Name",
      value: currentName,
      prompt: "e.g. api, worker, payments... (used as PROC_NAME and for process matching)"
    });
    if (!next) return;

    await updateConfiguration(CONFIG_KEYS.PROCESS_NAME, next.trim());
    vscode.window.showInformationMessage(`Process changed to: ${next.trim()}`);
    if (!GlobalState.isRunning()) {
      setStatus(`$(play) Ignite: ${next.trim()}`, COMMANDS.OPEN, "Click to start or configure");
    }
    return;
  }

  if (pick.label.includes("Change command")) {
    const currentCmd = config.airCommand;
    const next = await vscode.window.showInputBox({
      title: "Start Command (Watcher)",
      value: currentCmd,
      prompt: "e.g. make run, air, go run main.go..."
    });
    if (!next) return;

    await updateConfiguration(CONFIG_KEYS.AIR_COMMAND, next.trim());
    vscode.window.showInformationMessage(`Command updated to: ${next.trim()}`);
    return;
  }

  if (pick.label.includes("Advanced Settings")) {
    const action = await vscode.window.showQuickPick(
      [
        { label: "Poll Interval", description: `Current: ${config.pollMs}ms` },
        { label: "Attach Delay", description: `Current: ${config.attachDelay}ms` }
      ],
      { title: "Ignite: Advanced Settings" }
    );

    if (!action) return;

    if (action.label === "Poll Interval") {
      const val = await vscode.window.showInputBox({
        title: "Poll Interval (ms)",
        value: config.pollMs.toString(),
        prompt: "How often to check for the process."
      });
      if (val) {
        const ms = parseInt(val, 10);
        if (!isNaN(ms) && ms > 0) {
           await updateConfiguration(CONFIG_KEYS.POLL_MS, ms);
           vscode.window.showInformationMessage(`Poll Interval updated to ${ms}ms`);
        }
      }
    }

    if (action.label === "Attach Delay") {
      const val = await vscode.window.showInputBox({
        title: "Attach Delay (ms)",
        value: config.attachDelay.toString(),
        prompt: "Delay after detection before attaching."
      });
      if (val) {
        const ms = parseInt(val, 10);
        if (!isNaN(ms) && ms >= 0) {
           await updateConfiguration(CONFIG_KEYS.ATTACH_DELAY, ms);
           vscode.window.showInformationMessage(`Attach Delay updated to ${ms}ms`);
        }
      }
    }
    return;
  }

  if (pick.label.includes("Reset Config")) {
    await updateConfiguration(CONFIG_KEYS.PROCESS_NAME, undefined);
    await updateConfiguration(CONFIG_KEYS.AIR_COMMAND, undefined);
    await updateConfiguration(CONFIG_KEYS.POLL_MS, undefined);
    await updateConfiguration(CONFIG_KEYS.ATTACH_DELAY, undefined);

    const newConfig = getConfiguration();
    vscode.window.showInformationMessage(`Configuration reset. Auto-detected process: ${newConfig.processName}`);
    if (!GlobalState.isRunning()) {
      setStatus(`$(play) Ignite: ${newConfig.processName}`, COMMANDS.OPEN, "Click to start or configure");
    }
    return;
  }

  if (pick.label.includes("Reset terminal")) {
    const term = GlobalState.getAirTerminal();
    if (term) {
      term.dispose();
      GlobalState.setAirTerminal(undefined);
      vscode.window.showInformationMessage("Air terminal reset.");
    } else {
      vscode.window.showInformationMessage("No Air terminal found to reset.");
    }
    return;
  }

  if (GlobalState.isRunning()) {
    await stopAll();
  } else {
    await startAutoAttach();
  }
}

export { openMiniUI };
