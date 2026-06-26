import { describe, it, expect, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import {
  writeUserSettings,
  readUserSettings,
  clearManagedSettings,
  CCS_MANAGED_KEY,
} from '../../src/config/claude-settings.js'

const tmpDir = path.join(os.tmpdir(), `ccs-claude-test-${process.pid}`)
const settingsPath = path.join(tmpDir, 'settings.json')
const projectSettingsPath = path.join(tmpDir, 'settings.local.json')

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('writeUserSettings', () => {
  it('creates new settings file with env block', async () => {
    await writeUserSettings(
      { ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic', ANTHROPIC_AUTH_TOKEN: 'sk-test' },
      settingsPath
    )
    const settings = await readUserSettings(settingsPath)
    expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic')
    expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBe('sk-test')
    expect(settings[CCS_MANAGED_KEY]).toBe(true)
  })

  it('preserves existing non-ccs fields', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(
      settingsPath,
      JSON.stringify({ permissions: { allow: ['*'] }, hooks: {} })
    )
    await writeUserSettings({ ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic' }, settingsPath)
    const settings = await readUserSettings(settingsPath)
    expect((settings as { permissions?: unknown }).permissions).toBeDefined()
    expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic')
  })

  it('handles JSONC settings with comments', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(settingsPath, '// Claude Code settings\n{\n  "env": {}\n}')
    await expect(
      writeUserSettings({ ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic' }, settingsPath)
    ).resolves.not.toThrow()
    const settings = await readUserSettings(settingsPath)
    expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic')
  })
})

describe('clearManagedSettings', () => {
  it('removes only ccs-managed env vars, keeps others', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        env: {
          ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
          MY_CUSTOM_VAR: 'keep-me',
        },
        ccsManaged: true,
      })
    )
    await clearManagedSettings('user', settingsPath, projectSettingsPath)
    const settings = await readUserSettings(settingsPath)
    expect(settings.env?.ANTHROPIC_BASE_URL).toBeUndefined()
    expect(settings.env?.MY_CUSTOM_VAR).toBe('keep-me')
    expect(settings[CCS_MANAGED_KEY]).toBeUndefined()
  })

  it('handles missing settings file gracefully', async () => {
    await expect(
      clearManagedSettings('user', settingsPath, projectSettingsPath)
    ).resolves.not.toThrow()
  })
})
