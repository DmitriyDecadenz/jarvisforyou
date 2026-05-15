import { execFile, spawn } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function runShell(
  command: string,
  options?: { timeout?: number; cwd?: string }
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync('/bin/zsh', ['-lc', command], {
    timeout: options?.timeout ?? 30000,
    cwd: options?.cwd,
    maxBuffer: 10 * 1024 * 1024
  })
  return { stdout: stdout.trim(), stderr: stderr.trim() }
}

export async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', script], {
    timeout: 15000
  })
  return stdout.trim()
}

export function spawnDetached(command: string, args: string[]): void {
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.unref()
}

export async function which(binary: string): Promise<boolean> {
  try {
    await execFileAsync('/usr/bin/which', [binary])
    return true
  } catch {
    return false
  }
}
