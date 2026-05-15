import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(
  getWindow: () => BrowserWindow | null,
  callbacks: {
    onToggleListening: (enabled: boolean) => void
    isListening: () => boolean
    onQuit: () => void
  }
): Tray {
  const iconPath = join(__dirname, '../../resources/trayTemplate.png')
  let image: Electron.NativeImage
  try {
    image = nativeImage.createFromPath(iconPath)
    if (image.isEmpty()) throw new Error('empty')
  } catch {
    image = nativeImage.createEmpty()
  }

  image = image.resize({ width: 18, height: 18 })
  image.setTemplateImage(true)

  tray = new Tray(image)
  tray.setToolTip('JARVIS')

  const buildMenu = () => {
    const listening = callbacks.isListening()
    return Menu.buildFromTemplate([
      {
        label: 'Show JARVIS',
        click: () => {
          const win = getWindow()
          if (win) {
            win.show()
            win.focus()
          }
        }
      },
      {
        label: listening ? 'Stop Listening' : 'Start Listening',
        click: () => callbacks.onToggleListening(!listening)
      },
      { type: 'separator' },
      {
        label: 'Quit JARVIS',
        click: () => callbacks.onQuit()
      }
    ])
  }

  tray.setContextMenu(buildMenu())

  tray.on('click', () => {
    const win = getWindow()
    if (win) {
      if (win.isVisible()) win.hide()
      else {
        win.show()
        win.focus()
      }
    }
  })

  return tray
}

export function updateTrayMenu(
  callbacks: {
    onToggleListening: (enabled: boolean) => void
    isListening: () => boolean
    onQuit: () => void
  }
): void {
  if (!tray) return
  const listening = callbacks.isListening()
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show JARVIS',
        click: () => app.emit('jarvis-show' as 'ready')
      },
      {
        label: listening ? 'Stop Listening' : 'Start Listening',
        click: () => callbacks.onToggleListening(!listening)
      },
      { type: 'separator' },
      { label: 'Quit JARVIS', click: () => callbacks.onQuit() }
    ])
  )
}
