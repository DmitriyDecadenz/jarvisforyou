import { v4 as uuid } from 'uuid'
import type { CommandResult, CustomCommand } from '../shared/types'
import { DANGEROUS_PATTERNS } from '../shared/constants'
import { parseCommand, type ParsedCommand } from './parser'
import * as macos from '../system/macos'
import { chatCompletion, isOpenAIConfigured } from '../ai/openai-client'
import type { MemoryStore } from '../ai/memory'
import { summarizePage } from '../automation/browser'

const pendingConfirmations = new Map<string, () => Promise<CommandResult>>()

export class CommandExecutor {
  constructor(
    private memory: MemoryStore,
    private getCustomCommands: () => CustomCommand[],
    private confirmDestructive: boolean
  ) {}

  async execute(text: string): Promise<CommandResult> {
    const custom = this.matchCustomCommand(text)
    if (custom) return custom

    const parsed = parseCommand(text)
    if (parsed) {
      return this.executeParsed(parsed)
    }

    return this.executeAI(text)
  }

  async confirm(id: string, approved: boolean): Promise<CommandResult> {
    const handler = pendingConfirmations.get(id)
    pendingConfirmations.delete(id)
    if (!handler) {
      return { success: false, message: 'Confirmation expired.', category: 'unknown' }
    }
    if (!approved) {
      return { success: true, message: 'Action cancelled, sir.', category: 'system' }
    }
    return handler()
  }

  private matchCustomCommand(text: string): CommandResult | null {
    const lower = text.toLowerCase().trim()
    for (const cmd of this.getCustomCommands()) {
      if (lower.includes(cmd.phrase.toLowerCase())) {
        return this.runCustom(cmd)
      }
    }
    return null
  }

  private async runCustom(cmd: CustomCommand): Promise<CommandResult> {
    try {
      switch (cmd.action) {
        case 'open_app':
          return ok('app', await macos.openApplication(cmd.payload))
        case 'open_url':
          return ok('web', await macos.openWebsite(cmd.payload))
        case 'shell': {
          if (this.isDangerous(cmd.payload)) {
            return this.requireConfirmation('custom-shell', async () => {
              const { runShell } = await import('../system/shell')
              const { stdout } = await runShell(cmd.payload)
              return ok('terminal', stdout || 'Command executed.')
            })
          }
          const { runShell } = await import('../system/shell')
          const { stdout } = await runShell(cmd.payload)
          return ok('terminal', stdout || 'Command executed.')
        }
        default:
          return { success: false, message: 'Unknown custom action.', category: 'custom' }
      }
    } catch (e) {
      return fail('custom', (e as Error).message)
    }
  }

  private async executeParsed(parsed: ParsedCommand): Promise<CommandResult> {
    try {
      switch (parsed.category) {
        case 'app':
          if (parsed.intent === 'open') return ok('app', await macos.openApplication(parsed.params.app))
          return ok('app', await macos.closeApplication(parsed.params.app))

        case 'web':
          if (parsed.intent === 'google') return ok('web', await macos.searchGoogle(parsed.params.query))
          if (parsed.intent === 'open_url') return ok('web', await macos.openWebsite(parsed.params.url))
          if (parsed.intent === 'summarize') {
            return ok('web', await summarizePage(parsed.params.url))
          }
          return ok('web', await macos.openWebsite(parsed.params.url))

        case 'volume': {
          if (parsed.intent === 'up') return ok('volume', await macos.setVolume('up'))
          if (parsed.intent === 'down') return ok('volume', await macos.setVolume('down'))
          if (parsed.intent === 'mute') return ok('volume', await macos.setVolume('mute'))
          return ok('volume', await macos.setVolume(parseInt(parsed.params.level, 10)))
        }

        case 'brightness':
          return ok('brightness', await macos.setBrightness(parsed.intent as 'up' | 'down'))

        case 'screenshot':
          return ok('screenshot', await macos.takeScreenshot())

        case 'system':
          if (parsed.intent === 'lock') return ok('system', await macos.lockScreen())
          if (parsed.intent === 'reminder') {
            const { createReminder } = await import('../automation/reminders')
            return ok('system', await createReminder(parsed.params.text))
          }
          break

        case 'file':
          if (parsed.intent === 'mkdir') return ok('file', await macos.createFolder(parsed.params.name))
          if (parsed.intent === 'touch') return ok('file', await macos.createFile(parsed.params.name))
          return ok('file', await macos.searchFiles(parsed.params.query))

        case 'clipboard':
          return ok('clipboard', await macos.readClipboard())

        case 'terminal': {
          const cmd = parsed.params.command
          if (this.isDangerous(cmd)) {
            return this.requireConfirmation('terminal', async () => {
              if (this.confirmDestructive) {
                return ok('terminal', await macos.runTerminalCommand(cmd))
              }
              return fail('terminal', 'Command blocked for safety.')
            })
          }
          return ok('terminal', await macos.runTerminalCommand(cmd))
        }

        case 'power':
          if (parsed.intent === 'shutdown') {
            return this.requireConfirmation('shutdown', async () =>
              ok('power', await macos.executeConfirmedPowerAction('shutdown'))
            )
          }
          return this.requireConfirmation('restart', async () =>
            ok('power', await macos.executeConfirmedPowerAction('restart'))
          )

        default:
          return fail('unknown', 'Command not recognized.')
      }
    } catch (e) {
      return fail(parsed.category, (e as Error).message)
    }

    return fail('unknown', 'Command not recognized.')
  }

  private async executeAI(text: string): Promise<CommandResult> {
    if (!isOpenAIConfigured() && !process.env.OLLAMA_ENABLED) {
      return {
        success: false,
        message: 'I am offline. Configure OPENAI_API_KEY for conversation, or use system commands.',
        category: 'ai'
      }
    }

    try {
      this.memory.addUserMessage(text)
      const reply = await chatCompletion(this.memory.getConversation(), text)
      this.memory.addAssistantMessage(reply)

      // Check if user asked to summarize current page
      if (/summarize\s+(this\s+)?(page|website|site)/i.test(text)) {
        const summary = await summarizePage()
        return ok('ai', `${reply}\n\n${summary}`)
      }

      return ok('ai', reply)
    } catch (e) {
      return fail('ai', (e as Error).message)
    }
  }

  private requireConfirmation(
    kind: string,
    handler: () => Promise<CommandResult>
  ): CommandResult {
    const id = uuid()
    pendingConfirmations.set(id, handler)
    const messages: Record<string, string> = {
      shutdown: 'Shut down the Mac? Say "confirm" or approve in the UI.',
      restart: 'Restart the Mac? Say "confirm" or approve in the UI.',
      terminal: 'This command may be dangerous. Confirm execution?',
      'custom-shell': 'Run custom shell command? Confirm execution?'
    }
    return {
      success: false,
      message: messages[kind] ?? 'Please confirm this action.',
      category: 'power',
      requiresConfirmation: true,
      confirmationId: id
    }
  }

  private isDangerous(cmd: string): boolean {
    return DANGEROUS_PATTERNS.some((p) => p.test(cmd))
  }
}

function ok(category: CommandResult['category'], message: string): CommandResult {
  return { success: true, message, category }
}

function fail(category: CommandResult['category'], message: string): CommandResult {
  return { success: false, message, category }
}
