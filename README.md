# Ignite

Ignite is a VS Code and Cursor extension designed to automate the debugger attachment process when using hot-reloading tools like `Air`.

It intelligently detects your running application process—even after reloads—and attaches the debugger instantly, saving you from manually restarting the debug session every time you save a file.

## Features

- **Auto-Attach Debugger:**
  Automatically finds your Go process (e.g., `api`, `worker`) and attaches the VS Code debugger to it.
- **Hot-Reload Support:**
  Works seamlessly with `Air`. When your app rebuilds and restarts (PID change), Ignite detects the new process and re-attaches instantly.
- **Smart Detection:**
  Distinguishes between the build watcher (`air`) and your actual binary, ensuring it only attaches to the running application.
- **Zero Configuration (mostly):**
  Automatically infers the process name from your workspace folder.

## Installation

### From VSIX (Local)

1. Build the extension locally or download the `.vsix` file.
2. Run the following command in your terminal:
   ```bash
   make install
   ```
   Or manually install it via VS Code:
   ```bash
   code --install-extension ignite-0.0.3.vsix
   ```

## Usage

Ignite adds a status bar item and a set of commands to control the debugging session.

### Commands

Open the command palette (<kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>) and type `Ignite`:

- **Ignite: Process (Start/Stop):** Opens the Control Panel to manage the session.
- **Ignite: Start Auto-Attach:** Manually starts the monitoring loop.
- **Ignite: Stop Auto-Attach:** Stops monitoring.

### Control Panel

Clicking on the status bar item `$(play) Ignite: <process-name>` opens the **Control Panel**, where you can:

1. **Start/Stop:** Toggle the auto-attach loop.
2. **Change Process:** Manually override the binary name to look for (e.g., change from `ignite` to `payments-service`).
3. **Change Command:** Update the command used to start your watcher (default: `make run`).
4. **Advanced Settings:** Configure `Poll Interval` and `Attach Delay`.
5. **Reset Config:** Clear manual overrides and return to auto-detection (Folder Name).

## Configuration

You can configure per-workspace using `.vscode/settings.json`, although the UI Control Panel is the recommended way (it saves to Workspace State without dirtying your settings files).

### Settings

If you prefer `settings.json`:

```json
{
  "autoAttachUI.startCommand": "make run",
  "autoAttachUI.processName": "my-api-binary",
  "autoAttachUI.pollMs": 300,
  "autoAttachUI.attachDelay": 200
}
```

| Setting        | Default         | Description                                                             |
| :------------- | :-------------- | :---------------------------------------------------------------------- |
| `startCommand` | `make run`      | The command to start your project (e.g. `air`, `go run main.go`).       |
| `processName`  | `(Folder Name)` | The name of the binary to attach to.                                    |
| `pollMs`       | `500`           | How often (in ms) to check for the process.                             |
| `attachDelay`  | `2000`          | Delay (in ms) after detecting the process before attaching debug probe. |

## Development

If you want to build and install Ignite locally:

### 1. Build and Install

Use the included `Makefile` to handle the full lifecycle:

```bash
make
```

This will:

1. Install dependencies (`npm install`)
2. Compile TypeScript (`npm run compile`)
3. Package the extension (`vsce package`)
4. Install it into your VS Code (`code --install-extension ...`)

### 2. Manual Steps

- **Compile:** `npm run compile`
- **Watch Mode:** `npm run watch`
- **Package:** `npx vsce package`
