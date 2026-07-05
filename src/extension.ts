import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let outputChannel: vscode.OutputChannel;
let hasWarnedUndefinedExitCode = false;

function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("Terminal Sound");
    }
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

export function activate(context: vscode.ExtensionContext) {
    log('Terminal Sound extension is activating...');

    const disposable = vscode.window.onDidEndTerminalShellExecution(async (event) => {
        const config = vscode.workspace.getConfiguration('terminalSound');
        const enabled = config.get<boolean>('enabled', true);
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

        const volume = config.get<number>('volume', 1.0);
        const customSuccessPath = config.get<string>('successSoundPath', '');
        const customFailurePath = config.get<string>('failureSoundPath', '');

        let soundPath = '';
        if (exitCode === 0) {
            if (customSuccessPath && fs.existsSync(customSuccessPath)) {
                soundPath = customSuccessPath;
            } else {
                soundPath = path.join(context.extensionPath, 'media', 'success.wav');
                if (customSuccessPath) {
                    log(`Custom success sound path does not exist: "${customSuccessPath}". Falling back to default success sound.`, 'warn');
                }
            }
        } else {
            if (customFailurePath && fs.existsSync(customFailurePath)) {
                soundPath = customFailurePath;
            } else {
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

export function deactivate() {
    log('Terminal Sound extension deactivated.');
}

function playSound(soundPath: string, volume: number) {
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
    } else if (platform === 'win32') {
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
    } else if (platform === 'linux') {
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
    } else {
        log(`Unsupported platform for sound playback: ${platform}`, 'error');
    }
}
