import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AIOrb } from './components/AIOrb'
import { VoiceVisualizer } from './components/VoiceVisualizer'
import { CommandHistory } from './components/CommandHistory'
import { StatusPanel } from './components/StatusPanel'
import { InputBar } from './components/InputBar'
import { ConfirmDialog } from './components/ConfirmDialog'
import { useVoiceEngine } from './hooks/useVoiceEngine'
import type {
  CommandResult,
  HistoryEntry,
  JarvisState,
  SystemStatus
} from '../shared/types'
import './App.css'

const defaultStatus: SystemStatus = {
  online: false,
  microphone: false,
  listening: false,
  speaking: false,
  openaiConfigured: false,
  ollamaEnabled: false
}

export default function App() {
  const [state, setState] = useState<JarvisState>('idle')
  const [listening, setListening] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [status, setStatus] = useState<SystemStatus>(defaultStatus)
  const [voiceLevel, setVoiceLevel] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState<CommandResult | null>(null)

  const { interim, supported } = useVoiceEngine(listening)

  useEffect(() => {
    void window.jarvis.getHistory().then(setHistory)
    void window.jarvis.getSystemStatus().then(setStatus)
    void window.jarvis.getState().then(setState)

    const unsubs = [
      window.jarvis.onStateUpdate(({ state: s, message }) => {
        setState(s)
        if (message) setLastResponse(message)
      }),
      window.jarvis.onProcessResult((result) => {
        if (result.requiresConfirmation) setPendingConfirm(result)
        else {
          setPendingConfirm(null)
          setLastResponse(result.message)
        }
      }),
      window.jarvis.onHistory(setHistory),
      window.jarvis.onSystemStatus(setStatus),
      window.jarvis.onTranscript(({ text, interim: isInterim }) => {
        if (isInterim) setTranscript(text)
        else setTranscript(text)
      }),
      window.jarvis.onVoiceLevel(({ level }) => setVoiceLevel(level))
    ]

    return () => unsubs.forEach((u) => u())
  }, [])

  const toggleListening = useCallback(async () => {
    const next = !listening
    const result = await window.jarvis.toggleListening(next)
    setListening(result)
  }, [listening])

  const handleSubmit = useCallback(async (text: string) => {
    setTranscript(text)
    await window.jarvis.processText(text)
  }, [])

  const handleConfirm = useCallback(
    async (approved: boolean) => {
      if (!pendingConfirm?.confirmationId) return
      await window.jarvis.confirm(pendingConfirm.confirmationId, approved)
      setPendingConfirm(null)
    },
    [pendingConfirm]
  )

  const activeVoice = listening && (state === 'listening_wake' || state === 'listening_command' || state === 'speaking')

  return (
    <div className="app">
      <div className="drag-region" />
      <motion.header className="header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="logo">
          <span className="logo-accent">J</span>ARVIS
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`listen-btn ${listening ? 'active' : ''}`}
            onClick={toggleListening}
          >
            {listening ? '● LISTENING' : '○ START VOICE'}
          </button>
          {!supported && listening && (
            <span className="warn">Speech API unavailable</span>
          )}
        </div>
      </motion.header>

      <main className="main-grid">
        <section className="center-panel">
          <AIOrb state={state} voiceLevel={voiceLevel} />
          <VoiceVisualizer level={voiceLevel} active={activeVoice} />
          <motion.div className="transcript-box glass" layout>
            <p className="transcript-label">TRANSCRIPT</p>
            <p className="transcript-text">
              {interim || transcript || lastResponse || 'Say "Hey Jarvis" or type a command…'}
            </p>
          </motion.div>
        </section>

        <aside className="side-panel">
          <StatusPanel status={status} />
          <CommandHistory entries={history} />
        </aside>
      </main>

      <InputBar
        onSubmit={handleSubmit}
        onStopSpeaking={() => void window.jarvis.stopSpeaking()}
        disabled={state === 'processing'}
      />

      <ConfirmDialog pending={pendingConfirm} onConfirm={handleConfirm} />
    </div>
  )
}
