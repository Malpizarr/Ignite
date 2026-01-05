"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProcessRunning = isProcessRunning;
exports.getProcessCommand = getProcessCommand;
exports.pgrepNewestPid = pgrepNewestPid;
exports.waitForPid = waitForPid;
const child_process_1 = require("child_process");
const state_1 = require("../state");
const common_1 = require("../utils/common");
const DEFAULT_TIMEOUT_MS = 2000;
async function isProcessRunning(pid, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve(false);
        }, timeoutMs);
        (0, child_process_1.execFile)("ps", ["-p", pid.toString(), "-o", "state="], (err, stdout) => {
            clearTimeout(timer);
            if (err) {
                resolve(false);
                return;
            }
            const state = stdout.trim();
            resolve(!state.startsWith("Z"));
        });
    });
}
async function getProcessCommand(pid, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve("");
        }, timeoutMs);
        (0, child_process_1.execFile)("ps", ["-p", pid.toString(), "-o", "command="], (err, stdout) => {
            clearTimeout(timer);
            resolve(err ? "" : stdout.trim());
        });
    });
}
async function pgrepNewestPid(pattern, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve(null);
        }, timeoutMs);
        (0, child_process_1.execFile)("pgrep", ["-n", "-f", pattern], (err, stdout) => {
            clearTimeout(timer);
            if (err)
                return resolve(null);
            const s = (stdout || "").trim();
            const pid = Number.parseInt(s, 10);
            resolve(Number.isFinite(pid) ? pid : null);
        });
    });
}
async function waitForPid(pattern, pollMs) {
    while (state_1.GlobalState.isRunning()) {
        const pid = await pgrepNewestPid(pattern);
        if (pid)
            return pid;
        await (0, common_1.sleep)(pollMs);
    }
    return null;
}
