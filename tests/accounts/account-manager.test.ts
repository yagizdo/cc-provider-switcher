import { describe, it, expect, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import {
  saveAccount,
  switchAccount,
  listAccounts,
  deleteAccount,
} from '../../src/accounts/account-manager.js'
import { fileStore } from '../../src/accounts/credential-store.js'

const tmpDir = path.join(os.tmpdir(), `ccs-accounts-test-${process.pid}`)
const credPath = path.join(tmpDir, '.credentials.json')
const accountsDir = path.join(tmpDir, 'accounts')
const claudeConfigPath = path.join(tmpDir, '.claude.json')

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('saveAccount', () => {
  it('creates account file with credentials and timestamp', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(credPath, JSON.stringify({ token: 'abc123' }))
    await saveAccount('work', fileStore(credPath), accountsDir, claudeConfigPath)
    const raw = JSON.parse(await fs.readFile(path.join(accountsDir, 'work.json'), 'utf-8'))
    expect((raw.credentials as { token: string }).token).toBe('abc123')
    expect(typeof raw.savedAt).toBe('string')
  })

  it('throws when credentials file missing', async () => {
    await expect(saveAccount('work', fileStore('/nonexistent/.credentials.json'), accountsDir, claudeConfigPath)).rejects.toThrow(
      'Cannot read credentials'
    )
  })
})

describe('switchAccount', () => {
  it('restores credentials from saved account', async () => {
    await fs.mkdir(accountsDir, { recursive: true })
    await fs.writeFile(
      path.join(accountsDir, 'personal.json'),
      JSON.stringify({ credentials: { token: 'restored' }, savedAt: '2026-01-01T00:00:00.000Z' })
    )
    await switchAccount('personal', fileStore(credPath), accountsDir, claudeConfigPath)
    const raw = JSON.parse(await fs.readFile(credPath, 'utf-8'))
    expect((raw as { token: string }).token).toBe('restored')
  })

  it('restores oauthAccount in ~/.claude.json and keeps its other keys', async () => {
    await fs.mkdir(accountsDir, { recursive: true })
    await fs.writeFile(
      path.join(accountsDir, 'personal.json'),
      JSON.stringify({ credentials: {}, oauthAccount: { emailAddress: 'me@home' }, savedAt: '' })
    )
    await fs.writeFile(claudeConfigPath, JSON.stringify({ projects: { a: 1 }, oauthAccount: { emailAddress: 'me@work' } }))
    await switchAccount('personal', fileStore(credPath), accountsDir, claudeConfigPath)
    const cfg = JSON.parse(await fs.readFile(claudeConfigPath, 'utf-8'))
    expect(cfg).toEqual({ projects: { a: 1 }, oauthAccount: { emailAddress: 'me@home' } })
  })

  it('saves the live login back into its profile before switching away', async () => {
    const work = { accountUuid: 'u1', organizationUuid: 'org-work', emailAddress: 'me@work' }
    await fs.mkdir(accountsDir, { recursive: true })
    await fs.writeFile(path.join(accountsDir, 'work.json'), JSON.stringify({ credentials: { token: 'old' }, oauthAccount: work, savedAt: '' }))
    await fs.writeFile(path.join(accountsDir, 'personal.json'), JSON.stringify({ credentials: { token: 'p' }, oauthAccount: {}, savedAt: '' }))
    await fs.writeFile(credPath, JSON.stringify({ token: 'refreshed' }))
    await fs.writeFile(claudeConfigPath, JSON.stringify({ oauthAccount: work }))
    await switchAccount('personal', fileStore(credPath), accountsDir, claudeConfigPath)
    const saved = JSON.parse(await fs.readFile(path.join(accountsDir, 'work.json'), 'utf-8'))
    expect(saved.credentials).toEqual({ token: 'refreshed' })
  })

  it('refuses to overwrite a login that no profile owns', async () => {
    await fs.mkdir(accountsDir, { recursive: true })
    await fs.writeFile(path.join(accountsDir, 'personal.json'), JSON.stringify({ credentials: { token: 'p' }, savedAt: '' }))
    await fs.writeFile(credPath, JSON.stringify({ token: 'unsaved' }))
    await fs.writeFile(claudeConfigPath, JSON.stringify({ oauthAccount: { accountUuid: 'u9', organizationUuid: 'o9' } }))
    await expect(switchAccount('personal', fileStore(credPath), accountsDir, claudeConfigPath)).rejects.toThrow('not saved in any profile')
    expect(JSON.parse(await fs.readFile(credPath, 'utf-8'))).toEqual({ token: 'unsaved' })
  })

  it('throws when account not found', async () => {
    await expect(switchAccount('ghost', fileStore(credPath), accountsDir, claudeConfigPath)).rejects.toThrow('Account "ghost" not found')
  })
})

describe('listAccounts', () => {
  it('returns empty array when no accounts', async () => {
    expect(await listAccounts(accountsDir)).toEqual([])
  })

  it('lists all saved accounts', async () => {
    await fs.mkdir(accountsDir, { recursive: true })
    await fs.writeFile(
      path.join(accountsDir, 'work.json'),
      JSON.stringify({ credentials: {}, savedAt: '2026-01-01T00:00:00.000Z' })
    )
    await fs.writeFile(
      path.join(accountsDir, 'home.json'),
      JSON.stringify({ credentials: {}, savedAt: '2026-01-02T00:00:00.000Z' })
    )
    const list = await listAccounts(accountsDir)
    expect(list.map((a) => a.name)).toEqual(['home', 'work'])
  })
})

describe('deleteAccount', () => {
  it('removes account file', async () => {
    await fs.mkdir(accountsDir, { recursive: true })
    await fs.writeFile(
      path.join(accountsDir, 'old.json'),
      JSON.stringify({ credentials: {}, savedAt: '' })
    )
    await deleteAccount('old', accountsDir)
    await expect(fs.access(path.join(accountsDir, 'old.json'))).rejects.toThrow()
  })

  it('throws when account not found', async () => {
    await expect(deleteAccount('ghost', accountsDir)).rejects.toThrow('Account "ghost" not found')
  })
})
