import {
  ProviderRegistrySchema,
  type CustomProvider,
  type Provider,
  type ProviderRegistry,
  type UserConfig,
} from '../types.js'
import rawProviders from './providers.json' with { type: 'json' }

export interface ResolvedProvider extends Provider {
  registryKey: string
}

export const CLAUDE_NATIVE_NAMES = new Set(['claude', 'anthropic', 'sonnet'])

// ccs subcommands: a provider with one of these names could never be reached as `ccs <name>`. Keep in sync with cli.ts.
const COMMAND_NAMES = new Set([
  'list', 'status', 'config', 'reset', 'doctor', 'account', 'run', 'test', 'project', 'provider', 'help',
])

export function loadRegistry(): ProviderRegistry {
  return ProviderRegistrySchema.parse(rawProviders)
}

export function customProvider(key: string, entry: CustomProvider): Provider {
  const sonnet = entry.models.sonnet
  return {
    ...entry,
    name: entry.name ?? key,
    defaultModel: entry.defaultModel ?? sonnet,
    // CCS_ prefix: a plain <NAME>_API_KEY may hold a key for another service, which ccs would then send to this URL.
    keyEnvVar: entry.keyEnvVar ?? `CCS_${key.toUpperCase().replace(/-/g, '_')}_API_KEY`,
    models: { sonnet, opus: entry.models.opus ?? sonnet, haiku: entry.models.haiku ?? sonnet },
  }
}

export function allProviders(userConfig?: UserConfig): Record<string, Provider> {
  const custom = Object.entries(userConfig?.customProviders ?? {}).map(([key, entry]) => [
    key,
    customProvider(key, entry),
  ])
  return { ...loadRegistry().providers, ...Object.fromEntries(custom) }
}

// Returns the first clash as a message, or null.
export function findNameClash(custom: Record<string, CustomProvider>): string | null {
  const builtin = new Map<string, string>()
  for (const [key, p] of Object.entries(loadRegistry().providers)) {
    for (const n of [key, ...p.aliases]) builtin.set(n.toLowerCase(), key)
  }
  const seen = new Map<string, string>()
  const envVars = new Map<string, string>()
  for (const [key, entry] of Object.entries(custom)) {
    const where = `custom provider "${key}"`
    // foo-ai and foo_ai both default to CCS_FOO_AI_API_KEY: one provider's key would go to the other's URL.
    const envVar = customProvider(key, entry).keyEnvVar
    if (envVars.has(envVar)) return `${where}: key variable ${envVar} is also used by custom provider "${envVars.get(envVar)}"`
    envVars.set(envVar, key)
    for (const n of new Set([key, ...entry.aliases])) {
      if (builtin.has(n)) {
        return `${where}: "${n}" is taken by the built-in provider "${builtin.get(n)}" (use providerOverrides to change a built-in)`
      }
      if (COMMAND_NAMES.has(n)) return `${where}: "${n}" is a ccs command`
      if (CLAUDE_NATIVE_NAMES.has(n)) return `${where}: "${n}" is reserved for Claude Code's native default`
      if (seen.has(n)) return `${where}: "${n}" is already used by custom provider "${seen.get(n)}"`
      seen.set(n, key)
    }
  }
  return null
}

export function resolveProvider(nameOrAlias: string, userConfig?: UserConfig): ResolvedProvider {
  const providers = allProviders(userConfig)
  const key = nameOrAlias.toLowerCase()

  if (Object.hasOwn(providers, key)) {
    return toResolved(key, applyOverrides(key, providers[key], userConfig))
  }

  for (const [name, provider] of Object.entries(providers)) {
    if (provider.aliases.map((a) => a.toLowerCase()).includes(key)) {
      return toResolved(name, applyOverrides(name, provider, userConfig))
    }
  }

  const available = Object.entries(providers)
    .flatMap(([name, p]) => [name, ...p.aliases])
    .join(', ')
  throw new Error(`Unknown provider "${nameOrAlias}". Available: ${available}`)
}
function toResolved(key: string, provider: Provider): ResolvedProvider {
  return { ...provider, registryKey: key }
}

function applyOverrides(name: string, provider: Provider, userConfig?: UserConfig): Provider {
  if (!userConfig?.providerOverrides?.[name]) return provider
  return { ...provider, ...(userConfig.providerOverrides[name] as Partial<Provider>) }
}

export function resolveBaseUrl(provider: Provider, region?: string): string {
  if (!region) return provider.baseUrl
  if (provider.regions?.[region]) return provider.regions[region]
  // `ccs list` shows "global" for a provider without regions, so that name means its base URL.
  if (!provider.regions && region === 'global') return provider.baseUrl
  // A silent fallback would send a typo like "paln" to a different, billed endpoint.
  const names = provider.regions ? Object.keys(provider.regions).join(', ') : 'global'
  throw new Error(`Unknown region "${region}" for ${provider.name}. Regions: ${names}`)
}

export function getApiKey(provider: ResolvedProvider, userConfig?: UserConfig): string | null {
  const envVal = process.env[provider.keyEnvVar]
  if (envVal) return envVal
  return userConfig?.keys?.[provider.registryKey] ?? null
}

export function withModel<T extends Provider>(provider: T, model: string): T {
  return { ...provider, defaultModel: model, models: { sonnet: model, opus: model, haiku: model } }
}
