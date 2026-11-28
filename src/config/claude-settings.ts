import fs from 'fs/promises'
import path from 'path'
import * as commentJson from 'comment-json'
import { CLAUDE_SETTINGS_FILE, getProjectSettingsPath } from '../utils/paths.js'
import { writeFileAtomically, ensureDir } from '../utils/fs.js'
import * as display from '../utils/display.js'

export const CCS_MANAGED_KEY = 'ccsManaged'

export const ENV_KEYS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
] as const

type EnvBlock = Partial<Record<(typeof ENV_KEYS)[number], string>>

interface ClaudeSettings {
  env?: Record<string, string>
  ccsManaged?: boolean
  [key: string]: unknown
}

interface SettingsFile {
  settings: ClaudeSettings
  mode?: number
  // Parsed only after dropping comments or trailing commas, which Claude Code rejects.
  lenient: boolean
}

// Only a missing file means "no settings". A file that cannot be read or parsed must never be replaced:
// the write would keep env and drop everything else (permissions, hooks, model...).
async function loadSettings(filePath: string): Promise<SettingsFile> {
  let text: string
  let mode: number
  try {
    text = await fs.readFile(filePath, 'utf-8')
    mode = (await fs.stat(filePath)).mode & 0o777
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { settings: {}, lenient: false }
    throw new Error(`Cannot read ${filePath}: ${(err as Error).message}; ccs will not rewrite it.`)
  }
  // Claude Code reads an empty file as {}.
  if (!text.trim()) return { settings: {}, mode, lenient: false }
  let parsed: unknown
  let lenient = false
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    try {
      parsed = commentJson.parse(text, undefined, true)
      lenient = true
    } catch {
      // Only the position: V8's message quotes the text around the error, which can be part of the API key.
      const at = /line \d+ column \d+/.exec((err as Error).message)?.[0]
      throw new Error(`${filePath} is not valid JSON${at ? ` (${at})` : ''}; ccs will not rewrite it.`)
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${filePath} does not hold a JSON object; ccs will not rewrite it.`)
  }
  return { settings: parsed as ClaudeSettings, mode, lenient }
}

async function readSettings(filePath: string): Promise<ClaudeSettings> {
  return (await loadSettings(filePath)).settings
}

// Keeps the file's mode, as Claude Code does: a user who made it 0600 keeps 0600.
async function writeSettings(filePath: string, file: SettingsFile): Promise<void> {
  const mode = file.mode ?? 0o644
  await ensureDir(path.dirname(filePath))
  await writeFileAtomically(filePath, JSON.stringify(file.settings, null, 2), mode)
  // The temp file was created through the umask.
  await fs.chmod(filePath, mode)
  if (file.lenient) {
    display.warn(`${filePath} had comments or trailing commas, which Claude Code does not accept. Rewrote it as plain JSON; the comments are gone.`)
  }
}

async function applyEnvBlock(filePath: string, envBlock: EnvBlock): Promise<void> {
  const file = await loadSettings(filePath)
  const settings = file.settings
  const env = { ...(settings.env ?? {}) }
  for (const [k, v] of Object.entries(envBlock)) {
    if (v === '') {
      delete env[k]
    } else if (v !== undefined) {
      env[k] = v
    }
  }
  settings.env = env
  settings[CCS_MANAGED_KEY] = true
  await writeSettings(filePath, file)
}

export async function readUserSettings(filePath = CLAUDE_SETTINGS_FILE): Promise<ClaudeSettings> {
  return readSettings(filePath)
}

export async function writeUserSettings(
  envBlock: EnvBlock,
  filePath = CLAUDE_SETTINGS_FILE
): Promise<void> {
  await applyEnvBlock(filePath, envBlock)
}

export async function readProjectSettings(
  filePath = getProjectSettingsPath()
): Promise<ClaudeSettings> {
  return readSettings(filePath)
}

export async function writeProjectSettings(
  envBlock: EnvBlock,
  filePath = getProjectSettingsPath()
): Promise<void> {
  await applyEnvBlock(filePath, envBlock)
}

export async function clearManagedSettings(
  scope: 'user' | 'project' | 'all',
  userSettingsPath = CLAUDE_SETTINGS_FILE,
  projectSettingsPath = getProjectSettingsPath()
): Promise<void> {
  const paths: string[] = []
  if (scope === 'user' || scope === 'all') paths.push(userSettingsPath)
  if (scope === 'project' || scope === 'all') paths.push(projectSettingsPath)

  // Every file is read before any is written, so one broken file leaves all of them as they were.
  const files = await Promise.all(paths.map(async (p) => [p, await loadSettings(p)] as const))
  for (const [p, file] of files) {
    const { settings } = file
    if (!settings.env) continue
    for (const key of ENV_KEYS) delete settings.env[key]
    delete settings[CCS_MANAGED_KEY]
    await writeSettings(p, file)
  }
}
