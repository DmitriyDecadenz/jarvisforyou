import { v4 as uuid } from 'uuid'
import type { ConversationMessage, HistoryEntry } from '../shared/types'

const MAX_CONVERSATION = 50
const MAX_HISTORY = 100

export class MemoryStore {
  private conversation: ConversationMessage[] = []
  private history: HistoryEntry[] = []

  addUserMessage(content: string): ConversationMessage {
    const msg: ConversationMessage = {
      id: uuid(),
      role: 'user',
      content,
      timestamp: Date.now()
    }
    this.conversation.push(msg)
    this.trimConversation()
    return msg
  }

  addAssistantMessage(content: string): ConversationMessage {
    const msg: ConversationMessage = {
      id: uuid(),
      role: 'assistant',
      content,
      timestamp: Date.now()
    }
    this.conversation.push(msg)
    this.trimConversation()
    return msg
  }

  getConversation(): ConversationMessage[] {
    return [...this.conversation]
  }

  addHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
    const full: HistoryEntry = {
      ...entry,
      id: uuid(),
      timestamp: Date.now()
    }
    this.history.unshift(full)
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY)
    }
    return full
  }

  getHistory(): HistoryEntry[] {
    return [...this.history]
  }

  clearConversation(): void {
    this.conversation = []
  }

  private trimConversation(): void {
    if (this.conversation.length > MAX_CONVERSATION) {
      this.conversation = this.conversation.slice(-MAX_CONVERSATION)
    }
  }
}
