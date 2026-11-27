import fs from 'fs/promises'
import readline from 'readline'
import { type z } from 'zod'
import { UserConfigSchema, type UserConfig } from '../types.js'
import { CCS_CONFIG_FILE } from '../utils/paths.js'
import { writeFileAtomically, writeJsonFile } from '../utils/fs.js'
import { allProviders, findNameClash } from '../providers/registry.js'

type RawConfig = Record<string, unknown>

const DEFAULT_CONFIG: UserConfig = {
  keys: {},
  defaults: {},
  providerOverrides: {},
}

// Only a missing file means "no config". A file that cannot be read or parsed must never be replaced by defaults:
// the next write would erase every stored key.
async function readRawConfig(configPath: string): Promise<{ raw: RawConfig; text: string } | null> {
  let text: string
  try {
    text = await fs.readFile(configPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw new Error(`Cannot read config at ${configPath}: ${(err as Error).message}`)
  }
  try {
    return { raw: JSON.parse(text) as RawConfig, text }
  } catch (err) {
    // Only the position: V8's message quotes the text around the error, which can be part of a key.
    const at = /line \d+ column \d+/.exec((err as Error).message)?.[0]
    throw new Error(`Config at ${configPath} is not valid JSON${at ? ` (${at})` : ''}. Fix it by hand.`)
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    // A bad record key carries the real reason (the name rule) in its nested issues.
    .map((i) => {
      const message = i.code === 'invalid_key' ? i.issues.map((n) => n.message).join(', ') : i.message
      return (i.path.length ? `${i.path.map(String).join('.')}: ` : '') + message
    })
    .join('; ')
}

function parseConfig(raw: unknown, prefix: string): UserConfig {
  const result = UserConfigSchema.safeParse(raw)
  if (!result.success) throw new Error(`${prefix}: ${formatIssues(result.error)}`)
  const clash = findNameClash(result.data.customProviders ?? {})
  if (clash) throw new Error(`${prefix}: ${clash}`)
  return result.data
}

export async function loadUserConfig(configPath = CCS_CONFIG_FILE): Promise<UserConfig> {
  const file = await readRawConfig(configPath)
  if (!file) return { ...DEFAULT_CONFIG }
  return parseConfig(file.raw, `Invalid config at ${configPath}`)
}

export async function saveUserConfig(
  config: UserConfig,
  configPath = CCS_CONFIG_FILE
): Promise<void> {
  await writeJsonFile(configPath, config, 0o600)
}

// Edits the file as written, not the parsed config, so fields ccs does not know and unset defaults stay as they are.
async function updateUserConfig(
  mutate: (raw: RawConfig) => void,
  configPath: string
): Promise<UserConfig> {
  const file = await readRawConfig(configPath)
  const raw = file?.raw ?? {}
  parseConfig(raw, `Invalid config at ${configPath}`)
  mutate(raw)
  const config = parseConfig(raw, 'Not saved')
  const newline = file?.text.endsWith('\n') ? '\n' : ''
  await writeFileAtomically(configPath, JSON.stringify(raw, null, 2) + newline, 0o600)
  return config
}

export async function addCustomProvider(
  name: string,
  baseUrl: string,
  model: string,
  configPath = CCS_CONFIG_FILE
): Promise<UserConfig> {
  return updateUserConfig((raw) => {
    const custom = (raw.customProviders ??= {}) as RawConfig
    if (Object.hasOwn(custom, name)) {
      throw new Error(`Custom provider "${name}" already exists in ${configPath}. Remove it first, or edit it there.`)
    }
    // Left over from an earlier provider of this name: the key or a baseUrl override would go to the new URL.
    for (const field of ['keys', 'providerOverrides']) {
      if (Object.hasOwn((raw[field] ?? {}) as RawConfig, name)) {
        throw new Error(`${configPath} still has ${field}.${name} from an earlier provider. Delete it there first, so it is not sent to the new URL.`)
      }
    }
    custom[name] = { baseUrl, models: { sonnet: model, opus: model, haiku: model } }
  }, configPath)
}

// The stored key stays: many providers show a key only once, and a mistaken remove should not lose it.
export async function removeCustomProvider(
  name: string,
  configPath = CCS_CONFIG_FILE
): Promise<{ keptKey: boolean }> {
  let keptKey = false
  await updateUserConfig((raw) => {
    const custom = raw.customProviders as RawConfig | undefined
    if (!custom || !Object.hasOwn(custom, name)) throw new Error(`No custom provider "${name}" in ${configPath}.`)
    delete custom[name]
    keptKey = Object.hasOwn((raw.keys ?? {}) as RawConfig, name)
  }, configPath)
  return { keptKey }
}

export async function initConfig(configPath = CCS_CONFIG_FILE): Promise<void> {
  const current = await loadUserConfig(configPath)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve))

  console.log('Configure API keys for each provider (leave blank to skip):\n')

  const answers: Record<string, string> = {}
  for (const [key, provider] of Object.entries(allProviders(current))) {
    const existing = current.keys[key] ? ` [${maskKey(current.keys[key])}]` : ''
    const answer = await question(`${provider.name}${existing}: `)
    if (answer.trim()) answers[key] = answer.trim()
  }

  rl.close()
  await updateUserConfig((raw) => {
    raw.keys = { ...(raw.keys as RawConfig | undefined), ...answers }
  }, configPath)
  console.log(`\nConfig saved to ${configPath}`)
}
function maskKey(key: string): string {
  if (key.length <= 8) return '***'
  return key.slice(0, 4) + '...' + key.slice(-4)
}

export function getApiKeyForProvider(
  providerKey: string,
  userConfig: UserConfig,
  envVar: string
): string | null {
  return process.env[envVar] ?? userConfig.keys[providerKey] ?? null
}
