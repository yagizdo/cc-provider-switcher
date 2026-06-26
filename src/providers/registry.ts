import {
  ProviderRegistrySchema,
  type Provider,
  type ProviderRegistry,
  type UserConfig,
} from '../types.js'
import rawProviders from './providers.json' with { type: 'json' }

export interface ResolvedProvider extends Provider {
  registryKey: string
}

export function loadRegistry(): ProviderRegistry {
  return ProviderRegistrySchema.parse(rawProviders)
}

export function resolveProvider(nameOrAlias: string, userConfig?: UserConfig): ResolvedProvider {
  const registry = loadRegistry()
  const key = nameOrAlias.toLowerCase()

  if (registry.providers[key]) {
    return toResolved(key, applyOverrides(key, registry.providers[key], userConfig))
  }

  for (const [name, provider] of Object.entries(registry.providers)) {
    if (provider.aliases.map((a) => a.toLowerCase()).includes(key)) {
      return toResolved(name, applyOverrides(name, provider, userConfig))
    }
  }

  const available = Object.entries(registry.providers)
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
  if (region && provider.regions?.[region]) return provider.regions[region]
  return provider.baseUrl
}

export function getApiKey(provider: ResolvedProvider, userConfig?: UserConfig): string | null {
  const envVal = process.env[provider.keyEnvVar]
  if (envVal) return envVal
  return userConfig?.keys?.[provider.registryKey] ?? null
}
