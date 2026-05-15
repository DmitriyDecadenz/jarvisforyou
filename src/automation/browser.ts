import { chromium, type Browser } from 'playwright-core'
import { getConfig } from '../shared/config'
import * as macos from '../system/macos'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome'
    })
  }
  return browser
}

export async function searchGoogle(query: string): Promise<string> {
  return macos.searchGoogle(query)
}

export async function openAndSummarize(url: string): Promise<string> {
  try {
    const b = await getBrowser()
    const page = await b.newPage()
    let target = url
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 })
    const title = await page.title()
    const text = await page.evaluate(() => {
      const main =
        document.querySelector('article') ??
        document.querySelector('main') ??
        document.body
      return (main?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 3000)
    })
    await page.close()

    const cfg = getConfig()
    if (!cfg.openaiApiKey) {
      return `Page "${title}": ${text.slice(0, 400)}…`
    }

    const { chatCompletion } = await import('../ai/openai-client')
    const { MemoryStore } = await import('../ai/memory')
    const mem = new MemoryStore()
    const summary = await chatCompletion(
      mem.getConversation(),
      `Summarize this webpage in 2-3 sentences:\nTitle: ${title}\n\n${text.slice(0, 2500)}`
    )
    return summary
  } catch (e) {
    return `Could not summarize page: ${(e as Error).message}. Opening in browser instead.`
  }
}

export async function summarizePage(url?: string): Promise<string> {
  if (!url) {
    return 'Please specify a URL to summarize, sir.'
  }
  try {
    return await openAndSummarize(url)
  } catch {
    return 'Browser automation unavailable. Install Google Chrome for Playwright.'
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}
