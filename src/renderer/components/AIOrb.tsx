import { motion } from 'framer-motion'
import type { JarvisState } from '../../shared/types'
import './AIOrb.css'

interface AIOrbProps {
  state: JarvisState
  voiceLevel: number
}

export function AIOrb({ state, voiceLevel }: AIOrbProps) {
  const active = state === 'listening_wake' || state === 'listening_command' || state === 'speaking'
  const processing = state === 'processing'
  const scale = 1 + voiceLevel * 0.25

  return (
    <motion.div
      className="orb-container"
      animate={{ scale: active ? scale : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="orb-ring orb-ring-1"
        animate={{
          rotate: 360,
          scale: active ? [1, 1.08, 1] : 1,
          opacity: active ? 0.9 : 0.4
        }}
        transition={{
          rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
          scale: { duration: 2, repeat: Infinity }
        }}
      />
      <motion.div
        className="orb-ring orb-ring-2"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className={`orb-core ${state}`}
        animate={{
          boxShadow: processing
            ? '0 0 60px rgba(255, 51, 85, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.4)'
            : active
              ? '0 0 80px rgba(0, 212, 255, 0.7), inset 0 0 40px rgba(0, 136, 255, 0.5)'
              : '0 0 40px rgba(0, 136, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.2)'
        }}
      >
        <div className="orb-inner" />
      </motion.div>
      <p className="orb-label">
        {state === 'listening_wake' && 'LISTENING'}
        {state === 'listening_command' && 'AWAITING COMMAND'}
        {state === 'processing' && 'PROCESSING'}
        {state === 'speaking' && 'SPEAKING'}
        {state === 'idle' && 'STANDBY'}
        {state === 'error' && 'ERROR'}
      </p>
    </motion.div>
  )
}
