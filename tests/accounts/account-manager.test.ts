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

const tmpDir = path.join(os.tmpdir(), `ccs-accounts-test-${process.pid}`)
const credPath = path.join(tmpDir, '.credentials.json')
const accountsDir = path.join(tmpDir, 'accounts')

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('saveAccount', () => {
  it('creates account file with credentials and timestamp', async () => {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(credPath, JSON.stringify({ token: 'abc123' }))
    await saveAccount('work', credPath, accountsDir)
    const raw = JSON.parse(await fs.readFile(path.join(accountsDir, 'work.json'), 'utf-8'))
    expect((raw.credentials as { token: string }).token).toBe('abc123')
    expect(typeof raw.savedAt).toBe('string')
  })

  it('throws when credentials file missing', async () => {
    await expect(saveAccount('work', '/nonexistent/.credentials.json', accountsDir)).rejects.toThrow(
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
    await switchAccount('personal', credPath, accountsDir)
    const raw = JSON.parse(await fs.readFile(credPath, 'utf-8'))
    expect((raw as { token: string }).token).toBe('restored')
  })

  it('throws when account not found', async () => {
    await expect(switchAccount('ghost', credPath, accountsDir)).rejects.toThrow('Account "ghost" not found')
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
