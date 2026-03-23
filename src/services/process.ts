import { execFile } from "child_process";
import { GlobalState } from "../state";
import { sleep } from "../utils/common";

const DEFAULT_TIMEOUT_MS = 2000;

export async function isProcessRunning(pid: number, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeoutMs);

    execFile("ps", ["-p", pid.toString(), "-o", "state="], (err, stdout) => {
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

export async function getProcessCommand(pid: number, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve("");
    }, timeoutMs);

    execFile("ps", ["-p", pid.toString(), "-o", "command="], (err, stdout) => {
      clearTimeout(timer);
      resolve(err ? "" : stdout.trim());
    });
  });
}

export async function pgrepNewestPid(pattern: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<number | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    execFile("pgrep", ["-n", "-f", pattern], (err, stdout) => {
      clearTimeout(timer);
      if (err) return resolve(null);
      const s = (stdout || "").trim();
      const pid = Number.parseInt(s, 10);
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });
}

export async function pgrepAllPids(pattern: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<number[]> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve([]);
    }, timeoutMs);

    execFile("pgrep", ["-f", pattern], (err, stdout) => {
      clearTimeout(timer);
      if (err) return resolve([]);
      const pids = (stdout || "")
        .split(/\s+/)
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      resolve(Array.from(new Set(pids)));
    });
  });
}

export async function waitForPid(pattern: string, pollMs: number): Promise<number | null> {
  while (GlobalState.isRunning()) {
    const pid = await pgrepNewestPid(pattern);
    if (pid) return pid;
    await sleep(pollMs);
  }
  return null;
}

export async function isAirOrBuildProcess(pid: number): Promise<boolean> {
  const cmd = await getProcessCommand(pid);
  return /(^|\/|\\)\.?air(\.exe)?($|\s)/.test(cmd) || /(^|\/|\\)go(\.exe)?\s+build/.test(cmd);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractExecutable(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) return "";
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

function executableLooksLikeTarget(executable: string, procName: string): boolean {
  if (!executable || !procName) return false;
  const exe = executable.trim();
  const proc = procName.trim();
  if (!exe || !proc) return false;
  const procEre = escapeRegex(proc);
  const direct = new RegExp(`(^|[\\\\/])\\.?${procEre}(\\.exe)?$`, "i");
  const tmp = new RegExp(`(^|[\\\\/])tmp[\\\\/]+${procEre}(\\.exe)?$`, "i");
  return direct.test(exe) || tmp.test(exe);
}

export async function matchesTargetProcess(pid: number, procName: string): Promise<boolean> {
  const cmd = await getProcessCommand(pid);
  const executable = extractExecutable(cmd);
  return executableLooksLikeTarget(executable, procName);
}

export async function waitForStableProcess(
  pattern: string,
  pollMs: number,
  stabilityChecks: number = 3,
  procName?: string
): Promise<number | null> {
  let candidatePid: number | null = null;
  let stableCount = 0;

  while (GlobalState.isRunning()) {
    const pid = await pgrepNewestPid(pattern);

    if (!pid) {
      candidatePid = null;
      stableCount = 0;
      await sleep(pollMs);
      continue;
    }

    if (await isAirOrBuildProcess(pid)) {
      candidatePid = null;
      stableCount = 0;
      await sleep(pollMs);
      continue;
    }

    if (procName && !(await matchesTargetProcess(pid, procName))) {
      candidatePid = null;
      stableCount = 0;
      await sleep(pollMs);
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
    } else {
      candidatePid = pid;
      stableCount = 1;
    }

    await sleep(Math.min(pollMs, 100));
  }

  return null;
}

export async function findTargetProcessPids(pattern: string, procName: string): Promise<number[]> {
  const pids = await pgrepAllPids(pattern);
  if (pids.length === 0) return [];

  const checks = await Promise.all(
    pids.map(async (pid) => {
      const running = await isProcessRunning(pid);
      if (!running) return null;
      if (await isAirOrBuildProcess(pid)) return null;
      if (!(await matchesTargetProcess(pid, procName))) return null;
      return pid;
    })
  );

  return checks.filter((pid): pid is number => pid !== null);
}

export async function terminateTargetProcesses(pattern: string, procName: string): Promise<number[]> {
  const pids = await findTargetProcessPids(pattern, procName);
  if (pids.length === 0) return [];

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore missing/already-dead permissions errors
    }
  }

  const termWaitUntil = Date.now() + 1500;
  while (Date.now() < termWaitUntil) {
    const aliveChecks = await Promise.all(pids.map((pid) => isProcessRunning(pid)));
    if (!aliveChecks.some(Boolean)) return pids;
    await sleep(100);
  }

  for (const pid of pids) {
    try {
      if (await isProcessRunning(pid)) {
        process.kill(pid, "SIGKILL");
      }
    } catch {
      // ignore
    }
  }

  return pids;
}
