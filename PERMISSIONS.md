# JARVIS — macOS Permissions Setup

JARVIS uses real macOS APIs. Grant these permissions for full functionality.

## 1. Microphone

**System Settings → Privacy & Security → Microphone**

Enable **JARVIS** (or Electron during development).

Required for: wake word listening, voice commands.

## 2. Speech Recognition

**System Settings → Privacy & Security → Speech Recognition**

Enable **JARVIS**.

Required for: Web Speech API transcription in the renderer.

## 3. Accessibility

**System Settings → Privacy & Security → Accessibility**

Enable **JARVIS**.

Required for: controlling volume/brightness via synthetic keys, some UI automation.

## 4. Automation (Apple Events)

**System Settings → Privacy & Security → Automation**

When prompted, allow JARVIS to control:

- **System Events** — volume, brightness, lock
- **Terminal** — run commands
- **Reminders** — create reminders
- **Finder** — reveal files

## 5. Screen Recording (Optional)

Only if you enable screenshot or screen-understanding features beyond basic `screencapture`.

**System Settings → Privacy & Security → Screen Recording**

## Development (npm run dev)

Electron runs as **Electron.app**. You may need to grant permissions to:

- Terminal (if launched from terminal)
- Electron
- Cursor (if launched from IDE)

Restart JARVIS after changing permissions.

## Verify Permissions

```bash
# Test microphone (should list devices)
system_profiler SPAudioDataType

# Test AppleScript
osascript -e 'tell application "Safari" to activate'

# Test say (TTS)
say -v Daniel "JARVIS online, sir."
```

## Security Notes

- Shutdown/restart require **UI confirmation**
- Dangerous shell patterns (`rm -rf`, etc.) are blocked
- Terminal commands open in a **new Terminal window** (visible to user)
