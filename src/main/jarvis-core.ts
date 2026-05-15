import { BrowserWindow } from 'electron'
import type { CommandResult, JarvisState, SystemStatus } from '../shared/types'
import { MemoryStore } from '../ai/memory'
import { CommandExecutor } from '../commands/executor'
import { speak, stopSpeaking, isSpeaking } from '../voice/tts'
import { stripWakeWord, containsWakeWord } from '../commands/parser'
import { getSettings, getCustomCommands } from './settings-store'
import { isOpenAIConfigured } from '../ai/openai-client'
import { getConfig } from '../shared/config'
import * as macos from '../system/macos'
import { resolveActiveSttEngine } from '../voice/stt-router'
import { getLocalWhisperStatus } from '../voice/local-whisper'

export class JarvisCore {
  private state: JarvisState = 'idle'
  private listening = false
  private memory = new MemoryStore()
  private executor: CommandExecutor
  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.executor = new CommandExecutor(
      this.memory,
      getCustomCommands,
      getSettings().confirmDestructive
    )
  }

  setMainWindow(win: BrowserWindow | null): void {
    this.mainWindow = win
  }

  getState(): JarvisState {
    return this.state
  }

  isListening(): boolean {
    return this.listening
  }

  setListening(enabled: boolean): void {
    this.listening = enabled
    this.setState(enabled ? 'listening_wake' : 'idle')
    this.broadcastStatus()
  }

  async processTranscript(text: string): Promise<void> {
    const settings = getSettings()
    const trimmed = text.trim()
    if (!trimmed) return

    const hasWake = containsWakeWord(trimmed, settings.wakeWords)
    if (this.listening && !hasWake) return

    let command = stripWakeWord(trimmed, settings.wakeWords)

    // Wake word only — prompt for command
    if (hasWake && command.length < 3) {
      this.setState('listening_command')
      this.emit('jarvis:state-update', { state: 'listening_command', message: 'Yes, sir?' })
      try {
        await speak('Yes, sir?')
      } catch {
        /* ignore */
      }
      return
    }

    if (!command) command = trimmed
    if (/^confirm$/i.test(command)) return

    await this.runCommand(command)
  }

  async processText(text: string): Promise<CommandResult> {
    const settings = getSettings()
    const command = stripWakeWord(text.trim(), settings.wakeWords) || text.trim()
    return this.runCommand(command)
  }

  async confirmAction(id: string, approved: boolean): Promise<CommandResult> {
    const result = await this.executor.confirm(id, approved)
    await this.handleResult(result, '')
    return result
  }

  stopSpeaking(): void {
    stopSpeaking()
    if (this.state === 'speaking') {
      this.setState(this.listening ? 'listening_wake' : 'idle')
    }
  }

  getHistory() {
    return this.memory.getHistory()
  }

  getSystemStatus(): SystemStatus {
    const cfg = getConfig()
    const whisper = getLocalWhisperStatus()
    return {
      online: isOpenAIConfigured() || cfg.ollamaEnabled,
      microphone: this.listening,
      listening: this.listening,
      speaking: isSpeaking(),
      openaiConfigured: isOpenAIConfigured(),
      ollamaEnabled: cfg.ollamaEnabled,
      sttEngine: resolveActiveSttEngine(),
      localWhisper: whisper.state
    }
  }

  async refreshSystemMetrics(): Promise<SystemStatus> {
    const metrics = await macos.getSystemMetrics()
    const status = this.getSystemStatus()
    return { ...status, cpuLoad: metrics.cpu, memoryUsed: metrics.memory }
  }

  private async runCommand(command: string): Promise<CommandResult> {
    this.setState('processing')
    this.emit('jarvis:transcript', { text: command, interim: false })

    const result = await this.executor.execute(command)
    await this.handleResult(result, command)
    return result
  }

  private async handleResult(result: CommandResult, input: string): Promise<void> {
    this.memory.addHistory({
      input: input || result.message,
      output: result.message,
      category: result.category,
      success: result.success
    })

    this.emit('jarvis:process-result', result)
    this.emit('jarvis:history', this.memory.getHistory())

    if (result.requiresConfirmation) {
      this.setState(this.listening ? 'listening_wake' : 'idle')
      await speak(result.message)
      return
    }

    const reply = result.success ? result.message : `Sir, ${result.message}`
    this.setState('speaking')
    this.emit('jarvis:state-update', { state: 'speaking', message: reply })

    try {
      await speak(reply)
    } catch (e) {
      console.error('TTS error:', e)
    }

    this.setState(this.listening ? 'listening_wake' : 'idle')
    this.broadcastStatus()
  }

  private setState(state: JarvisState): void {
    this.state = state
    this.emit('jarvis:state-update', { state })
  }

  private broadcastStatus(): void {
    void this.refreshSystemMetrics().then((s) => {
      this.emit('jarvis:system-status', s)
    })
  }

  private emit(channel: string, payload?: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload)
    }
  }
}
