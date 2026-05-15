export type JarvisState =
  | 'idle'
  | 'listening_wake'
  | 'listening_command'
  | 'processing'
  | 'speaking'
  | 'error'

export type CommandCategory =
  | 'system'
  | 'app'
  | 'web'
  | 'file'
  | 'volume'
  | 'brightness'
  | 'terminal'
  | 'clipboard'
  | 'screenshot'
  | 'power'
  | 'ai'
  | 'custom'
  | 'unknown'

export interface CommandResult {
  success: boolean
  message: string
  category: CommandCategory
  data?: Record<string, unknown>
  requiresConfirmation?: boolean
  confirmationId?: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface HistoryEntry {
  id: string
  input: string
  output: string
  category: CommandCategory
  timestamp: number
  success: boolean
}

export type SttEngine = 'local' | 'webspeech'

export type LocalWhisperState = 'disabled' | 'loading' | 'ready' | 'error'

export interface LocalWhisperStatus {
  state: LocalWhisperState
  model: string
  message: string
  progress?: number
}

export interface SttStatus {
  activeEngine: SttEngine
  preferredEngine: SttEngine | 'auto'
  whisper: LocalWhisperStatus
}

export interface SystemStatus {
  online: boolean
  microphone: boolean
  listening: boolean
  speaking: boolean
  openaiConfigured: boolean
  ollamaEnabled: boolean
  sttEngine?: SttEngine
  localWhisper?: LocalWhisperState
  cpuLoad?: string
  memoryUsed?: string
}

export interface CustomCommand {
  id: string
  phrase: string
  action: 'shell' | 'open_app' | 'open_url' | 'workflow'
  payload: string
  description?: string
}

export interface AppSettings {
  wakeWords: string[]
  ttsEngine: 'macos' | 'openai'
  macosVoice: string
  confirmDestructive: boolean
  launchAtLogin: boolean
  startListening: boolean
  customCommands: CustomCommand[]
  appPresets: Record<string, string>
}

export interface VoiceLevelEvent {
  level: number
  timestamp: number
}

export type IpcChannels = {
  'jarvis:get-state': void
  'jarvis:state-update': { state: JarvisState; message?: string }
  'jarvis:process-text': { text: string }
  'jarvis:process-result': CommandResult
  'jarvis:confirm': { id: string; approved: boolean }
  'jarvis:toggle-listening': { enabled: boolean }
  'jarvis:stop-speaking': void
  'jarvis:get-history': void
  'jarvis:history': HistoryEntry[]
  'jarvis:get-settings': void
  'jarvis:settings': AppSettings
  'jarvis:save-settings': Partial<AppSettings>
  'jarvis:system-status': SystemStatus
  'jarvis:voice-level': VoiceLevelEvent
  'jarvis:transcript': { text: string; interim?: boolean }
  'jarvis:open-settings': void
  'jarvis:show-window': void
  'jarvis:hide-window': void
}
