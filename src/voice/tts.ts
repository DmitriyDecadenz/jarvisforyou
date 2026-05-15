import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getConfig } from '../shared/config'
import { synthesizeSpeech } from '../ai/openai-client'

const execFileAsync = promisify(execFile)

let speakingProcess: ReturnType<typeof spawn> | null = null
let stopRequested = false

export function isSpeaking(): boolean {
  return speakingProcess !== null
}

export function stopSpeaking(): void {
  stopRequested = true
  if (speakingProcess) {
    speakingProcess.kill('SIGTERM')
    speakingProcess = null
  }
  execFileAsync('/usr/bin/killall', ['say']).catch(() => {})
}

export async function speak(text: string): Promise<void> {
  stopSpeaking()
  stopRequested = false

  const cfg = getConfig()
  const clean = text.replace(/["'`]/g, '').slice(0, 500)

  if (cfg.ttsEngine === 'openai') {
    await speakOpenAI(clean)
    return
  }

  await speakMacOS(clean, cfg.macosVoice)
}

async function speakMacOS(text: string, voice: string): Promise<void> {
  return new Promise((resolve, reject) => {
    speakingProcess = spawn('/usr/bin/say', ['-v', voice, text], {
      stdio: 'ignore'
    })

    speakingProcess.on('close', (code) => {
      speakingProcess = null
      if (stopRequested) {
        resolve()
        return
      }
      if (code === 0 || code === null) resolve()
      else reject(new Error(`say exited with code ${code}`))
    })

    speakingProcess.on('error', reject)
  })
}

async function speakOpenAI(text: string): Promise<void> {
  const buffer = await synthesizeSpeech(text)
  const dir = mkdtempSync(join(tmpdir(), 'jarvis-tts-'))
  const filePath = join(dir, 'speech.mp3')
  writeFileSync(filePath, buffer)

  return new Promise((resolve, reject) => {
    speakingProcess = spawn('/usr/bin/afplay', [filePath], { stdio: 'ignore' })

    speakingProcess.on('close', (code) => {
      speakingProcess = null
      try {
        unlinkSync(filePath)
      } catch {
        /* ignore */
      }
      if (stopRequested || code === 0 || code === null) resolve()
      else reject(new Error(`afplay exited with code ${code}`))
    })

    speakingProcess.on('error', reject)
  })
}
