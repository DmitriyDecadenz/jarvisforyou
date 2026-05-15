/** Resample mono audio to 16 kHz for Whisper. */
export async function resampleTo16kMono(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const targetRate = 16000
  const channel = audioBuffer.numberOfChannels > 1 ? mixToMono(audioBuffer) : audioBuffer.getChannelData(0)

  if (audioBuffer.sampleRate === targetRate) {
    return channel.slice()
  }

  const duration = audioBuffer.duration
  const offline = new OfflineAudioContext(
    1,
    Math.ceil(duration * targetRate),
    targetRate
  )
  const buf = offline.createBuffer(1, channel.length, audioBuffer.sampleRate)
  buf.copyToChannel(channel, 0)
  const source = offline.createBufferSource()
  source.buffer = buf
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const len = buffer.length
  const out = new Float32Array(len)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < len; i++) out[i] += data[i] / buffer.numberOfChannels
  }
  return out
}

export interface VadOptions {
  speechThreshold?: number
  silenceMs?: number
  minSpeechMs?: number
  maxUtteranceMs?: number
}

/** Simple energy-based voice activity detector over analyser levels (0–1). */
export function createVadState(options: VadOptions = {}) {
  const speechThreshold = options.speechThreshold ?? 0.04
  const silenceMs = options.silenceMs ?? 1400
  const minSpeechMs = options.minSpeechMs ?? 400
  const maxUtteranceMs = options.maxUtteranceMs ?? 12000

  let speaking = false
  let speechStartedAt = 0
  let lastSpeechAt = 0
  let utteranceStartedAt = 0

  return {
    speechThreshold,
    silenceMs,
    minSpeechMs,
    maxUtteranceMs,
    get speaking() {
      return speaking
    },
    update(level: number, now = Date.now()): 'start' | 'continue' | 'end' | 'idle' {
      const isSpeech = level >= speechThreshold

      if (isSpeech) {
        lastSpeechAt = now
        if (!speaking) {
          speaking = true
          speechStartedAt = now
          utteranceStartedAt = now
          return 'start'
        }
        if (now - utteranceStartedAt >= maxUtteranceMs) {
          speaking = false
          return 'end'
        }
        return 'continue'
      }

      if (speaking) {
        const silentFor = now - lastSpeechAt
        const spokeFor = lastSpeechAt - speechStartedAt
        if (silentFor >= silenceMs && spokeFor >= minSpeechMs) {
          speaking = false
          return 'end'
        }
        return 'continue'
      }

      return 'idle'
    },
    reset(): void {
      speaking = false
      speechStartedAt = 0
      lastSpeechAt = 0
      utteranceStartedAt = 0
    }
  }
}
