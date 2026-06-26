import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadRegistry,
  resolveProvider,
  resolveBaseUrl,
  getApiKey,
} from '../../src/providers/registry.js'

describe('loadRegistry', () => {
  it('loads and validates all built-in providers', () => {
    const registry = loadRegistry()
    expect(Object.keys(registry.providers).length).toBe(9)
  })

  it('all providers pass Zod validation', () => {
    expect(() => loadRegistry()).not.toThrow()
  })
})

describe('resolveProvider', () => {
  it('resolves by exact name', () => {
    const p = resolveProvider('deepseek')
    expect(p.name).toBe('DeepSeek')
    expect(p.registryKey).toBe('deepseek')
  })

  it('resolves alias ds -> deepseek', () => {
    const p = resolveProvider('ds')
    expect(p.registryKey).toBe('deepseek')
  })

  it('resolves alias mm -> minimax', () => {
    const p = resolveProvider('mm')
    expect(p.registryKey).toBe('minimax')
  })

  it('resolves alias sf -> stepfun', () => {
    const p = resolveProvider('sf')
    expect(p.registryKey).toBe('stepfun')
  })

  it('throws descriptive error for unknown provider', () => {
    expect(() => resolveProvider('nonexistent')).toThrow('Unknown provider "nonexistent"')
  })

  it('applies user providerOverrides', () => {
    const p = resolveProvider('deepseek', {
      keys: {},
      defaults: {},
      providerOverrides: {
        deepseek: { defaultModel: 'deepseek-v4' },
      },
    })
    expect(p.defaultModel).toBe('deepseek-v4')
  })
})

describe('resolveBaseUrl', () => {
  it('returns default baseUrl when no region specified', () => {
    const p = resolveProvider('minimax')
    expect(resolveBaseUrl(p)).toBe('https://api.minimax.io/anthropic')
  })

  it('returns china region URL for minimax + china', () => {
    const p = resolveProvider('minimax')
    expect(resolveBaseUrl(p, 'china')).toBe('https://api.minimaxi.com/anthropic')
  })

  it('returns default when region not found', () => {
    const p = resolveProvider('deepseek')
    expect(resolveBaseUrl(p, 'china')).toBe('https://api.deepseek.com/anthropic')
  })
})

describe('getApiKey', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) delete process.env[key]
    }
    Object.assign(process.env, origEnv)
  })

  it('returns env var when set', () => {
    process.env['DEEPSEEK_API_KEY'] = 'sk-env-key'
    const p = resolveProvider('deepseek')
    expect(getApiKey(p)).toBe('sk-env-key')
  })

  it('returns config key when no env var', () => {
    delete process.env['DEEPSEEK_API_KEY']
    const p = resolveProvider('deepseek')
    expect(getApiKey(p, { keys: { deepseek: 'sk-config' }, defaults: {}, providerOverrides: {} })).toBe('sk-config')
  })

  it('returns null when no key available', () => {
    delete process.env['DEEPSEEK_API_KEY']
    const p = resolveProvider('deepseek')
    expect(getApiKey(p)).toBeNull()
  })
})
