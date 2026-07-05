# Terminal Sound VS Code Extension

Plays a success or failure sound when a terminal command finishes executing in VS Code, using the native Terminal Shell Integration API.

## Features

- **Automatic Sound Feedback**: Plays a bright, pleasant double-tone sound when a terminal command succeeds (exit code `0`), and a lower, buzzy, descending tone when a command fails (non-zero exit code).
- **Cross-platform Playback**: Spawns native audio players with zero runtime Node dependencies:
  - **macOS**: uses `afplay`
  - **Windows**: uses PowerShell `Media.SoundPlayer`
  - **Linux**: uses `paplay` (with fallback to `aplay`)
- **Configurable Settings**: Toggle sounds, set custom sound paths, or adjust playback volume.

## Requirements

- **VS Code 1.93.0** or higher (where the shell execution end APIs were finalized).
- **Shell Integration** must be enabled in your VS Code settings. Ensure that `"terminal.integrated.shellIntegration.enabled"` is set to `true` (this is the default in VS Code).

## Extension Settings

This extension contributes the following settings:

* `terminalSound.enabled`: Enable or disable terminal command completion sounds (default: `true`).
* `terminalSound.successSoundPath`: Absolute path to a custom `.wav` sound file to play on successful command completion. If empty, the bundled default success sound is played.
* `terminalSound.failureSoundPath`: Absolute path to a custom `.wav` sound file to play on failed command completion. If empty, the bundled default failure sound is played.
* `terminalSound.volume`: Volume of the sound playback (value between `0.0` and `1.0`, default: `1.0`). Note: volume adjustment is only supported on macOS and Linux (with `paplay`).

## Extension Development & Testing

1. Open this folder in VS Code.
2. Run `npm install` to load TypeScript and VS Code type definitions.
3. Run `python3 scripts/generate_sounds.py` to generate the default sound wave files (success.wav and failure.wav) in the `/media` folder.
4. Press `F5` to launch the **Extension Development Host**.
5. In the new window, open the integrated terminal and execute command lines (e.g. `echo "hello"`, `exit 1`, etc.).
6. Sounds should play automatically on completion! You can view log messages in the **Terminal Sound** output channel.
