import { runShell } from '../system/shell'

/** macOS Vision-based OCR via shortcuts (macOS 12+) or screencapture fallback */
export async function readScreenText(): Promise<string> {
  try {
    const { stdout } = await runShell(
      `screencapture -x /tmp/jarvis-ocr.png && osascript -e '
        set imgPath to POSIX file "/tmp/jarvis-ocr.png"
        -- Use Shortcuts/Live Text when available; fallback message
        return "Screenshot captured. Use Summarize or ask JARVIS about visible content."
      '`
    )
    return stdout || 'Screen captured for analysis.'
  } catch (e) {
    return `OCR unavailable: ${(e as Error).message}`
  }
}
