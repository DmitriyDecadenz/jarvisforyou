import { motion } from 'framer-motion'
import type { SystemStatus } from '../../shared/types'
import './StatusPanel.css'

interface StatusPanelProps {
  status: SystemStatus
}

function Dot({ on }: { on: boolean }) {
  return <span className={`status-dot ${on ? 'on' : 'off'}`} />
}

export function StatusPanel({ status }: StatusPanelProps) {
  return (
    <motion.div className="status-panel glass" layout>
      <h3 className="panel-title">SYSTEM STATUS</h3>
      <ul className="status-list">
        <li>
          <Dot on={status.online} /> AI {status.online ? 'Online' : 'Offline'}
        </li>
        <li>
          <Dot on={status.listening} /> Voice {status.listening ? 'Active' : 'Idle'}
        </li>
        <li>
          <Dot on={status.openaiConfigured} /> OpenAI{' '}
          {status.openaiConfigured ? 'Connected' : 'Not configured'}
        </li>
        <li>
          <Dot on={status.ollamaEnabled} /> Ollama {status.ollamaEnabled ? 'Enabled' : 'Off'}
        </li>
        <li>
          <Dot on={status.sttEngine === 'local' && status.localWhisper === 'ready'} /> STT{' '}
          {status.sttEngine === 'local'
            ? `Local Whisper (${status.localWhisper ?? '…'})`
            : 'Web Speech (fallback)'}
        </li>
        {status.cpuLoad && (
          <li className="metric">
            CPU <span>{status.cpuLoad}</span>
          </li>
        )}
        {status.memoryUsed && (
          <li className="metric">
            Memory <span>{status.memoryUsed}</span>
          </li>
        )}
      </ul>
    </motion.div>
  )
}
