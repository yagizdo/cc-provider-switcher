import { describe, it, expect, afterEach, vi } from 'vitest'
import os from 'os'
import path from 'path'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function load(configDir: string | undefined) {
  vi.stubEnv('CLAUDE_CONFIG_DIR', configDir)
  vi.resetModules()
  const paths = await import('../../src/utils/paths.js')
  const { keychainService } = await import('../../src/accounts/credential-store.js')
  return {
    settings: paths.CLAUDE_SETTINGS_FILE,
    credentials: paths.CLAUDE_CREDENTIALS_FILE,
    globalConfig: paths.CLAUDE_GLOBAL_CONFIG_FILE,
    keychain: keychainService(),
  }
}

describe('Claude Code paths', () => {
  // Service name measured on Claude Code 2.1.332 with CLAUDE_CONFIG_DIR=cfgA.
  it('follow CLAUDE_CONFIG_DIR like Claude Code', async () => {
    expect(await load('cfgA')).toEqual({
      settings: path.join('cfgA', 'settings.json'),
      credentials: path.join('cfgA', '.credentials.json'),
      globalConfig: path.join('cfgA', '.claude.json'),
      keychain: 'Claude Code-credentials-c4aa1b45',
    })
  })

  it.each([undefined, ''])('stay at the defaults when CLAUDE_CONFIG_DIR is %j', async (value) => {
    expect(await load(value)).toEqual({
      settings: path.join(os.homedir(), '.claude', 'settings.json'),
      credentials: path.join(os.homedir(), '.claude', '.credentials.json'),
      globalConfig: path.join(os.homedir(), '.claude.json'),
      keychain: 'Claude Code-credentials',
    })
  })
})
