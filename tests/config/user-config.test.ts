import { describe, it, expect, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { loadUserConfig, saveUserConfig, getApiKeyForProvider } from '../../src/config/user-config.js'

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
