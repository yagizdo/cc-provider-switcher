import path from 'path'
import { readUserSettings, readProjectSettings } from './claude-settings.js'
import { readJsonFile } from '../utils/fs.js'
import {
  CLAUDE_GLOBAL_CONFIG_FILE,
  CLAUDE_SETTINGS_FILE,
  getProjectSettingsPath,
  getSharedProjectSettingsPath,
} from '../utils/paths.js'

export type AuthOrigin = 'shell' | 'user' | 'shared' | 'local'

export interface SettingsLayer {
  from: AuthOrigin
  env?: Record<string, string | undefined>
  apiKeyHelper?: unknown
}

export interface AuthSource {
  name: string
  from: AuthOrigin
}

export interface OauthAccount {
  emailAddress?: unknown
  organizationName?: unknown
}

// Claude Code's credential order, highest first: code.claude.com/docs/en/authentication, "Authentication precedence".
const CLOUD_FLAGS = ['CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY']
const PRECEDENCE = [
  ...CLOUD_FLAGS,
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'apiKeyHelper',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_PROFILE',
  // Federation counts only together with ANTHROPIC_ORGANIZATION_ID.
  'ANTHROPIC_FEDERATION_RULE_ID',
]
// Claude Code drops claude.ai sign-in variables from project and local settings.
const USER_SCOPE_ONLY = new Set(['CLAUDE_CODE_OAUTH_TOKEN'])

const ORIGIN_LABEL: Record<AuthOrigin, string> = {
  shell: 'your shell',
  user: '~/.claude/settings.json',
  shared: '.claude/settings.json',
  local: '.claude/settings.local.json',
}

/**
 * The credential Claude Code will use, or undefined for the /login subscription.
 * Layers go lowest precedence first: shell, user, shared project, local project.
 */
export function resolveAuthSource(layers: SettingsLayer[]): AuthSource | undefined {
  const highestFirst = [...layers].reverse()
  // The highest layer that sets a variable decides it; "" cancels a lower one.
  const lookup = (name: string): AuthSource | undefined => {
    for (const layer of highestFirst) {
      if (USER_SCOPE_ONLY.has(name) && (layer.from === 'shared' || layer.from === 'local')) continue
      const value = name === 'apiKeyHelper' ? layer.apiKeyHelper : layer.env?.[name]
      if (value === undefined) continue
      const on = CLOUD_FLAGS.includes(name)
        ? typeof value === 'string' && /^(1|true|yes|on)$/i.test(value)
        : typeof value === 'string' && value !== ''
      return on ? { name, from: layer.from } : undefined
    }
    return undefined
  }
  for (const name of PRECEDENCE) {
    const source = lookup(name)
    if (!source) continue
    if (name === 'ANTHROPIC_FEDERATION_RULE_ID' && !lookup('ANTHROPIC_ORGANIZATION_ID')) continue
    return source
  }
  return undefined
}

export async function readAuthState(
  claudeConfigPath = CLAUDE_GLOBAL_CONFIG_FILE
): Promise<{ account?: OauthAccount; source?: AuthSource }> {
  const sharedPath = getSharedProjectSettingsPath()
  // Run from the home directory, the shared project file is the user file; count it once.
  const sharedIsUser = path.resolve(sharedPath) === path.resolve(CLAUDE_SETTINGS_FILE)
  const [user, shared, local, config] = await Promise.all([
    readUserSettings(),
    sharedIsUser ? {} : readProjectSettings(sharedPath),
    readProjectSettings(getProjectSettingsPath()),
    readJsonFile<{ oauthAccount?: OauthAccount }>(claudeConfigPath),
  ])
  const source = resolveAuthSource([
    { from: 'shell', env: process.env },
    { ...user, from: 'user' },
    { ...shared, from: 'shared' },
    { ...local, from: 'local' },
  ])
  const account = config?.oauthAccount
  return { account: account && typeof account === 'object' ? account : undefined, source }
}

export function describeAuthSource(source: AuthSource): string {
  const text = `${source.name} from ${ORIGIN_LABEL[source.from]}`
  // Interactive Claude Code asks once before it uses ANTHROPIC_API_KEY.
  return source.name === 'ANTHROPIC_API_KEY' ? `${text} (once approved in Claude Code)` : text
}

export function loginOverrideWarning(source: AuthSource): string {
  let fix: string
  if (source.from === 'shell') fix = `unset ${source.name} in your shell`
  else if (source.name === 'ANTHROPIC_AUTH_TOKEN' && source.from === 'user') fix = 'run "ccs reset"'
  else if (source.name === 'ANTHROPIC_AUTH_TOKEN' && source.from === 'local') fix = 'run "ccs reset --project"'
  else fix = `remove ${source.name} from ${ORIGIN_LABEL[source.from]}`
  return `Claude Code uses ${describeAuthSource(source)}, not your /login account. To use the login, ${fix}.`
}
