import { describe, it, expect, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import {
  loadUserConfig,
  saveUserConfig,
  getApiKeyForProvider,
  addCustomProvider,
  removeCustomProvider,
} from '../../src/config/user-config.js'

const tmpDir = path.join(os.tmpdir(), `ccs-test-${process.pid}`)
const CONFIG_PATH = path.join(tmpDir, 'config.json')

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('loadUserConfig', () => {
  it('returns defaults when file missing', async () => {
    const config = await loadUserConfig(CONFIG_PATH)
    expect(config.keys).toEqual({})
    expect(config.defaults).toEqual({})
    expect(config.providerOverrides).toEqual({})
  })

  it('loads valid config correctly', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify({
        keys: { deepseek: 'sk-test' },
        defaults: { region: 'global' },
        providerOverrides: {},
      })
    )
    const config = await loadUserConfig(CONFIG_PATH)
    expect(config.keys.deepseek).toBe('sk-test')
    expect(config.defaults.region).toBe('global')
  })

  it('throws on invalid config', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(CONFIG_PATH, '{"keys": "not-an-object"}')
    await expect(loadUserConfig(CONFIG_PATH)).rejects.toThrow('Invalid config')
  })
})

describe('saveUserConfig', () => {
  it('writes config file', async () => {
    const config = {
      keys: { deepseek: 'sk-abc' },
      defaults: {},
      providerOverrides: {},
    }
    await saveUserConfig(config, CONFIG_PATH)
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    expect(JSON.parse(raw).keys.deepseek).toBe('sk-abc')
  })
})

describe('custom providers', () => {
  const existing = {
    keys: { deepseek: 'sk-keep' },
    providerOverrides: { deepseek: { defaultModel: 'deepseek-v4' } },
    customProviders: { other: { baseUrl: 'https://other.example.com', models: { sonnet: 'o-1' } } },
    unknownField: 1,
  }

  it('add and remove keep stored keys and every other field', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(CONFIG_PATH, JSON.stringify(existing))

    await addCustomProvider('mine', 'https://mine.example.com', 'm-1', CONFIG_PATH)
    expect(JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'))).toEqual({
      ...existing,
      customProviders: {
        ...existing.customProviders,
        mine: { baseUrl: 'https://mine.example.com', models: { sonnet: 'm-1', opus: 'm-1', haiku: 'm-1' } },
      },
    })

    await removeCustomProvider('mine', CONFIG_PATH)
    expect(JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'))).toEqual(existing)
  })

  it('refuses to write over a config that is not valid JSON', async () => {
    const broken = '{"keys": {"deepseek": "sk-keep",}'
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(CONFIG_PATH, broken)
    await expect(addCustomProvider('mine', 'https://mine.example.com', 'm-1', CONFIG_PATH)).rejects.toThrow(
      'not valid JSON'
    )
    expect(await fs.readFile(CONFIG_PATH, 'utf-8')).toBe(broken)
  })

  it.each([
    ['glm', [], 'built-in provider "glm"'],
    ['mine', ['ds'], 'built-in provider "deepseek"'],
    ['list', [], 'is a ccs command'],
    ['mine', ['claude'], "Claude Code's native default"],
    ['mine', ['other'], 'already used by custom provider "other"'],
  ])('rejects custom provider %s with aliases %j', async (name, aliases, message) => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify({
        customProviders: {
          other: { baseUrl: 'https://other.example.com', models: { sonnet: 'o-1' } },
          [name]: { baseUrl: 'https://mine.example.com', aliases, models: { sonnet: 'm-1' } },
        },
      })
    )
    await expect(loadUserConfig(CONFIG_PATH)).rejects.toThrow(message)
  })
})

describe('getApiKeyForProvider', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) delete process.env[key]
    }
  })

  it('env var takes priority over config', () => {
    process.env['DEEPSEEK_API_KEY'] = 'sk-env'
    const result = getApiKeyForProvider(
      'deepseek',
      { keys: { deepseek: 'sk-config' }, defaults: {}, providerOverrides: {} },
      'DEEPSEEK_API_KEY'
    )
    expect(result).toBe('sk-env')
    delete process.env['DEEPSEEK_API_KEY']
  })

  it('returns config key when no env var', () => {
    delete process.env['DEEPSEEK_API_KEY']
    const result = getApiKeyForProvider(
      'deepseek',
      { keys: { deepseek: 'sk-config' }, defaults: {}, providerOverrides: {} },
      'DEEPSEEK_API_KEY'
    )
    expect(result).toBe('sk-config')
  })

  it('returns null when neither set', () => {
    delete process.env['DEEPSEEK_API_KEY']
    const result = getApiKeyForProvider(
      'deepseek',
      { keys: {}, defaults: {}, providerOverrides: {} },
      'DEEPSEEK_API_KEY'
    )
    expect(result).toBeNull()
  })
})
