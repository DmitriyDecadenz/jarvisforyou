import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  CommandResult,
  HistoryEntry,
  JarvisState,
  LocalWhisperStatus,
  SttStatus,
  SystemStatus
} from '../shared/types'

export interface JarvisAPI {
  getState: () => Promise<JarvisState>
  processText: (text: string) => Promise<CommandResult>
  confirm: (id: string, approved: boolean) => Promise<CommandResult>
  toggleListening: (enabled: boolean) => Promise<boolean>
  stopSpeaking: () => Promise<void>
  getHistory: () => Promise<HistoryEntry[]>
  getSettings: () => Promise<AppSettings>
  saveSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  getSystemStatus: () => Promise<SystemStatus>
  getSttStatus: () => Promise<SttStatus>
  transcribeLocal: (samples: number[]) => Promise<string>
  restartWhisper: () => Promise<SttStatus>
  sendTranscript: (text: string, interim?: boolean) => Promise<void>
  sendVoiceLevel: (level: number) => void
  openExternal: (url: string) => Promise<void>
  onStateUpdate: (cb: (data: { state: JarvisState; message?: string }) => void) => () => void
  onProcessResult: (cb: (result: CommandResult) => void) => () => void
  onHistory: (cb: (history: HistoryEntry[]) => void) => () => void
  onSystemStatus: (cb: (status: SystemStatus) => void) => () => void
  onTranscript: (cb: (data: { text: string; interim?: boolean }) => void) => () => void
  onVoiceLevel: (cb: (data: { level: number; timestamp: number }) => void) => () => void
  onWhisperStatus: (cb: (status: LocalWhisperStatus) => void) => () => void
  onSttReady: (cb: (status: SttStatus) => void) => () => void
}

function subscribe<T>(channel: string, cb: (data: T) => void): () => void {
  const handler = (_: Electron.IpcRendererEvent, data: T) => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: JarvisAPI = {
  getState: () => ipcRenderer.invoke('jarvis:get-state'),
  processText: (text) => ipcRenderer.invoke('jarvis:process-text', text),
  confirm: (id, approved) => ipcRenderer.invoke('jarvis:confirm', id, approved),
  toggleListening: (enabled) => ipcRenderer.invoke('jarvis:toggle-listening', enabled),
  stopSpeaking: () => ipcRenderer.invoke('jarvis:stop-speaking'),
  getHistory: () => ipcRenderer.invoke('jarvis:get-history'),
  getSettings: () => ipcRenderer.invoke('jarvis:get-settings'),
  saveSettings: (partial) => ipcRenderer.invoke('jarvis:save-settings', partial),
  getSystemStatus: () => ipcRenderer.invoke('jarvis:system-status'),
  getSttStatus: () => ipcRenderer.invoke('jarvis:get-stt-status'),
  transcribeLocal: (samples) => ipcRenderer.invoke('jarvis:transcribe-local', samples),
  restartWhisper: () => ipcRenderer.invoke('jarvis:restart-whisper'),
  sendTranscript: (text, interim) =>
    ipcRenderer.invoke('jarvis:transcript-from-renderer', text, interim),
  sendVoiceLevel: (level) => ipcRenderer.send('jarvis:voice-level', level),
  openExternal: (url) => ipcRenderer.invoke('jarvis:open-external', url),
  onStateUpdate: (cb) => subscribe('jarvis:state-update', cb),
  onProcessResult: (cb) => subscribe('jarvis:process-result', cb),
  onHistory: (cb) => subscribe('jarvis:history', cb),
  onSystemStatus: (cb) => subscribe('jarvis:system-status', cb),
  onTranscript: (cb) => subscribe('jarvis:transcript', cb),
  onVoiceLevel: (cb) => subscribe('jarvis:voice-level', cb),
  onWhisperStatus: (cb) => subscribe('jarvis:whisper-status', cb),
  onSttReady: (cb) => subscribe('jarvis:stt-ready', cb)
}

contextBridge.exposeInMainWorld('jarvis', api)
