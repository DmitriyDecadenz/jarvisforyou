import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env')
]

for (const p of envPaths) {
  if (existsSync(p)) {
    config({ path: p })
    break
  }
}

export function getConfig() {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
    whisperModel: process.env.OPENAI_WHISPER_MODEL ?? 'whisper-1',
    ttsModel: process.env.OPENAI_TTS_MODEL ?? 'tts-1',
    ttsVoice: process.env.OPENAI_TTS_VOICE ?? 'onyx',
    ollamaEnabled: process.env.OLLAMA_ENABLED === 'true',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL ?? 'llama3.2',
    ttsEngine: (process.env.JARVIS_TTS_ENGINE ?? 'macos') as 'macos' | 'openai',
    macosVoice: process.env.JARVIS_MACOS_VOICE ?? 'Daniel',
    wakeWords: (process.env.JARVIS_WAKE_WORDS ?? 'jarvis,hey jarvis')
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
    confirmDestructive: process.env.JARVIS_CONFIRM_DESTRUCTIVE !== 'false',
    launchAtLogin: process.env.JARVIS_LAUNCH_AT_LOGIN === 'true',
    startListening: process.env.JARVIS_START_LISTENING !== 'false',
    sttEngine: (process.env.JARVIS_STT_ENGINE ?? 'auto') as 'local' | 'webspeech' | 'auto',
    whisperAutoStart: process.env.JARVIS_WHISPER_AUTO_START !== 'false',
    whisperLocalModel: process.env.JARVIS_WHISPER_LOCAL_MODEL ?? 'Xenova/whisper-tiny.en',
    whisperLanguage: process.env.JARVIS_WHISPER_LANGUAGE ?? 'english'
  }
}
