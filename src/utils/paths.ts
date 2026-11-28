import os from 'os'
import path from 'path'

export const CCS_DIR = path.join(os.homedir(), '.ccs')
export const CCS_CONFIG_FILE = path.join(CCS_DIR, 'config.json')
export const CCS_ACCOUNTS_DIR = path.join(CCS_DIR, 'accounts')
// Claude Code uses the value as given (no ~ expansion, no resolve); an empty value counts as unset here.
// Settings files cannot move it, so only the process environment is read.
export const CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || undefined
export const CLAUDE_DIR = CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude')
export const CLAUDE_SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json')
export const CLAUDE_CREDENTIALS_FILE = path.join(CLAUDE_DIR, '.credentials.json')
export const CLAUDE_GLOBAL_CONFIG_FILE = path.join(CLAUDE_CONFIG_DIR ?? os.homedir(), '.claude.json')

export function getProjectSettingsPath(): string {
  return path.join(process.cwd(), '.claude', 'settings.local.json')
}

// The shared, usually committed, project file. Claude Code applies its env too; ccs never writes it.
export function getSharedProjectSettingsPath(): string {
  return path.join(process.cwd(), '.claude', 'settings.json')
}
