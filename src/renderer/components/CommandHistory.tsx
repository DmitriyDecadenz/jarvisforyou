import { motion, AnimatePresence } from 'framer-motion'
import type { HistoryEntry } from '../../shared/types'
import './CommandHistory.css'

interface CommandHistoryProps {
  entries: HistoryEntry[]
}

export function CommandHistory({ entries }: CommandHistoryProps) {
  return (
    <div className="history-panel glass">
      <h3 className="panel-title">COMMAND LOG</h3>
      <motion.div className="history-list">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <p className="history-empty">No commands yet. Say &quot;Hey Jarvis&quot; to begin.</p>
          ) : (
            entries.slice(0, 12).map((entry) => (
              <motion.div
                key={entry.id}
                className={`history-item ${entry.success ? 'ok' : 'fail'}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="history-cat">{entry.category}</span>
                <p className="history-in">{entry.input}</p>
                <p className="history-out">{entry.output}</p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
