import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel("Ignite");
  }
  return channel;
}

export function log(message: string): void {
  getChannel().appendLine(message);
}

export function showLogs(preserveFocus: boolean = true): void {
  getChannel().show(preserveFocus);
}
