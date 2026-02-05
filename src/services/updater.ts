import * as vscode from "vscode";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { URL } from "url";
import { UPDATES_GITHUB_REPO } from "../config";

const mkdir = promisify(fs.mkdir);

const REDIRECT_CODES = [301, 302, 303, 307, 308];
const MAX_REDIRECTS = 5;

function getClient(url: string): typeof https | typeof http {
  return url.startsWith("https") ? https : http;
}

interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes?: string;
}

export class Updater {
  private static checkInterval: NodeJS.Timeout | undefined;
  private static readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  static async checkForUpdates(manual: boolean = false): Promise<boolean> {
    let updateInfo: UpdateInfo | null = null;

    try {
      updateInfo = await this.fetchFromGitHub(UPDATES_GITHUB_REPO);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (manual) {
        vscode.window.showWarningMessage(`Ignite: Error checking for updates: ${msg}`);
      }
      return false;
    }

    try {
      const currentVersion = await this.getCurrentVersion();

      if (!updateInfo) {
        if (manual) {
          vscode.window.showInformationMessage("Ignite: Could not check for updates.");
        }
        return false;
      }

      if (this.isNewerVersion(updateInfo.version, currentVersion)) {
        const action = await vscode.window.showWarningMessage(
          `Ignite: A new version (${updateInfo.version}) is available. Update now?`,
          "Update",
          "Later"
        );

        if (action === "Update") {
          await this.downloadAndInstall(updateInfo);
          return true;
        }
      } else {
        if (manual) {
          vscode.window.showInformationMessage(
            `Ignite: You're already on the latest version (${currentVersion})`
          );
        }
      }

      return false;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error checking for updates:", error);
      if (manual) {
        vscode.window.showErrorMessage(`Ignite: Error checking for updates: ${msg}`);
      }
      return false;
    }
  }

  static startAutoCheck(): void {
    const config = vscode.workspace.getConfiguration("autoAttachUI");
    if (!config.get<boolean>("autoUpdate", true)) return;

    setTimeout(() => {
      this.checkForUpdates(false);
    }, 3000);

    this.checkInterval = setInterval(() => {
      this.checkForUpdates(false);
    }, this.CHECK_INTERVAL_MS);
  }

  static stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private static async getCurrentVersion(): Promise<string> {
    const extension = vscode.extensions.getExtension("local.ignite");
    return extension?.packageJSON.version || "0.0.0";
  }

