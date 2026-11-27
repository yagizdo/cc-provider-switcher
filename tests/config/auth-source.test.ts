import { describe, it, expect } from 'vitest'
import { resolveAuthSource, type SettingsLayer } from '../../src/config/auth-source.js'

const shell = (env: Record<string, string>): SettingsLayer => ({ from: 'shell', env })
type Settings = Omit<SettingsLayer, 'from'>
const user = (settings: Settings): SettingsLayer => ({ ...settings, from: 'user' })
const shared = (settings: Settings): SettingsLayer => ({ ...settings, from: 'shared' })
const local = (settings: Settings): SettingsLayer => ({ ...settings, from: 'local' })

describe('resolveAuthSource', () => {
  it.each<[string, SettingsLayer[], { name: string; from: string } | undefined]>([
    ['nothing set: /login', [shell({}), user({}), shared({}), local({})], undefined],
    ['shell API key', [shell({ ANTHROPIC_API_KEY: 'k' })], { name: 'ANTHROPIC_API_KEY', from: 'shell' }],
    ['settings auth token outranks shell API key', [shell({ ANTHROPIC_API_KEY: 'k' }), user({ env: { ANTHROPIC_AUTH_TOKEN: 't' } })], { name: 'ANTHROPIC_AUTH_TOKEN', from: 'user' }],
    ['local wins over user for the same variable', [user({ env: { ANTHROPIC_AUTH_TOKEN: 'u' } }), local({ env: { ANTHROPIC_AUTH_TOKEN: 'l' } })], { name: 'ANTHROPIC_AUTH_TOKEN', from: 'local' }],
    ['empty value cancels a shell export', [shell({ ANTHROPIC_AUTH_TOKEN: 't' }), local({ env: { ANTHROPIC_AUTH_TOKEN: '' } })], undefined],
    ['OAuth token ignored in project settings', [shared({ env: { CLAUDE_CODE_OAUTH_TOKEN: 'o' } }), local({ env: { CLAUDE_CODE_OAUTH_TOKEN: 'o' } })], undefined],
    ['OAuth token honoured in user settings', [user({ env: { CLAUDE_CODE_OAUTH_TOKEN: 'o' } })], { name: 'CLAUDE_CODE_OAUTH_TOKEN', from: 'user' }],
    ['apiKeyHelper below API key', [shell({ ANTHROPIC_API_KEY: 'k' }), shared({ apiKeyHelper: '/bin/key' })], { name: 'ANTHROPIC_API_KEY', from: 'shell' }],
    ['apiKeyHelper above OAuth token', [shell({ CLAUDE_CODE_OAUTH_TOKEN: 'o' }), shared({ apiKeyHelper: '/bin/key' })], { name: 'apiKeyHelper', from: 'shared' }],
    ['cloud provider outranks everything', [shell({ CLAUDE_CODE_USE_BEDROCK: '1' }), user({ env: { ANTHROPIC_AUTH_TOKEN: 't' } })], { name: 'CLAUDE_CODE_USE_BEDROCK', from: 'shell' }],
    ['cloud provider flag set to 0 is off', [shell({ CLAUDE_CODE_USE_VERTEX: '0' })], undefined],
    ['federation needs both variables', [shell({ ANTHROPIC_FEDERATION_RULE_ID: 'r' })], undefined],
    ['federation with both variables outranks /login', [shell({ ANTHROPIC_FEDERATION_RULE_ID: 'r', ANTHROPIC_ORGANIZATION_ID: 'o' })], { name: 'ANTHROPIC_FEDERATION_RULE_ID', from: 'shell' }],
  ])('%s', (_label, layers, expected) => {
    expect(resolveAuthSource(layers)).toEqual(expected)
  })
})
