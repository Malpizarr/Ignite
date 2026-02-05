# Ignite

Ignite is a VS Code and Cursor extension that automates debugger attachment when using hot-reloading tools like **Air**.

It detects your running application process—even after reloads—and attaches the debugger so you don’t have to restart the debug session on every save.

## Features

- **Flexible start modes:** Launch your process and attach, or attach to an already running process.
- **Auto-attach:** Finds your Go process (e.g. `api`, `worker`) and attaches the VS Code debugger.
- **Hot-reload friendly:** Works with Air; when the app restarts (new PID), Ignite re-attaches automatically.
- **Smart detection:** Targets your binary, not the `air` watcher.
- **Low config:** Infers process name from the workspace folder.
- **Built-in updates:** Checks [GitHub Releases](https://github.com/Malpizarr/Ignite/releases) for new versions and can update from the Control Panel (public repo only).

## Installation

### From VSIX

1. Get the `.vsix` from [Releases](https://github.com/Malpizarr/Ignite/releases) or build it locally.
2. Install from the terminal:
   ```bash
   make install
   ```
   Or manually:
   ```bash
   code --install-extension ignite-1.1.1.vsix --force
   ```

No extra setup is needed for update checks; the extension uses the official GitHub repo.

## Usage

Ignite adds a status bar item and commands to control the session.

### Commands

Command palette (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>), then type **Ignite**:

| Command                          | Description                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| **Ignite: Process (Start/Stop)** | Opens the Control Panel.                                     |
| **Ignite: Start Auto-Attach**    | Starts monitoring (Start+Attach or Attach only).             |
| **Ignite: Stop Auto-Attach**     | Stops monitoring.                                            |
| **Ignite: Check for updates**    | Checks for a new version and offers to download and install. |

### Control Panel

Click the status bar item **Ignite: &lt;process-name&gt;** to open the **Control Panel** (title shows current version, e.g. _Ignite: Control Panel (v1.1.0)_):

1. **Start / Stop** — Toggle the auto-attach loop.
2. **Change process** — Override the binary name (e.g. `api`, `worker`).
3. **Change command** — Command that starts the watcher (default: `make run`).
4. **Reset terminal** — Close the internal Air terminal created by the extension.
5. **Reset Config** — Clear manual process name and start command.
6. **Check for updates** — Check for a new version, then download and install from the panel.

When a new version is available, a notification appears with **Update** / **Later**. Choosing **Update** downloads and installs the new `.vsix`, then you can **Reload** the window.

Updates are checked automatically a few seconds after startup and then every 24 hours (can be turned off in settings).

## Configuration

Use the Control Panel for most options, or configure in `.vscode/settings.json`:

```json
{
  "autoAttachUI.startCommand": "make run",
  "autoAttachUI.processName": "my-api-binary",
  "autoAttachUI.pollMs": 500,
  "autoAttachUI.autoUpdate": true
}
```

| Setting        | Default         | Description                                                      |
| -------------- | --------------- | ---------------------------------------------------------------- |
| `processName`  | `(folder name)` | Binary name to attach to (and `PROC_NAME`).                      |
| `startCommand` | `make run`      | Command that starts the watcher (e.g. `air`, `go run main.go`).  |
| `pollMs`       | `500`           | Polling interval (ms) for process detection.                     |
| `startAir`     | `true`          | Whether to start Air in an integrated terminal with `PROC_NAME`. |
| `autoUpdate`   | `true`          | Check for updates on startup and every 24 hours.                 |

## Development

Build and install locally:

```bash
make dev
```

This runs `npm install`, `npm run compile`, `npx vsce package`, and installs the extension into VS Code.

Manual steps:

- **Compile:** `npm run compile`
- **Watch:** `npm run watch`
- **Package:** `npx vsce package`
- **Install:** `make install` (uses `ignite-1.1.1.vsix` by default; adjust `VSIX` in the Makefile if needed)
