import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  globalShortcut,
  systemPreferences
} from 'electron'
import { join } from 'path'
import { JarvisCore } from './jarvis-core'

const isDev = !app.isPackaged
import { createTray } from './tray'
import { getSettings, saveSettings } from './settings-store'
import { getConfig } from '../shared/config'
import { closeBrowser } from '../automation/browser'

let mainWindow: BrowserWindow | null = null
const jarvis = new JarvisCore()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  jarvis.setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    const settings = getSettings()
    if (settings.startListening) {
      jarvis.setListening(true)
    }
  })

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle('jarvis:get-state', () => jarvis.getState())
  ipcMain.handle('jarvis:process-text', async (_, text: string) => jarvis.processText(text))
  ipcMain.handle('jarvis:confirm', async (_, id: string, approved: boolean) =>
    jarvis.confirmAction(id, approved)
  )
  ipcMain.handle('jarvis:toggle-listening', (_, enabled: boolean) => {
    jarvis.setListening(enabled)
    return jarvis.isListening()
  })
  ipcMain.handle('jarvis:stop-speaking', () => {
    jarvis.stopSpeaking()
  })
  ipcMain.handle('jarvis:get-history', () => jarvis.getHistory())
  ipcMain.handle('jarvis:get-settings', () => getSettings())
  ipcMain.handle('jarvis:save-settings', (_, partial) => saveSettings(partial))
  ipcMain.handle('jarvis:system-status', () => jarvis.refreshSystemMetrics())
  ipcMain.handle('jarvis:transcript-from-renderer', async (_, text: string, interim?: boolean) => {
    if (interim) {
      mainWindow?.webContents.send('jarvis:transcript', { text, interim: true })
      return
    }
    await jarvis.processTranscript(text, { fromWake: true })
  })
  ipcMain.handle('jarvis:open-external', (_, url: string) => shell.openExternal(url))
  ipcMain.on('jarvis:voice-level', (_, level: number) => {
    mainWindow?.webContents.send('jarvis:voice-level', { level, timestamp: Date.now() })
  })
}

function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.hide()
      else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

function requestPermissions(): void {
  if (process.platform !== 'darwin') return
  systemPreferences.askForMediaAccess('microphone').catch(() => {})
}

app.whenReady().then(() => {
  requestPermissions()
  createWindow()
  registerIpc()
  registerShortcuts()

  createTray(
    () => mainWindow,
    {
      onToggleListening: (enabled) => jarvis.setListening(enabled),
      isListening: () => jarvis.isListening(),
      onQuit: () => app.quit()
    }
  )

  const cfg = getConfig()
  if (cfg.launchAtLogin) {
    app.setLoginItemSettings({ openAtLogin: true })
  }

  app.on('activate', () => {
    mainWindow?.show()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  void closeBrowser()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
