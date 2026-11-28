import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { execFileSync } from 'child_process'
import { writeUserSettings, writeProjectSettings, clearManagedSettings, readUserSettings } from '../../src/config/claude-settings.js'
import { resolveProvider, resolveBaseUrl, getApiKey } from '../../src/providers/registry.js'

const tmpDir = path.join(os.tmpdir(), `ccs-switch-test-${process.pid}`)
const userSettingsPath = path.join(tmpDir, 'settings.json')
const projectSettingsPath = path.join(tmpDir, 'settings.local.json')

beforeEach(async () => {
  await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('switch to deepseek', () => {
  it('writes correct env block to user settings', async () => {
    const provider = resolveProvider('deepseek')
    const baseUrl = resolveBaseUrl(provider)
    await writeUserSettings(
      {
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_AUTH_TOKEN: 'sk-test',
        ANTHROPIC_MODEL: provider.defaultModel,
        ANTHROPIC_DEFAULT_SONNET_MODEL: provider.models.sonnet,
        ANTHROPIC_DEFAULT_OPUS_MODEL: provider.models.opus,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: provider.models.haiku,
        CLAUDE_CODE_SUBAGENT_MODEL: provider.models.sonnet,
      },
      userSettingsPath
    )
    const settings = await readUserSettings(userSettingsPath)
    expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic')
    expect(settings.env?.ANTHROPIC_MODEL).toBe('deepseek-flash')
    expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBe('sk-test')
    expect(settings.ccsManaged).toBe(true)
  })
})

describe('switch to minimax with china region', () => {
  it('uses china region URL', async () => {
    const provider = resolveProvider('minimax')
    const baseUrl = resolveBaseUrl(provider, 'china')
    await writeUserSettings({ ANTHROPIC_BASE_URL: baseUrl }, userSettingsPath)
    const settings = await readUserSettings(userSettingsPath)
    expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.minimaxi.com/anthropic')
  })
})

describe('switch to glm project-level', () => {
  it('writes to project settings', async () => {
    const provider = resolveProvider('glm')
    const baseUrl = resolveBaseUrl(provider, 'global')
    await writeProjectSettings({ ANTHROPIC_BASE_URL: baseUrl }, projectSettingsPath)
    const raw = JSON.parse(await fs.readFile(projectSettingsPath, 'utf-8'))
    expect(raw.env.ANTHROPIC_BASE_URL).toBe('https://api.z.ai/api/anthropic')
  })
})

describe('reset removes managed vars, keeps others', () => {
  it('preserves non-ccs env vars', async () => {
    await fs.writeFile(
      userSettingsPath,
      JSON.stringify({
        env: {
          ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
          MY_CUSTOM: 'keep',
        },
        ccsManaged: true,
      })
    )
    await clearManagedSettings('user', userSettingsPath, projectSettingsPath)
    const settings = await readUserSettings(userSettingsPath)
    expect(settings.env?.ANTHROPIC_BASE_URL).toBeUndefined()
    expect(settings.env?.MY_CUSTOM).toBe('keep')
  })
})

describe('capability env vars for deepseek', () => {
  it('writes supportedCapabilities to settings', async () => {
    const provider = resolveProvider('deepseek')
    const caps = provider.supportedCapabilities?.join(',') ?? ''
    await writeUserSettings(
      {
        ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES: caps,
        ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: caps,
        ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES: caps,
      },
      userSettingsPath
    )
    const settings = await readUserSettings(userSettingsPath)
    expect(settings.env?.ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES).toBe('effort,thinking')
    expect(settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES).toBe('effort,thinking')
    expect(settings.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES).toBe('effort,thinking')
  })

  it('reset clears capability env vars', async () => {
    const caps = 'effort,thinking'
    await writeUserSettings(
      {
        ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
        ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES: caps,
        ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: caps,
        ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES: caps,
      },
      userSettingsPath
    )
    await clearManagedSettings('user', userSettingsPath, projectSettingsPath)
    const settings = await readUserSettings(userSettingsPath)
    expect(settings.env?.ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES).toBeUndefined()
    expect(settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES).toBeUndefined()
  })
})

describe('ccs project <provider> -m', () => {
  // The root command's own -m used to take the option, so the project file got the default model.
  it('writes the given model to the project file', async () => {
    execFileSync(path.resolve('node_modules/.bin/tsx'), [path.resolve('src/cli.ts'), 'project', 'lmstudio', '-m', 'model-x'], {
      cwd: tmpDir,
      env: { ...process.env, HOME: tmpDir },
      stdio: 'pipe',
    })
    const raw = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude', 'settings.local.json'), 'utf-8'))
    expect(raw.env.ANTHROPIC_MODEL).toBe('model-x')
  })
})

describe('ccs -', () => {
  // A wrong reconstruction sends the user to another provider or region without a word.
  it('returns to the previous provider and region, and back again', async () => {
    const ccs = (...args: string[]) =>
      execFileSync(path.resolve('node_modules/.bin/tsx'), [path.resolve('src/cli.ts'), ...args], {
        cwd: tmpDir,
        env: { ...process.env, HOME: tmpDir, CLAUDE_CONFIG_DIR: '', GLM_API_KEY: 'glm-test-key', DEEPSEEK_API_KEY: 'ds-test-key' },
        stdio: 'pipe',
      })
    const baseUrl = async () =>
      JSON.parse(await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8')).env.ANTHROPIC_BASE_URL
    ccs('glm', 'china')
    ccs('deepseek')
    ccs('-')
    expect(await baseUrl()).toBe('https://open.bigmodel.cn/api/anthropic')
    ccs('-')
    expect(await baseUrl()).toBe('https://api.deepseek.com/anthropic')
  })
})

describe('provider override in config', () => {
  it('applies overridden model ID', () => {
    const provider = resolveProvider('deepseek', {
      keys: {},
      defaults: {},
      providerOverrides: { deepseek: { defaultModel: 'deepseek-v4' } },
    })
    expect(provider.defaultModel).toBe('deepseek-v4')
  })
})

describe('getApiKey', () => {
  it('returns config key for provider', () => {
    const provider = resolveProvider('deepseek')
    const key = getApiKey(provider, {
      keys: { deepseek: 'sk-from-config' },
      defaults: {},
      providerOverrides: {},
    })
    expect(key).toBe('sk-from-config')
  })
})
