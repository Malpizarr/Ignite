import * as vscode from "vscode";
import { setStatus } from "./services/ui";
import { stopAll } from "./session";
import { startAutoAttach } from "./auto_attach";
import { GlobalState } from "./state";
import { getConfiguration, updateConfiguration, COMMANDS, CONFIG_KEYS } from "./config";
import { Updater } from "./services/updater";

function getExtensionVersion(): string {
  const ext = vscode.extensions.getExtension("local.ignite");
  return ext?.packageJSON?.version ?? "?";
}

async function openMiniUI() {
  const config = getConfiguration();
  const currentName = config.processName;
  const version = getExtensionVersion();

  const pick = await vscode.window.showQuickPick(
    [
      { label: GlobalState.isRunning() ? "$(stop) Stop" : "$(play) Start", description: `Process: ${currentName}` },
      { label: "$(pencil) Change process", description: `Current: ${currentName}` },
      { label: "$(gear) Change command", description: `Current: ${config.airCommand}` },
      { label: "$(trash) Reset terminal", description: "Closes the internal Air terminal if created by extension" },
      { label: "$(sync) Reset Config", description: "Clears manual process name and start command" },
      { label: "$(cloud-download) Check for updates", description: `Current: v${version} · Download and install if available` }
    ],
    { title: `Ignite: Control Panel (v${version})`, placeHolder: "Select an action" }
  );

  if (!pick) return;

  if (pick.label.includes("Change process")) {
    const next = await vscode.window.showInputBox({
      title: "Process / Binary Name",
      value: currentName,
      prompt: "e.g. api, worker, payments... (used as PROC_NAME and for process matching)",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Process name cannot be empty";
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
          return "Process name can only contain alphanumeric characters, underscores, and hyphens";
        }
        return null;
      }
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
      prompt: "e.g. make run, air, go run main.go...",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Command cannot be empty";
        }
        return null;
      }
    });
    if (!next) return;

    await updateConfiguration(CONFIG_KEYS.AIR_COMMAND, next.trim());
    vscode.window.showInformationMessage(`Command updated to: ${next.trim()}`);
    return;
  }

  if (pick.label.includes("Reset Config")) {
    await updateConfiguration(CONFIG_KEYS.PROCESS_NAME, undefined);
    await updateConfiguration(CONFIG_KEYS.AIR_COMMAND, undefined);
    await updateConfiguration(CONFIG_KEYS.POLL_MS, undefined);

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

  if (pick.label.includes("Check for updates")) {
    await Updater.checkForUpdates(true);
    return;
  }

  if (GlobalState.isRunning()) {
    await stopAll();
  } else {
    await startAutoAttach();
  }
}

export { openMiniUI };
