"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Updater = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const url_1 = require("url");
const config_1 = require("../config");
const state_1 = require("../state");
const mkdir = (0, util_1.promisify)(fs.mkdir);
const REDIRECT_CODES = [301, 302, 303, 307, 308];
const MAX_REDIRECTS = 5;
function getClient(url) {
    return url.startsWith("https") ? https : http;
}
class Updater {
    static checkInterval;
    static CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    static async checkForUpdates(manual = false) {
        let updateInfo = null;
        try {
            updateInfo = await this.fetchFromGitHub(config_1.UPDATES_GITHUB_REPO);
        }
        catch (error) {
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
                const action = await vscode.window.showWarningMessage(`Ignite: A new version (${updateInfo.version}) is available. Update now?`, "Update", "Later");
                if (action === "Update") {
                    await this.downloadAndInstall(updateInfo);
                    return true;
                }
            }
            else {
                if (manual) {
                    vscode.window.showInformationMessage(`Ignite: You're already on the latest version (${currentVersion})`);
                }
            }
            return false;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Error checking for updates:", error);
            if (manual) {
                vscode.window.showErrorMessage(`Ignite: Error checking for updates: ${msg}`);
            }
            return false;
        }
    }
    static startAutoCheck() {
        const config = vscode.workspace.getConfiguration("autoAttachUI");
        if (!config.get("autoUpdate", true))
            return;
        setTimeout(() => {
            this.checkForUpdates(false);
        }, 3000);
        this.checkInterval = setInterval(() => {
            this.checkForUpdates(false);
        }, this.CHECK_INTERVAL_MS);
    }
    static stopAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
    }
    static async getCurrentVersion() {
        const extId = this.getExtensionId();
        const extension = extId ? vscode.extensions.getExtension(extId) : undefined;
        return extension?.packageJSON.version || "0.0.0";
    }
    static getExtensionId() {
        const ctx = state_1.GlobalState.getContext();
        return ctx?.extension?.id ?? "local.ignite";
    }
    static async fetchFromGitHub(repo) {
        const [repoPath, assetName] = repo.split(":");
        const [owner, repoName] = repoPath.split("/");
        if (!owner || !repoName) {
            throw new Error("Invalid GitHub repo format. Use: 'owner/repo'");
        }
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/releases/latest`;
        const fetchWithRedirects = (url, redirectCount) => {
            return new Promise((resolve, reject) => {
                if (redirectCount > MAX_REDIRECTS) {
                    reject(new Error("Too many redirects"));
                    return;
                }
                const client = getClient(url);
                const req = client.get(url, {
                    headers: {
                        "User-Agent": "Ignite-VSCode-Extension",
                        Accept: "application/vnd.github.v3+json",
                    },
                }, (response) => {
                    if (response.statusCode === 404) {
                        reject(new Error("Repository or release not found"));
                        return;
                    }
                    if (response.statusCode !== undefined && REDIRECT_CODES.includes(response.statusCode)) {
                        const loc = response.headers.location;
                        const location = typeof loc === "string" ? loc : Array.isArray(loc) ? loc[0] : undefined;
                        response.resume();
                        if (location) {
                            const nextUrl = new url_1.URL(location, url).href;
                            fetchWithRedirects(nextUrl, redirectCount + 1).then(resolve, reject);
                            return;
                        }
                    }
                    if (response.statusCode !== 200) {
                        reject(new Error(`GitHub API error: ${response.statusCode}`));
                        return;
                    }
                    let data = "";
                    response.on("data", (chunk) => {
                        data += chunk.toString();
                    });
                    response.on("end", () => resolve(data));
                    response.on("error", reject);
                });
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
            const vsixAsset = (release.assets || []).find((asset) => {
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
    static isNewerVersion(newVersion, currentVersion) {
        const newParts = newVersion.split(".").map(Number);
        const currentParts = currentVersion.split(".").map(Number);
        for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
            const newPart = newParts[i] || 0;
            const currentPart = currentParts[i] || 0;
            if (newPart > currentPart)
                return true;
            if (newPart < currentPart)
                return false;
        }
        return false;
    }
    static async downloadAndInstall(updateInfo) {
        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: "Updating Ignite",
            cancellable: false,
        };
        await vscode.window.withProgress(progressOptions, async (progress) => {
            progress.report({ increment: 0, message: "Downloading update..." });
            const tempDir = path.join(os.tmpdir(), "ignite-updates");
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
            const appCodePath = path.join(vscode.env.appRoot, "bin", codeCommand);
            const resolvedCodeCommand = fs.existsSync(appCodePath) ? appCodePath : codeCommand;
            const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
            try {
                const extId = this.getExtensionId();
                if (extId) {
                    try {
                        await execFileAsync(resolvedCodeCommand, ["--uninstall-extension", extId]);
                    }
                    catch {
                        // ignore uninstall errors
                    }
                }
                await execFileAsync(resolvedCodeCommand, ["--install-extension", vsixPath, "--force"]);
                progress.report({ increment: 100, message: "Update complete!" });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                throw new Error(`Error installing: ${msg}`);
            }
            setTimeout(() => {
                fs.unlink(vsixPath, () => { });
            }, 5000);
            vscode.window
                .showInformationMessage(`Ignite updated to version ${updateInfo.version}. Reload the window to apply changes.`, "Reload")
                .then((action) => {
                if (action === "Reload") {
                    vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
            });
        });
    }
    static async downloadFile(url, destPath, onProgress, redirectCount = 0) {
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
                    const nextUrl = location.startsWith("http") ? location : new url_1.URL(location, url).href;
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
                response.on("data", (chunk) => {
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
                    fs.unlink(destPath, () => { });
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
exports.Updater = Updater;