  private static async fetchFromGitHub(repo: string): Promise<UpdateInfo | null> {
    const [repoPath, assetName] = repo.split(":");
    const [owner, repoName] = repoPath.split("/");

    if (!owner || !repoName) {
      throw new Error("Invalid GitHub repo format. Use: 'owner/repo'");
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/releases/latest`;

    const fetchWithRedirects = (url: string, redirectCount: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (redirectCount > MAX_REDIRECTS) {
          reject(new Error("Too many redirects"));
          return;
        }

        const client = getClient(url);
        const req = client.get(
          url,
          {
            headers: {
              "User-Agent": "Ignite-VSCode-Extension",
              Accept: "application/vnd.github.v3+json",
            },
          },
          (response) => {
            if (response.statusCode === 404) {
              reject(new Error("Repository or release not found"));
              return;
            }

            if (response.statusCode !== undefined && REDIRECT_CODES.includes(response.statusCode)) {
              const loc = response.headers.location;
              const location = typeof loc === "string" ? loc : Array.isArray(loc) ? loc[0] : undefined;
              response.resume();
              if (location) {
                const nextUrl = new URL(location, url).href;
                fetchWithRedirects(nextUrl, redirectCount + 1).then(resolve, reject);
                return;
              }
            }

            if (response.statusCode !== 200) {
              reject(new Error(`GitHub API error: ${response.statusCode}`));
              return;
            }

            let data = "";
            response.on("data", (chunk: Buffer) => {
              data += chunk.toString();
            });
            response.on("end", () => resolve(data));
            response.on("error", reject);
          }
        );

        req.on("error", reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error("Timeout connecting to GitHub"));
        });
      });
    };

    return fetchWithRedirects(apiUrl, 0).then((data) => {
      const parsed = JSON.parse(data);
      const release = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!release || typeof release !== "object") {
        throw new Error("Invalid GitHub API response");
      }
      const version = (release.tag_name || "").replace(/^v/, "");

      const vsixAsset = (release.assets || []).find((asset: { name: string }) => {
        if (assetName) {
          return asset.name === assetName || asset.name.endsWith(".vsix");
        }
        return asset.name.endsWith(".vsix");
      });

      if (!vsixAsset) {
        throw new Error("No .vsix file found in the release");
      }

      return {
        version,
        downloadUrl: vsixAsset.browser_download_url,
        releaseNotes: release.body || release.name,
      };
    });
  }

  private static isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const newParts = newVersion.split(".").map(Number);
    const currentParts = currentVersion.split(".").map(Number);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }

    return false;
  }

  private static async downloadAndInstall(updateInfo: UpdateInfo): Promise<void> {
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: "Updating Ignite",
      cancellable: false,
    };

    await vscode.window.withProgress(progressOptions, async (progress) => {
      progress.report({ increment: 0, message: "Downloading update..." });

      const tempDir = path.join(vscode.env.appRoot, "..", "extensions", ".ignite-updates");
      await mkdir(tempDir, { recursive: true });

      const vsixPath = path.join(tempDir, `ignite-${updateInfo.version}.vsix`);

      await this.downloadFile(updateInfo.downloadUrl, vsixPath, (percent) => {
        progress.report({
          increment: percent * 0.8,
          message: `Downloading... ${Math.round(percent * 100)}%`,
        });
      });

      progress.report({ increment: 80, message: "Installing extension..." });

      const codeCommand = process.platform === "win32" ? "code.cmd" : "code";
      const execAsync = promisify(exec);

      try {
        await execAsync(`${codeCommand} --uninstall-extension local.ignite || true`);
        await execAsync(`${codeCommand} --install-extension "${vsixPath}" --force`);
        progress.report({ increment: 100, message: "Update complete!" });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error installing: ${msg}`);
      }

      setTimeout(() => {
        fs.unlink(vsixPath, () => {});
      }, 5000);

      vscode.window
        .showInformationMessage(
          `Ignite updated to version ${updateInfo.version}. Reload the window to apply changes.`,
          "Reload"
        )
        .then((action) => {
          if (action === "Reload") {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        });
    });
  }

  private static async downloadFile(
    url: string,
    destPath: string,
    onProgress?: (percent: number) => void,
    redirectCount = 0
  ): Promise<void> {
    const maxRedirects = 5;
    if (redirectCount > maxRedirects) {
      throw new Error("Too many redirects");
    }

    return new Promise((resolve, reject) => {
      const client = getClient(url);
      const request = client.get(url, { timeout: 60000 }, (response) => {
        if (response.statusCode !== undefined && REDIRECT_CODES.includes(response.statusCode)) {
          const loc = response.headers.location;
          const location = typeof loc === "string" ? loc : Array.isArray(loc) ? loc[0] : undefined;
          if (!location) {
            reject(new Error(`HTTP ${response.statusCode} without Location header`));
            return;
          }
          response.resume();
          const nextUrl = location.startsWith("http") ? location : new URL(location, url).href;
          this.downloadFile(nextUrl, destPath, onProgress, redirectCount + 1).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers["content-length"] || "0", 10);
        let downloadedSize = 0;

        const fileStream = fs.createWriteStream(destPath);

        response.on("data", (chunk: Buffer) => {
          downloadedSize += chunk.length;
          if (onProgress && totalSize > 0) {
            onProgress(downloadedSize / totalSize);
          }
        });

        response.on("end", () => {
          fileStream.end();
          resolve();
        });

        response.on("error", (error) => {
          fs.unlink(destPath, () => {});
          reject(error);
        });

        response.pipe(fileStream);
      });

      request.on("error", reject);

      request.setTimeout(60000, () => {
        request.destroy();
        reject(new Error("Timeout downloading"));
      });
    });
  }
}
