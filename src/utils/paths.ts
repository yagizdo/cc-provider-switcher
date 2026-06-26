import os from 'os'
import path from 'path'

export const CCS_DIR = path.join(os.homedir(), '.ccs')
export const CCS_CONFIG_FILE = path.join(CCS_DIR, 'config.json')
export const CCS_ACCOUNTS_DIR = path.join(CCS_DIR, 'accounts')
export const CLAUDE_DIR = path.join(os.homedir(), '.claude')
export const CLAUDE_SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json')
export const CLAUDE_CREDENTIALS_FILE = path.join(CLAUDE_DIR, '.credentials.json')

export function getProjectSettingsPath(): string {
  return path.join(process.cwd(), '.claude', 'settings.local.json')
}
