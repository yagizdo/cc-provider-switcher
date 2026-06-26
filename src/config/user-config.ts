import readline from 'readline'
import { UserConfigSchema, type UserConfig } from '../types.js'
import { CCS_CONFIG_FILE } from '../utils/paths.js'
import { readJsonFile, writeJsonFile } from '../utils/fs.js'
import { loadRegistry } from '../providers/registry.js'

const DEFAULT_CONFIG: UserConfig = {
  keys: {},
  defaults: {},
  providerOverrides: {},
}

export async function loadUserConfig(configPath = CCS_CONFIG_FILE): Promise<UserConfig> {
  const raw = await readJsonFile<unknown>(configPath)
  if (!raw) return { ...DEFAULT_CONFIG }
  try {
    return UserConfigSchema.parse(raw)
  } catch {
    throw new Error(`Invalid config at ${configPath}. Delete it or run "ccs config" to reconfigure.`)
  }
}

export async function saveUserConfig(
  config: UserConfig,
  configPath = CCS_CONFIG_FILE
): Promise<void> {
  await writeJsonFile(configPath, config, 0o600)
}

export async function initConfig(configPath = CCS_CONFIG_FILE): Promise<void> {
  const registry = loadRegistry()
  const current = await loadUserConfig(configPath)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve))

  console.log('Configure API keys for each provider (leave blank to skip):\n')

  for (const [key, provider] of Object.entries(registry.providers)) {
    if (provider.optional) continue
    const existing = current.keys[key] ? ` [${maskKey(current.keys[key])}]` : ''
    const answer = await question(`${provider.name}${existing}: `)
    if (answer.trim()) current.keys[key] = answer.trim()
  }

  rl.close()
  await saveUserConfig(current, configPath)
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
