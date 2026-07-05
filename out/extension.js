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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let outputChannel;
let hasWarnedUndefinedExitCode = false;
function log(message, level = 'info') {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("Terminal Sound");
    }
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}
function activate(context) {
    log('Terminal Sound extension is activating...');
    const disposable = vscode.window.onDidEndTerminalShellExecution(async (event) => {
        const config = vscode.workspace.getConfiguration('terminalSound');
        const enabled = config.get('enabled', true);
        if (!enabled) {
            log('Extension is disabled in settings. Skipping sound playback.', 'info');
            return;
        }
        const exitCode = event.exitCode;
        if (exitCode === undefined) {
            if (!hasWarnedUndefinedExitCode) {
                hasWarnedUndefinedExitCode = true;
                log('Terminal execution ended but exitCode was undefined. This typically means Shell Integration is not fully initialized, supported, or enabled for this terminal.', 'warn');
            }
            return;
        }
        const volume = config.get('volume', 1.0);
        const customSuccessPath = config.get('successSoundPath', '');
        const customFailurePath = config.get('failureSoundPath', '');
        let soundPath = '';
        if (exitCode === 0) {
            if (customSuccessPath && fs.existsSync(customSuccessPath)) {
                soundPath = customSuccessPath;
            }
            else {
                soundPath = path.join(context.extensionPath, 'media', 'success.wav');
                if (customSuccessPath) {
                    log(`Custom success sound path does not exist: "${customSuccessPath}". Falling back to default success sound.`, 'warn');
                }
            }
        }
        else {
            if (customFailurePath && fs.existsSync(customFailurePath)) {
                soundPath = customFailurePath;
            }
            else {
                soundPath = path.join(context.extensionPath, 'media', 'failure.wav');
                if (customFailurePath) {
                    log(`Custom failure sound path does not exist: "${customFailurePath}". Falling back to default failure sound.`, 'warn');
                }
            }
        }
        log(`Command completed in terminal "${event.terminal.name}" with exit code: ${exitCode}. Playing sound: ${soundPath}`);
        playSound(soundPath, volume);
    });
    context.subscriptions.push(disposable);
    log('Terminal Sound extension activated.');
}
function deactivate() {
    log('Terminal Sound extension deactivated.');
}
function playSound(soundPath, volume) {
    const clampedVolume = Math.min(Math.max(volume, 0), 1);
    const platform = process.platform;
    if (platform === 'darwin') {
        // macOS: afplay
        // afplay takes volume in range [0, 1]
        const args = ['-v', clampedVolume.toString(), soundPath];
        log(`Spawning: afplay ${args.join(' ')}`);
        const child = child_process.spawn('afplay', args);
        child.on('error', (err) => {
            log(`Failed to spawn afplay: ${err.message}`, 'error');
        });
        child.stderr?.on('data', (data) => {
            log(`afplay stderr: ${data.toString().trim()}`, 'error');
        });
    }
    else if (platform === 'win32') {
        // Windows: PowerShell System.Media.SoundPlayer
        // SoundPlayer doesn't support volume, but it's the standard out-of-the-box solution
        const escapedPath = soundPath.replace(/'/g, "''");
        const psCommand = `(New-Object Media.SoundPlayer '${escapedPath}').PlaySync()`;
        log(`Spawning: powershell.exe -NoProfile -NonInteractive -Command "${psCommand}"`);
        const child = child_process.spawn('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            psCommand
        ]);
        child.on('error', (err) => {
            log(`Failed to spawn powershell: ${err.message}`, 'error');
        });
        child.stderr?.on('data', (data) => {
            log(`powershell stderr: ${data.toString().trim()}`, 'error');
        });
    }
    else if (platform === 'linux') {
        // Linux: Try paplay first, then fallback to aplay
        // paplay volume is 0 to 65536 (or a percentage like 100%)
        const paplayVolume = Math.round(clampedVolume * 65536);
        const paplayArgs = [`--volume=${paplayVolume}`, soundPath];
        log(`Spawning: paplay ${paplayArgs.join(' ')}`);
        const child = child_process.spawn('paplay', paplayArgs);
        child.on('error', (err) => {
            log(`paplay spawn failed: ${err.message}. Retrying with aplay...`, 'warn');
            const aplayChild = child_process.spawn('aplay', [soundPath]);
            aplayChild.on('error', (aplayErr) => {
                log(`Failed to play sound on Linux (tried paplay and aplay). aplay error: ${aplayErr.message}`, 'error');
            });
            aplayChild.stderr?.on('data', (data) => {
                log(`aplay stderr: ${data.toString().trim()}`, 'error');
            });
        });
        child.stderr?.on('data', (data) => {
            log(`paplay stderr: ${data.toString().trim()}`, 'error');
        });
    }
    else {
        log(`Unsupported platform for sound playback: ${platform}`, 'error');
    }
}
//# sourceMappingURL=extension.js.map