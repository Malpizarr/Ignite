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

export async function waitForStableProcess(pattern: string, pollMs: number, stabilityChecks: number = 3): Promise<number | null> {
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
