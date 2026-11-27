import fs from 'fs/promises'
import os from 'os'
import { spawnSync } from 'child_process'
import { CLAUDE_CREDENTIALS_FILE } from '../utils/paths.js'
import { writeFileAtomically } from '../utils/fs.js'

// Where Claude Code keeps its OAuth credentials (a JSON string).
export interface CredentialStore {
  where: string
  read(): Promise<string | null>
  write(data: string): Promise<void>
}

export function fileStore(filePath: string): CredentialStore {
  return {
    where: filePath,
    async read() {
      try {
        return await fs.readFile(filePath, 'utf-8')
      } catch {
        return null
      }
    },
    async write(data) {
      await writeFileAtomically(filePath, data, 0o600)
    },
  }
}

// Same service and account names Claude Code uses on macOS (without CLAUDE_CONFIG_DIR).
const KEYCHAIN_SERVICE = 'Claude Code-credentials'
const KEYCHAIN_NOT_FOUND = 44
// `security -i` drops longer input lines.
const SECURITY_LINE_LIMIT = 4032

function keychainAccount(): string {
  let name: string
  try {
    name = process.env.USER || os.userInfo().username
  } catch {
    return 'claude-code-user'
  }
  return /^[a-zA-Z0-9._-]+$/.test(name) ? name : 'claude-code-user'
}

export function keychainStore(
  service = KEYCHAIN_SERVICE,
  account = keychainAccount()
): CredentialStore {
  return {
    where: `macOS Keychain item "${service}"`,
    async read() {
      const res = spawnSync('security', ['find-generic-password', '-a', account, '-s', service, '-w'], {
        encoding: 'utf-8',
      })
      if (res.status === KEYCHAIN_NOT_FOUND) return null
      if (res.status !== 0) {
        throw new Error(`Keychain read failed (security exit ${res.status}): ${res.stderr.trim()}`)
      }
      return res.stdout.trim()
    },
    async write(data) {
      const hex = Buffer.from(data, 'utf-8').toString('hex')
      const line = `add-generic-password -U -a "${account}" -s "${service}" -X "${hex}"\n`
      // Pass the secret on stdin so it does not show up in `ps`; fall back to argv when too long.
      const res =
        line.length <= SECURITY_LINE_LIMIT
          ? spawnSync('security', ['-i'], { input: line, encoding: 'utf-8' })
          : spawnSync('security', ['add-generic-password', '-U', '-a', account, '-s', service, '-X', hex], {
              encoding: 'utf-8',
            })
      if (res.status !== 0) {
        throw new Error(`Keychain write failed (security exit ${res.status}): ${res.stderr.trim()}`)
      }
    },
  }
}

// macOS: read the Keychain first, then the plaintext file Claude Code falls back to when the Keychain is unusable.
// Writes go to the Keychain only and fail if it is locked; Claude Code reads the Keychain before the file.
// Linux and Windows: ~/.claude/.credentials.json.
// shortcut: Windows Credential Manager (Claude Code's opt-in `tengu_windows_credman` mode) is not read; add it if that becomes the default.
export function defaultCredentialStore(platform = process.platform): CredentialStore {
  const file = fileStore(CLAUDE_CREDENTIALS_FILE)
  if (platform !== 'darwin') return file
  const keychain = keychainStore()
  return {
    where: `${keychain.where} or ${file.where}`,
    async read() {
      return (await keychain.read()) ?? (await file.read())
    },
    write: keychain.write,
  }
}
