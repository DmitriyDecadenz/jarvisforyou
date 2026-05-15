import { motion, AnimatePresence } from 'framer-motion'
import type { CommandResult } from '../../shared/types'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  pending: CommandResult | null
  onConfirm: (approved: boolean) => void
}

export function ConfirmDialog({ pending, onConfirm }: ConfirmDialogProps) {
  if (!pending?.requiresConfirmation || !pending.confirmationId) return null

  return (
    <AnimatePresence>
      <motion.div
        className="confirm-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="confirm-dialog glass"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h4>CONFIRMATION REQUIRED</h4>
          <p>{pending.message}</p>
          <motion.div className="confirm-actions">
            <button type="button" className="btn-danger" onClick={() => onConfirm(true)}>
              Confirm
            </button>
            <button type="button" className="btn-secondary" onClick={() => onConfirm(false)}>
              Cancel
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
