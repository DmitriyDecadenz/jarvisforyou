import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { getConfig } from '../shared/config'
import type { LocalWhisperStatus } from '../shared/types'

export type { LocalWhisperStatus } from '../shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null
let status: LocalWhisperStatus = {
  state: 'disabled',
  model: '',
  message: 'Not started'
}

type ProgressCallback = (status: LocalWhisperStatus) => void
let onProgress: ProgressCallback | null = null

export function getLocalWhisperStatus(): LocalWhisperStatus {
  return { ...status }
}

export function setLocalWhisperProgressCallback(cb: ProgressCallback | null): void {
  onProgress = cb
}

function setStatus(next: Partial<LocalWhisperStatus>): void {
  status = { ...status, ...next }
  onProgress?.(getLocalWhisperStatus())
}

/** Preload Whisper model when the app starts (runs in main process). */
export async function startLocalWhisper(): Promise<LocalWhisperStatus> {
  const cfg = getConfig()

  if (!cfg.whisperAutoStart) {
    setStatus({ state: 'disabled', message: 'Local Whisper auto-start disabled' })
    return getLocalWhisperStatus()
  }

  if (status.state === 'ready' && transcriber) return getLocalWhisperStatus()
  if (status.state === 'loading') return getLocalWhisperStatus()

  const modelId = cfg.whisperLocalModel
  setStatus({
    state: 'loading',
    model: modelId,
    message: 'Downloading / loading Whisper model…',
    progress: 0
  })

  try {
    const { env, pipeline } = await import('@xenova/transformers')

    const cacheDir = join(app.getPath('userData'), 'whisper-models')
    mkdirSync(cacheDir, { recursive: true })

    env.allowLocalModels = true
    env.useBrowserCache = false
    env.cacheDir = cacheDir

    setStatus({ message: 'Initializing Whisper pipeline…', progress: 0.2 })

    transcriber = await pipeline('automatic-speech-recognition', modelId, {
      progress_callback: (data: { status: string; progress?: number; file?: string }) => {
        if (data.status === 'progress' && typeof data.progress === 'number') {
          setStatus({
            message: `Loading ${data.file ?? 'model'}…`,
            progress: 0.2 + data.progress * 0.7
          })
        }
      }
    })

    setStatus({
      state: 'ready',
      message: 'Local Whisper ready',
      progress: 1
    })

    return getLocalWhisperStatus()
  } catch (e) {
    const msg = (e as Error).message
    console.error('[LocalWhisper] Failed to start:', msg)
    transcriber = null
    setStatus({
      state: 'error',
      message: msg,
      progress: undefined
    })
    return getLocalWhisperStatus()
  }
}

/** Transcribe 16 kHz mono PCM (Float32Array). */
export async function transcribeLocal(samples: Float32Array): Promise<string> {
  if (!transcriber || status.state !== 'ready') {
    throw new Error('Local Whisper is not ready')
  }

  if (samples.length < 1600) {
    return ''
  }

  const cfg = getConfig()
  const result = await transcriber(samples, {
    sampling_rate: 16000,
    language: cfg.whisperLanguage,
    task: 'transcribe',
    return_timestamps: false
  })

  const text =
    typeof result === 'string'
      ? result
      : ((result?.text as string) ?? (result?.chunks?.[0]?.text as string) ?? '')

  return text.trim()
}

export function isLocalWhisperReady(): boolean {
  return status.state === 'ready' && transcriber !== null
}

export async function stopLocalWhisper(): Promise<void> {
  transcriber = null
  setStatus({
    state: 'disabled',
    message: 'Stopped',
    progress: undefined
  })
}
