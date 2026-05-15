import OpenAI from 'openai'
import { readFileSync } from 'fs'
import { getConfig } from '../shared/config'
import { JARVIS_SYSTEM_PROMPT } from '../shared/constants'
import type { ConversationMessage } from '../shared/types'

let client: OpenAI | null = null

export function getOpenAI(): OpenAI | null {
  const cfg = getConfig()
  if (!cfg.openaiApiKey) return null
  if (!client) client = new OpenAI({ apiKey: cfg.openaiApiKey })
  return client
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getConfig().openaiApiKey)
}

export async function chatCompletion(
  messages: ConversationMessage[],
  userMessage: string
): Promise<string> {
  const cfg = getConfig()
  const openai = getOpenAI()

  if (cfg.ollamaEnabled) {
    try {
      return await ollamaChat(messages, userMessage)
    } catch {
      /* fall through to OpenAI */
    }
  }

  if (!openai) {
    throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to .env')
  }

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: JARVIS_SYSTEM_PROMPT },
    ...messages.slice(-20).map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ]

  const response = await openai.chat.completions.create({
    model: cfg.chatModel,
    messages: apiMessages,
    max_tokens: 300,
    temperature: 0.7
  })

  return response.choices[0]?.message?.content?.trim() ?? 'I could not generate a response.'
}

async function ollamaChat(
  messages: ConversationMessage[],
  userMessage: string
): Promise<string> {
  const cfg = getConfig()
  const body = {
    model: cfg.ollamaModel,
    messages: [
      { role: 'system', content: JARVIS_SYSTEM_PROMPT },
      ...messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ],
    stream: false
  }

  const res = await fetch(`${cfg.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = (await res.json()) as { message?: { content?: string } }
  return data.message?.content?.trim() ?? 'No response from local model.'
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const openai = getOpenAI()
  if (!openai) throw new Error('OpenAI required for Whisper transcription')

  const cfg = getConfig()
  const file = readFileSync(filePath)

  const { toFile } = await import('openai/uploads')
  const response = await openai.audio.transcriptions.create({
    file: await toFile(file, 'audio.webm', { type: 'audio/webm' }),
    model: cfg.whisperModel
  })

  return response.text.trim()
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const openai = getOpenAI()
  if (!openai) throw new Error('OpenAI required for TTS')

  const cfg = getConfig()
  const response = await openai.audio.speech.create({
    model: cfg.ttsModel,
    voice: cfg.ttsVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    input: text.slice(0, 4096)
  })

  return Buffer.from(await response.arrayBuffer())
}
