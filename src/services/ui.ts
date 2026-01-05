import * as vscode from "vscode";
import { GlobalState } from "../state";
import { COMMANDS } from "../config";

export function setStatus(text: string, command: string = COMMANDS.OPEN, tooltip: string = "Ignite") {
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
