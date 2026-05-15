import { useCallback, useEffect, useRef, useState } from 'react'

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
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(listening)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)

  listeningRef.current = listening

  const startLevelMonitor = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = ctx
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!listeningRef.current) return
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const level = Math.min(1, avg / 128)
        window.jarvis?.sendVoiceLevel(level)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      /* mic denied */
    }
  }, [])

  const stopLevelMonitor = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
  }, [])

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setSupported(false)
      return
    }

    setSupported(true)
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
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
      if (e.error === 'not-allowed') {
        setSupported(false)
      }
      if (listeningRef.current && e.error !== 'aborted') {
        setTimeout(() => {
          try {
            recognition.start()
          } catch {
            /* already started */
          }
        }, 500)
      }
    }

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start()
        } catch {
          /* ignore */
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition || !supported) return

    if (listening) {
      try {
        recognition.start()
      } catch {
        /* already running */
      }
      void startLevelMonitor()
    } else {
      recognition.stop()
      stopLevelMonitor()
      setInterim('')
    }

    return () => stopLevelMonitor()
  }, [listening, supported, startLevelMonitor, stopLevelMonitor])

  return { interim, supported }
}
