"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProcessRunning = isProcessRunning;
exports.getProcessCommand = getProcessCommand;
exports.pgrepNewestPid = pgrepNewestPid;
exports.pgrepAllPids = pgrepAllPids;
exports.waitForPid = waitForPid;
exports.isAirOrBuildProcess = isAirOrBuildProcess;
exports.matchesTargetProcess = matchesTargetProcess;
exports.waitForStableProcess = waitForStableProcess;
exports.findTargetProcessPids = findTargetProcessPids;
exports.terminateTargetProcesses = terminateTargetProcesses;
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
async function pgrepAllPids(pattern, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve([]);
        }, timeoutMs);
        (0, child_process_1.execFile)("pgrep", ["-f", pattern], (err, stdout) => {
            clearTimeout(timer);
            if (err)
                return resolve([]);
            const pids = (stdout || "")
                .split(/\s+/)
                .map((s) => Number.parseInt(s.trim(), 10))
                .filter((n) => Number.isFinite(n) && n > 0);
            resolve(Array.from(new Set(pids)));
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
async function isAirOrBuildProcess(pid) {
    const cmd = await getProcessCommand(pid);
    return /(^|\/|\\)\.?air(\.exe)?($|\s)/.test(cmd) || /(^|\/|\\)go(\.exe)?\s+build/.test(cmd);
}
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractExecutable(command) {
    const trimmed = command.trim();
    if (!trimmed)
        return "";
    if (trimmed.startsWith("\"") || trimmed.startsWith("'")) {
        const quote = trimmed[0];
        const end = trimmed.indexOf(quote, 1);
        if (end > 1) {
            return trimmed.slice(1, end);
        }
    }
    const firstSpace = trimmed.search(/\s/);
    return firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
}
function executableLooksLikeTarget(executable, procName) {
    if (!executable || !procName)
        return false;
    const exe = executable.trim();
    const proc = procName.trim();
    if (!exe || !proc)
        return false;
    const procEre = escapeRegex(proc);
    const direct = new RegExp(`(^|[\\\\/])\\.?${procEre}(\\.exe)?$`, "i");
    const tmp = new RegExp(`(^|[\\\\/])tmp[\\\\/]+${procEre}(\\.exe)?$`, "i");
    return direct.test(exe) || tmp.test(exe);
}
async function matchesTargetProcess(pid, procName) {
    const cmd = await getProcessCommand(pid);
    const executable = extractExecutable(cmd);
    return executableLooksLikeTarget(executable, procName);
}
async function waitForStableProcess(pattern, pollMs, stabilityChecks = 3, procName) {
    let candidatePid = null;
    let stableCount = 0;
    while (state_1.GlobalState.isRunning()) {
        const pid = await pgrepNewestPid(pattern);
        if (!pid) {
            candidatePid = null;
            stableCount = 0;
            await (0, common_1.sleep)(pollMs);
            continue;
        }
        if (await isAirOrBuildProcess(pid)) {
            candidatePid = null;
            stableCount = 0;
            await (0, common_1.sleep)(pollMs);
            continue;
        }
        if (procName && !(await matchesTargetProcess(pid, procName))) {
            candidatePid = null;
            stableCount = 0;
            await (0, common_1.sleep)(pollMs);
            continue;
        }
        if (pid === candidatePid) {
            stableCount++;
            if (stableCount >= stabilityChecks) {
                const stillRunning = await isProcessRunning(pid);
                if (stillRunning) {
                    return pid;
                }
            }
        }
        else {
            candidatePid = pid;
            stableCount = 1;
        }
        await (0, common_1.sleep)(Math.min(pollMs, 100));
    }
    return null;
}
async function findTargetProcessPids(pattern, procName) {
    const pids = await pgrepAllPids(pattern);
    if (pids.length === 0)
        return [];
    const checks = await Promise.all(pids.map(async (pid) => {
        const running = await isProcessRunning(pid);
        if (!running)
            return null;
        if (await isAirOrBuildProcess(pid))
            return null;
        if (!(await matchesTargetProcess(pid, procName)))
            return null;
        return pid;
    }));
    return checks.filter((pid) => pid !== null);
}
async function terminateTargetProcesses(pattern, procName) {
    const pids = await findTargetProcessPids(pattern, procName);
    if (pids.length === 0)
        return [];
    for (const pid of pids) {
        try {
            process.kill(pid, "SIGTERM");
        }
        catch {
            // ignore missing/already-dead permissions errors
        }
    }
    const termWaitUntil = Date.now() + 1500;
    while (Date.now() < termWaitUntil) {
        const aliveChecks = await Promise.all(pids.map((pid) => isProcessRunning(pid)));
        if (!aliveChecks.some(Boolean))
            return pids;
        await (0, common_1.sleep)(100);
    }
    for (const pid of pids) {
        try {
            if (await isProcessRunning(pid)) {
                process.kill(pid, "SIGKILL");
            }
        }
        catch {
            // ignore
        }
    }
    return pids;
}
