import type { CommandCategory } from '../shared/types'

export interface ParsedCommand {
  category: CommandCategory
  intent: string
  params: Record<string, string>
  raw: string
}

export function stripWakeWord(text: string, wakeWords: string[]): string {
  let cleaned = text.trim()
  for (const wake of wakeWords.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`^${escapeRegex(wake)}[,\\s]*`, 'i')
    cleaned = cleaned.replace(re, '').trim()
  }
  return cleaned
}

export function containsWakeWord(text: string, wakeWords: string[]): boolean {
  const lower = text.toLowerCase().trim()
  return wakeWords.some((w) => lower.includes(w))
}

export function parseCommand(text: string): ParsedCommand | null {
  const raw = text.trim()
  const lower = raw.toLowerCase()

  if (!raw) return null

  // Open app
  let m = lower.match(/^(?:jarvis[,]?\s+)?(?:open|launch|start)\s+(.+)$/i)
  if (m) return { category: 'app', intent: 'open', params: { app: m[1].trim() }, raw }

  // Close app
  m = lower.match(/^(?:jarvis[,]?\s+)?(?:close|quit|exit)\s+(.+)$/i)
  if (m) return { category: 'app', intent: 'close', params: { app: m[1].trim() }, raw }

  // Google search
  m = lower.match(/(?:search\s+)?google\s+for\s+(.+)/i)
  if (m) return { category: 'web', intent: 'google', params: { query: m[1].trim() }, raw }

  m = lower.match(/search\s+(?:the\s+)?web\s+for\s+(.+)/i)
  if (m) return { category: 'web', intent: 'google', params: { query: m[1].trim() }, raw }

  // Open website
  m = lower.match(/^(?:open|go to|visit)\s+(https?:\/\/.+|www\..+|\S+\.\S+)$/i)
  if (m) return { category: 'web', intent: 'open_url', params: { url: m[1].trim() }, raw }

  // Volume
  if (/\b(increase|raise|turn up)\s+(the\s+)?volume\b/.test(lower) || lower === 'volume up') {
    return { category: 'volume', intent: 'up', params: {}, raw }
  }
  if (/\b(decrease|lower|turn down)\s+(the\s+)?volume\b/.test(lower) || lower === 'volume down') {
    return { category: 'volume', intent: 'down', params: {}, raw }
  }
  if (/\b(mute|silence)\s+(the\s+)?volume\b/.test(lower) || lower === 'mute') {
    return { category: 'volume', intent: 'mute', params: {}, raw }
  }
  m = lower.match(/set\s+volume\s+to\s+(\d+)/)
  if (m) return { category: 'volume', intent: 'set', params: { level: m[1] }, raw }

  // Brightness
  if (/\b(increase|raise)\s+(the\s+)?brightness\b/.test(lower)) {
    return { category: 'brightness', intent: 'up', params: {}, raw }
  }
  if (/\b(decrease|lower)\s+(the\s+)?brightness\b/.test(lower)) {
    return { category: 'brightness', intent: 'down', params: {}, raw }
  }

  // Screenshot
  if (/\b(take\s+a?\s*)?screenshot\b/.test(lower)) {
    return { category: 'screenshot', intent: 'capture', params: {}, raw }
  }

  // Lock
  if (/\block\s+(the\s+)?(mac|screen|computer)\b/.test(lower) || lower === 'lock screen') {
    return { category: 'system', intent: 'lock', params: {}, raw }
  }

  // Create folder
  m = lower.match(/create\s+(?:a\s+)?folder\s+(?:called|named)\s+(.+)/i)
  if (m) return { category: 'file', intent: 'mkdir', params: { name: m[1].trim() }, raw }

  // Create file
  m = lower.match(/create\s+(?:a\s+)?file\s+(?:called|named)\s+(.+)/i)
  if (m) return { category: 'file', intent: 'touch', params: { name: m[1].trim() }, raw }

  // Search files
  m = lower.match(/(?:search|find)\s+(?:for\s+)?files?\s+(?:named|called)?\s*(.+)/i)
  if (m) return { category: 'file', intent: 'search', params: { query: m[1].trim() }, raw }

  // Clipboard
  if (/\b(read|get)\s+(the\s+)?clipboard\b/.test(lower)) {
    return { category: 'clipboard', intent: 'read', params: {}, raw }
  }

  // Terminal
  m = lower.match(/(?:run|execute)\s+(?:command|terminal)\s+(.+)/i)
  if (m) return { category: 'terminal', intent: 'run', params: { command: m[1].trim() }, raw }

  // Power
  if (/\bshut\s*down\b/.test(lower)) {
    return { category: 'power', intent: 'shutdown', params: {}, raw }
  }
  if (/\brestart\b/.test(lower)) {
    return { category: 'power', intent: 'restart', params: {}, raw }
  }

  // Reminder (bonus)
  m = lower.match(/(?:remind me|set a reminder)\s+(?:to\s+)?(.+)/i)
  if (m) return { category: 'system', intent: 'reminder', params: { text: m[1].trim() }, raw }

  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
