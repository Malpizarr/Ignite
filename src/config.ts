import * as vscode from "vscode";

export const COMMANDS = {
  START: "autoAttachUI.start",
  OPEN: "autoAttachUI.open",
  STOP: "autoAttachUI.stop",
};

export const CONFIG_SECTION = "autoAttachUI";

export const CONFIG_KEYS = {
  PROCESS_NAME: "processName",
  POLL_MS: "pollMs",
  START_AIR: "startAir",
  AIR_COMMAND: "airCommand",
  ATTACH_DELAY: "attachDelay",
};

export const DEFAULTS = {
  PROCESS_NAME: "ignite",
  POLL_MS: 300,
  START_AIR: true,
  AIR_COMMAND: "make run",
  ATTACH_DELAY: 5000,
};

export function getConfiguration() {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    processName: cfg.get<string>(CONFIG_KEYS.PROCESS_NAME, DEFAULTS.PROCESS_NAME),
    pollMs: cfg.get<number>(CONFIG_KEYS.POLL_MS, DEFAULTS.POLL_MS),
    startAir: cfg.get<boolean>(CONFIG_KEYS.START_AIR, DEFAULTS.START_AIR),
    airCommand: cfg.get<string>(CONFIG_KEYS.AIR_COMMAND, DEFAULTS.AIR_COMMAND),
    attachDelay: cfg.get<number>(CONFIG_KEYS.ATTACH_DELAY, DEFAULTS.ATTACH_DELAY),
  };
}

export async function updateConfiguration(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace) {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await cfg.update(key, value, target);
}
