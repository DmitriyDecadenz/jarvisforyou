import { runAppleScript, runShell, spawnDetached } from './shell'
import { APP_NAME_ALIASES } from '../shared/constants'

function resolveAppName(input: string): string {
  const key = input.toLowerCase().trim()
  return APP_NAME_ALIASES[key] ?? input
}

export async function openApplication(name: string): Promise<string> {
  const app = resolveAppName(name)
  await runShell(`open -a ${JSON.stringify(app)}`)
  return `Opening ${app}.`
}

export async function closeApplication(name: string): Promise<string> {
  const app = resolveAppName(name)
  await runAppleScript(`
    tell application "System Events"
      if exists (process "${app}") then
        tell process "${app}" to quit
      end if
    end tell
  `)
  return `Closed ${app}.`
}

export async function openWebsite(url: string): Promise<string> {
  let target = url.trim()
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`
  }
  await runShell(`open ${JSON.stringify(target)}`)
  return `Opening ${target}.`
}

export async function searchGoogle(query: string): Promise<string> {
  const encoded = encodeURIComponent(query)
  await runShell(`open "https://www.google.com/search?q=${encoded}"`)
  return `Searching Google for "${query}".`
}

export async function setVolume(direction: 'up' | 'down' | 'mute' | number): Promise<string> {
  if (direction === 'mute') {
    await runAppleScript('set volume output muted true')
    return 'Volume muted.'
  }
  if (direction === 'up') {
    await runAppleScript('set volume output volume ((output volume of (get volume settings)) + 10)')
    return 'Volume increased.'
  }
  if (direction === 'down') {
    await runAppleScript('set volume output volume ((output volume of (get volume settings)) - 10)')
    return 'Volume decreased.'
  }
  const level = Math.max(0, Math.min(100, direction))
  await runAppleScript(`set volume output volume ${level}`)
  return `Volume set to ${level} percent.`
}

export async function setBrightness(direction: 'up' | 'down'): Promise<string> {
  const key = direction === 'up' ? 144 : 145
  await runShell(
    `osascript -e 'tell application "System Events" to key code ${key} using {control down}'`
  )
  return `Brightness ${direction === 'up' ? 'increased' : 'decreased'}.`
}

export async function takeScreenshot(): Promise<string> {
  const path = `~/Desktop/JARVIS-${Date.now()}.png`
  await runShell(`screencapture -x ${path}`)
  return `Screenshot saved to Desktop.`
}

export async function lockScreen(): Promise<string> {
  await runShell(
    '/usr/bin/osascript -e \'tell application "System Events" to keystroke "q" using {control down, command down}\''
  )
  return 'Screen locked.'
}

export async function createFolder(name: string, parent?: string): Promise<string> {
  const base = parent ? parent.replace(/^~/, process.env.HOME ?? '') : `${process.env.HOME}/Desktop`
  const path = `${base}/${name}`.replace(/\/+/g, '/')
  await runShell(`mkdir -p ${JSON.stringify(path)}`)
  return `Created folder ${name} at ${path}.`
}

export async function createFile(name: string, parent?: string): Promise<string> {
  const base = parent ? parent.replace(/^~/, process.env.HOME ?? '') : `${process.env.HOME}/Desktop`
  const path = `${base}/${name}`.replace(/\/+/g, '/')
  await runShell(`touch ${JSON.stringify(path)}`)
  return `Created file ${name}.`
}

export async function searchFiles(query: string): Promise<string> {
  const { stdout } = await runShell(
    `mdfind -name ${JSON.stringify(query)} 2>/dev/null | head -5`
  )
  if (!stdout) return `No files found matching "${query}".`
  await runShell(`open -R ${JSON.stringify(stdout.split('\n')[0])}`)
  return `Found files. Revealed first match in Finder.`
}

export async function readClipboard(): Promise<string> {
  const { stdout } = await runShell('pbpaste')
  const preview = stdout.slice(0, 200)
  return stdout
    ? `Clipboard contains: ${preview}${stdout.length > 200 ? '…' : ''}`
    : 'Clipboard is empty.'
}

export async function runTerminalCommand(command: string): Promise<string> {
  const escaped = command.replace(/"/g, '\\"')
  spawnDetached('osascript', [
    '-e',
    `tell application "Terminal" to do script "${escaped}"`
  ])
  return `Running in Terminal: ${command}`
}

export async function shutdownMac(): Promise<string> {
  return 'CONFIRM:shutdown'
}

export async function restartMac(): Promise<string> {
  return 'CONFIRM:restart'
}

export async function executeConfirmedPowerAction(action: 'shutdown' | 'restart'): Promise<string> {
  if (action === 'shutdown') {
    await runShell('osascript -e \'tell app "System Events" to shut down\'')
    return 'Shutting down.'
  }
  await runShell('osascript -e \'tell app "System Events" to restart\'')
  return 'Restarting.'
}

export async function getSystemMetrics(): Promise<{ cpu: string; memory: string }> {
  try {
    const { stdout: mem } = await runShell(
      "vm_stat | perl -ne '/page size of (\\d+)/ and $size=$1; /Pages active:\\s+(\\d+)/ and print int($1*$size/1048576).\" MB active\"'"
    )
    const { stdout: load } = await runShell('sysctl -n vm.loadavg | awk \'{print $2}\'')
    return { cpu: `Load ${load}`, memory: mem || 'N/A' }
  } catch {
    return { cpu: 'N/A', memory: 'N/A' }
  }
}
