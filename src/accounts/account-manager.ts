import fs from 'fs/promises'
import path from 'path'
import { CCS_ACCOUNTS_DIR, CLAUDE_GLOBAL_CONFIG_FILE } from '../utils/paths.js'
import { ensureDir, writeJsonFile, readJsonFile } from '../utils/fs.js'
import { type CredentialStore, defaultCredentialStore } from './credential-store.js'

interface AccountMeta {
  name: string
  savedAt: string
  // The profile whose account and organization match the current login.
  active: boolean
}

interface AccountSnapshot {
  credentials: unknown
  // Account identity Claude Code shows and sends (email, org); lives in ~/.claude.json.
  oauthAccount?: unknown
  savedAt: string
}

export async function saveAccount(
  name: string,
  store: CredentialStore = defaultCredentialStore(),
  accountsDir = CCS_ACCOUNTS_DIR,
  claudeConfigPath = CLAUDE_GLOBAL_CONFIG_FILE
): Promise<void> {
  const raw = await store.read()
  let credentials: unknown
  try {
    credentials = JSON.parse(raw ?? '')
  } catch {
    throw new Error(`Cannot read credentials from ${store.where}. Are you logged in to Claude?`)
  }

  const claudeConfig = await readJsonFile<{ oauthAccount?: unknown }>(claudeConfigPath)
  await ensureDir(accountsDir)
  const snapshot: AccountSnapshot = {
    credentials,
    oauthAccount: claudeConfig?.oauthAccount,
    savedAt: new Date().toISOString(),
  }
  await writeJsonFile(path.join(accountsDir, `${name}.json`), snapshot, 0o600)
}

export async function switchAccount(
  name: string,
  store: CredentialStore = defaultCredentialStore(),
  accountsDir = CCS_ACCOUNTS_DIR,
  claudeConfigPath = CLAUDE_GLOBAL_CONFIG_FILE
): Promise<void> {
  const accountPath = path.join(accountsDir, `${name}.json`)
  const snapshot = await readJsonFile<AccountSnapshot>(accountPath)
  if (!snapshot) throw new Error(`Account "${name}" not found.`)

  const claudeConfig = await readJsonFile<Record<string, unknown>>(claudeConfigPath)
  await saveBackCurrent(store, accountsDir, claudeConfig?.oauthAccount)

  await store.write(JSON.stringify(snapshot.credentials))

  // Only patch a config we could parse; never replace an unreadable ~/.claude.json.
  if (snapshot.oauthAccount === undefined || !claudeConfig) return
  claudeConfig.oauthAccount = snapshot.oauthAccount
  await writeJsonFile(claudeConfigPath, claudeConfig, 0o600)
}

// Claude Code refreshes tokens in place, so the live login is newer than its saved profile.
// Copy it back before overwriting it, and refuse to overwrite a login no profile owns.
async function saveBackCurrent(
  store: CredentialStore,
  accountsDir: string,
  currentAccount: unknown
): Promise<void> {
  let credentials: unknown
  try {
    credentials = JSON.parse((await store.read()) ?? '')
  } catch {
    return // not logged in: nothing to lose
  }
  const id = accountId(currentAccount)
  if (!id) return // cannot tell which account this is

  for (const { name } of await listAccounts(accountsDir)) {
    const file = path.join(accountsDir, `${name}.json`)
    const saved = await readJsonFile<AccountSnapshot>(file)
    if (saved && accountId(saved.oauthAccount) === id) {
      const snapshot: AccountSnapshot = {
        credentials,
        oauthAccount: currentAccount,
        savedAt: new Date().toISOString(),
      }
      await writeJsonFile(file, snapshot, 0o600)
      return
    }
  }
  const email = (currentAccount as { emailAddress?: string }).emailAddress ?? id
  throw new Error(
    `The current login (${email}) is not saved in any profile and would be lost. Run "ccs account save <name>" first.`
  )
}

// One person can log in to several organizations with the same account, so match both.
function accountId(oauthAccount: unknown): string | undefined {
  const a = oauthAccount as { accountUuid?: unknown; organizationUuid?: unknown } | undefined
  return typeof a?.accountUuid === 'string' ? `${a.accountUuid}/${String(a.organizationUuid)}` : undefined
}

export async function listAccounts(
  accountsDir = CCS_ACCOUNTS_DIR,
  claudeConfigPath = CLAUDE_GLOBAL_CONFIG_FILE
): Promise<AccountMeta[]> {
  const current = accountId((await readJsonFile<{ oauthAccount?: unknown }>(claudeConfigPath))?.oauthAccount)
  try {
    const files = await fs.readdir(accountsDir)
    const accounts: AccountMeta[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const raw = await readJsonFile<{ savedAt: string; oauthAccount?: unknown }>(path.join(accountsDir, file))
      accounts.push({
        name: file.replace(/\.json$/, ''),
        savedAt: raw?.savedAt ?? '',
        active: current !== undefined && accountId(raw?.oauthAccount) === current,
      })
    }
    return accounts.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export async function deleteAccount(
  name: string,
  accountsDir = CCS_ACCOUNTS_DIR
): Promise<void> {
  const accountPath = path.join(accountsDir, `${name}.json`)
  try {
    await fs.unlink(accountPath)
  } catch {
    throw new Error(`Account "${name}" not found.`)
  }
}
