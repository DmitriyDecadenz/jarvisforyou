import { runAppleScript } from '../system/shell'

export async function createReminder(text: string): Promise<string> {
  const escaped = text.replace(/"/g, '\\"')
  await runAppleScript(`
    tell application "Reminders"
      make new reminder with properties {name:"${escaped}"}
    end tell
  `)
  return `Reminder created: ${text}`
}
