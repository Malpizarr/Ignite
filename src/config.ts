import * as vscode from "vscode";
import { GlobalState } from "./state";

export const COMMANDS = {
  START: "autoAttachUI.start",
  OPEN: "autoAttachUI.open",
  STOP: "autoAttachUI.stop",
  CHECK_UPDATE: "autoAttachUI.checkUpdate",
};

export const CONFIG_SECTION = "autoAttachUI";

export const CONFIG_KEYS = {
  PROCESS_NAME: "processName",
  POLL_MS: "pollMs",
  START_AIR: "startAir",
  AIR_COMMAND: "startCommand",
};

export const DEFAULTS = {
  PROCESS_NAME: "ignite",
};

export const UPDATES_GITHUB_REPO = "Malpizarr/Ignite";

export function getConfiguration() {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const state = GlobalState.getContext()?.workspaceState;

  const manualName = state?.get<string>(CONFIG_KEYS.PROCESS_NAME);

  const inspect = cfg.inspect<string>(CONFIG_KEYS.PROCESS_NAME);
  const workspaceSetting = inspect?.workspaceValue;
  const globalSetting = inspect?.globalValue;

  let folderName = DEFAULTS.PROCESS_NAME;
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    folderName = vscode.workspace.workspaceFolders[0].name;
  }

  const processName = manualName ?? workspaceSetting ?? folderName ?? globalSetting;

  const airCommand = state?.get<string>(CONFIG_KEYS.AIR_COMMAND) ?? cfg.get<string>(CONFIG_KEYS.AIR_COMMAND)!;

  const pollMs = state?.get<number>(CONFIG_KEYS.POLL_MS) ?? cfg.get<number>(CONFIG_KEYS.POLL_MS)!;

  return {
    processName,
    pollMs,
    startAir: cfg.get<boolean>(CONFIG_KEYS.START_AIR)!,
    airCommand,
  };
}

export async function updateConfiguration(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace) {
  if (
    key === CONFIG_KEYS.PROCESS_NAME ||
    key === CONFIG_KEYS.AIR_COMMAND ||
    key === CONFIG_KEYS.POLL_MS
  ) {
    const state = GlobalState.getContext()?.workspaceState;
    if (state) {
      await state.update(key, value);
      return;
    }
  }

  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await cfg.update(key, value, target);
}
