export const JARVIS_SYSTEM_PROMPT = `You are JARVIS, an advanced AI assistant inspired by Iron Man's JARVIS.
Personality: calm, intelligent, slightly witty, professional. Keep answers short and concise (1-3 sentences unless asked for detail).
You help the user control their Mac and answer questions. When they ask to do something on their Mac, acknowledge briefly.
If you cannot perform an action directly, explain what they can say as a voice command instead.
Never pretend to execute system actions — the app handles those separately.`

export const WAKE_WORDS_DEFAULT = ['jarvis', 'hey jarvis']

export const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bsudo\s+rm\b/i,
  /\bformat\b/i,
  /\bdd\s+if=/i,
  /\bmkfs\b/i,
  />\s*\/dev\//i
]

export const APP_NAME_ALIASES: Record<string, string> = {
  safari: 'Safari',
  chrome: 'Google Chrome',
  firefox: 'Firefox',
  spotify: 'Spotify',
  'visual studio code': 'Visual Studio Code',
  vscode: 'Visual Studio Code',
  code: 'Visual Studio Code',
  terminal: 'Terminal',
  iterm: 'iTerm',
  notes: 'Notes',
  mail: 'Mail',
  messages: 'Messages',
  finder: 'Finder',
  calendar: 'Calendar',
  photos: 'Photos',
  music: 'Music',
  preview: 'Preview',
  slack: 'Slack',
  discord: 'Discord',
  zoom: 'zoom.us',
  xcode: 'Xcode'
}
