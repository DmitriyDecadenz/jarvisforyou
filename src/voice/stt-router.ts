import { getConfig } from '../shared/config'
import type { SttEngine } from '../shared/types'
import { getLocalWhisperStatus, isLocalWhisperReady } from './local-whisper'

export function resolveActiveSttEngine(): SttEngine {
  const cfg = getConfig()

  if (cfg.sttEngine === 'webspeech') return 'webspeech'
  if (cfg.sttEngine === 'local') {
    return isLocalWhisperReady() ? 'local' : 'webspeech'
  }

  // auto: prefer local when ready
  return isLocalWhisperReady() ? 'local' : 'webspeech'
}

export function getSttStatus() {
  const cfg = getConfig()
  const whisper = getLocalWhisperStatus()
  return {
    activeEngine: resolveActiveSttEngine(),
    preferredEngine: cfg.sttEngine,
    whisper
  }
}
