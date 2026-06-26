import fs from 'fs/promises'
import path from 'path'
import { CCS_ACCOUNTS_DIR, CLAUDE_CREDENTIALS_FILE } from '../utils/paths.js'
import { ensureDir, writeJsonFile, readJsonFile } from '../utils/fs.js'

interface AccountMeta {
  name: string
  savedAt: string
}

export async function saveAccount(
  name: string,
  credentialsPath = CLAUDE_CREDENTIALS_FILE,
  accountsDir = CCS_ACCOUNTS_DIR
): Promise<void> {
  let credentials: unknown
  try {
    const raw = await fs.readFile(credentialsPath, 'utf-8')
    credentials = JSON.parse(raw)
  } catch {
    throw new Error(`Cannot read credentials at ${credentialsPath}. Are you logged in to Claude?`)
  }

  await ensureDir(accountsDir)
  const snapshot = { credentials, savedAt: new Date().toISOString() }
  await writeJsonFile(path.join(accountsDir, `${name}.json`), snapshot, 0o600)
}

export async function switchAccount(
  name: string,
  credentialsPath = CLAUDE_CREDENTIALS_FILE,
  accountsDir = CCS_ACCOUNTS_DIR
): Promise<void> {
  const accountPath = path.join(accountsDir, `${name}.json`)
  const snapshot = await readJsonFile<{ credentials: unknown }>(accountPath)
  if (!snapshot) throw new Error(`Account "${name}" not found.`)

  await ensureDir(path.dirname(credentialsPath))
  await writeJsonFile(credentialsPath, snapshot.credentials, 0o600)
}

export async function listAccounts(accountsDir = CCS_ACCOUNTS_DIR): Promise<AccountMeta[]> {
  try {
    const files = await fs.readdir(accountsDir)
    const accounts: AccountMeta[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const raw = await readJsonFile<{ savedAt: string }>(path.join(accountsDir, file))
      accounts.push({ name: file.replace(/\.json$/, ''), savedAt: raw?.savedAt ?? '' })
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
