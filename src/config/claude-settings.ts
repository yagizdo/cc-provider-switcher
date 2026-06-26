import fs from 'fs/promises'
import path from 'path'
import * as commentJson from 'comment-json'
import { CLAUDE_SETTINGS_FILE, getProjectSettingsPath } from '../utils/paths.js'
import { writeFileAtomically, ensureDir } from '../utils/fs.js'

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

async function readSettings(filePath: string): Promise<ClaudeSettings> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    try {
      return commentJson.parse(raw) as ClaudeSettings
    } catch {
      return JSON.parse(raw) as ClaudeSettings
    }
  } catch {
    return {}
  }
}

async function writeSettings(filePath: string, settings: ClaudeSettings): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await writeFileAtomically(filePath, JSON.stringify(settings, null, 2))
}

async function applyEnvBlock(filePath: string, envBlock: EnvBlock): Promise<void> {
  const settings = await readSettings(filePath)
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
  await writeSettings(filePath, settings)
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

  for (const p of paths) {
    const settings = await readSettings(p)
    if (!settings.env) continue
    for (const key of ENV_KEYS) delete settings.env[key]
    delete settings[CCS_MANAGED_KEY]
    await writeSettings(p, settings)
  }
}
