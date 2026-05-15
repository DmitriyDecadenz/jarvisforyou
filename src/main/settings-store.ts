import Store from 'electron-store'
import type { AppSettings, CustomCommand } from '../shared/types'
import { getConfig } from '../shared/config'

const defaults = (): AppSettings => {
  const cfg = getConfig()
  return {
    wakeWords: cfg.wakeWords,
    ttsEngine: cfg.ttsEngine,
    macosVoice: cfg.macosVoice,
    confirmDestructive: cfg.confirmDestructive,
    launchAtLogin: cfg.launchAtLogin,
    startListening: cfg.startListening,
    customCommands: [],
    appPresets: {}
  }
}

export const settingsStore = new Store<AppSettings>({
  name: 'jarvis-settings',
  defaults: defaults()
})

export function getSettings(): AppSettings {
  return { ...defaults(), ...settingsStore.store }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const next = { ...current, ...partial }
  settingsStore.set(next)
  return next
}

export function getCustomCommands(): CustomCommand[] {
  return getSettings().customCommands
}
