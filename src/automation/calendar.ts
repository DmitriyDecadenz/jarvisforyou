import { runAppleScript } from '../system/shell'

export async function getTodayEvents(): Promise<string> {
  try {
    const result = await runAppleScript(`
      tell application "Calendar"
        set todayEvents to {}
        set startOfDay to current date
        set hours of startOfDay to 0
        set minutes of startOfDay to 0
        set endOfDay to startOfDay + (1 * days)
        repeat with cal in calendars
          repeat with e in (every event of cal whose start date ≥ startOfDay and start date < endOfDay)
            set end of todayEvents to (summary of e) & " at " & (start date of e as string)
          end repeat
        end repeat
        if (count of todayEvents) = 0 then return "No events today, sir."
        return "Today's schedule: " & (todayEvents as string)
      end tell
    `)
    return result
  } catch (e) {
    return `Calendar access denied or unavailable: ${(e as Error).message}`
  }
}
