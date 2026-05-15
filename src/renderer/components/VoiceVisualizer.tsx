import { motion } from 'framer-motion'
import './VoiceVisualizer.css'

interface VoiceVisualizerProps {
  level: number
  active: boolean
}

const BARS = 24

export function VoiceVisualizer({ level, active }: VoiceVisualizerProps) {
  return (
    <motion.div
      className="visualizer"
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0.3 }}
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const offset = Math.sin((i / BARS) * Math.PI) * 0.5 + 0.5
        const height = active ? 8 + level * 48 * offset : 4
        return (
          <motion.div
            key={i}
            className="viz-bar"
            animate={{ height }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        )
      })}
    </motion.div>
  )
}
