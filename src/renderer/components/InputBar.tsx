import { useState, FormEvent, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import './InputBar.css'

interface InputBarProps {
  onSubmit: (text: string) => void
  onStopSpeaking: () => void
  disabled?: boolean
  placeholder?: string
}

export function InputBar({
  onSubmit,
  onStopSpeaking,
  disabled,
  placeholder = 'Type a command or question…'
}: InputBarProps) {
  const [text, setText] = useState('')

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  return (
    <motion.form className="input-bar glass" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) handleSubmit()
        }}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
      />
      <button type="submit" className="btn-primary" disabled={disabled || !text.trim()}>
        Send
      </button>
      <button type="button" className="btn-secondary" onClick={onStopSpeaking}>
        Stop
      </button>
    </motion.form>
  )
}
