import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
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
    expect(settings.env?.ANTHROPIC_MODEL).toBe('deepseek-chat')
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
