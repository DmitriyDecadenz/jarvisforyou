import { useCallback, useEffect, useRef, useState } from 'react'
import { createVadState, resampleTo16kMono } from '../utils/audio-capture'
import type { LocalWhisperStatus, SttEngine } from '../../shared/types'

type SpeechRecognitionType = typeof window extends { webkitSpeechRecognition: infer T }
  ? T
  : SpeechRecognition

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList
  resultIndex: number
}

export function useVoiceEngine(listening: boolean) {
  const [interim, setInterim] = useState('')
  const [supported, setSupported] = useState(false)
  const [sttEngine, setSttEngine] = useState<SttEngine>('webspeech')
  const [whisperStatus, setWhisperStatus] = useState<LocalWhisperStatus | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(listening)
  const sttEngineRef = useRef<SttEngine>('webspeech')
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const rafRef = useRef<number>(0)
  const pcmChunksRef = useRef<Float32Array[]>([])
  const vadRef = useRef(createVadState())
  const recordingRef = useRef(false)
  const transcribingRef = useRef(false)

  listeningRef.current = listening
  sttEngineRef.current = sttEngine

  const sendLevel = useCallback((level: number) => {
    window.jarvis?.sendVoiceLevel(level)
  }, [])

  const flushLocalTranscription = useCallback(async () => {
    if (transcribingRef.current || pcmChunksRef.current.length === 0) return
    transcribingRef.current = true

    const chunks = pcmChunksRef.current
    pcmChunksRef.current = []

    const totalLen = chunks.reduce((n, c) => n + c.length, 0)
    const merged = new Float32Array(totalLen)
    let offset = 0
    for (const c of chunks) {
      merged.set(c, offset)
      offset += c.length
    }

    setInterim('Transcribing…')
    try {
      const text = await window.jarvis.transcribeLocal(Array.from(merged))
      setInterim('')
      if (text.trim()) {
        void window.jarvis.sendTranscript(text.trim(), false)
      }
    } catch (e) {
      console.warn('[Voice] Local Whisper failed, falling back:', e)
      setInterim('')
      startWebSpeechRef.current?.()
    } finally {
      transcribingRef.current = false
    }
  }, [])

  const startWebSpeechRef = useRef<(() => void) | null>(null)

  const startWebSpeech = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    try {
      recognition.start()
    } catch {
      /* already running */
    }
  }, [])

  startWebSpeechRef.current = startWebSpeech

  const stopWebSpeech = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const stopLocalCapture = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    processorRef.current?.disconnect()
    processorRef.current = null
    analyserRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    pcmChunksRef.current = []
    recordingRef.current = false
    vadRef.current.reset()
  }, [])

  const startLocalCapture = useCallback(async () => {
    stopLocalCapture()

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1
      }
    })
    streamRef.current = stream

    const ctx = new AudioContext()
    audioContextRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)

    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (e) => {
      if (!listeningRef.current || sttEngineRef.current !== 'local') return
      const input = e.inputBuffer
      void resampleTo16kMono(input).then((samples) => {
        if (recordingRef.current) {
          pcmChunksRef.current.push(samples)
        }
      })
    }
    source.connect(processor)
    processor.connect(ctx.destination)
    processorRef.current = processor
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      if (!listeningRef.current || sttEngineRef.current !== 'local') return

      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      const level = Math.min(1, avg / 128)
      sendLevel(level)

      const vad = vadRef.current.update(level)
      if (vad === 'start') {
        pcmChunksRef.current = []
        recordingRef.current = true
        setInterim('Listening…')
      } else if (vad === 'end') {
        recordingRef.current = false
        void flushLocalTranscription()
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [stopLocalCapture, sendLevel, flushLocalTranscription])

  // Resolve STT engine + subscribe to Whisper load progress
  useEffect(() => {
    void window.jarvis.getSttStatus().then((s) => {
      setWhisperStatus(s.whisper)
      setSttEngine(s.activeEngine)
      sttEngineRef.current = s.activeEngine
      setSupported(s.activeEngine === 'local' ? s.whisper.state === 'ready' : true)
    })

    const unWhisper = window.jarvis.onWhisperStatus((ws) => {
      setWhisperStatus(ws)
      void window.jarvis.getSttStatus().then((s) => {
        setSttEngine(s.activeEngine)
        sttEngineRef.current = s.activeEngine
        setSupported(
          s.activeEngine === 'local' ? ws.state === 'ready' : Boolean(recognitionRef.current)
        )
      })
    })

    const unStt = window.jarvis.onSttReady((s) => {
      setWhisperStatus(s.whisper)
      setSttEngine(s.activeEngine)
      sttEngineRef.current = s.activeEngine
    })

    return () => {
      unWhisper()
      unStt()
    }
  }, [])

  // Web Speech API setup (fallback)
  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType })
        .webkitSpeechRecognition

    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      if (sttEngineRef.current !== 'webspeech') return

      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) finalText += transcript
        else interimText += transcript
      }

      if (interimText) {
        setInterim(interimText)
        void window.jarvis?.sendTranscript(interimText, true)
      }

      if (finalText.trim()) {
        setInterim('')
        void window.jarvis?.sendTranscript(finalText.trim(), false)
      }
    }

    recognition.onerror = (e: Event & { error?: string }) => {
      if (e.error === 'not-allowed') setSupported(false)
      if (listeningRef.current && sttEngineRef.current === 'webspeech' && e.error !== 'aborted') {
        setTimeout(() => startWebSpeech(), 500)
      }
    }

    recognition.onend = () => {
      if (listeningRef.current && sttEngineRef.current === 'webspeech') {
        startWebSpeech()
      }
    }

    recognitionRef.current = recognition
    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [startWebSpeech])

  // Start/stop listening
  useEffect(() => {
    if (!listening) {
      stopWebSpeech()
      stopLocalCapture()
      setInterim('')
      return
    }

    if (sttEngine === 'local' && whisperStatus?.state === 'ready') {
      stopWebSpeech()
      void startLocalCapture()
    } else if (sttEngine === 'webspeech') {
      stopLocalCapture()
      startWebSpeech()
    }

    return () => stopLocalCapture()
  }, [
    listening,
    sttEngine,
    whisperStatus?.state,
    startLocalCapture,
    stopLocalCapture,
    startWebSpeech,
    stopWebSpeech
  ])

  return {
    interim,
    supported,
    sttEngine,
    whisperStatus
  }
}
