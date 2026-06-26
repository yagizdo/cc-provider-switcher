import readline from 'readline'
import { type Command } from 'commander'
import {
  saveAccount,
  switchAccount,
  listAccounts,
  deleteAccount,
} from '../accounts/account-manager.js'
import * as display from '../utils/display.js'

export function registerAccountCommand(program: Command): void {
  const account = program.command('account').description('Manage Claude Pro account credentials')

  account
    .command('save <name>')
    .description('Save current Claude credentials as a named profile')
    .action(async (name: string) => {
      try {
        await saveAccount(name)
        display.success(`Account "${name}" saved.`)
      } catch (err) {
        display.error(String(err))
        process.exit(1)
      }
    })

  account
    .command('switch <name>')
    .description('Switch to a saved account profile')
    .action(async (name: string) => {
      try {
        await switchAccount(name)
        display.success(`Switched to account "${name}".`)
      } catch (err) {
        display.error(String(err))
        process.exit(1)
      }
    })

  account
    .command('list')
    .description('List all saved account profiles')
    .action(async () => {
      const accounts = await listAccounts()
      if (accounts.length === 0) {
        display.info('No saved accounts. Run "ccs account save <name>" to save one.')
        return
      }
      display.table(accounts.map((a) => [a.name, a.savedAt]))
    })

  account
    .command('delete <name>')
    .description('Delete a saved account profile')
    .action(async (name: string) => {
      const confirmed = await confirm(`Delete account "${name}"?`)
      if (!confirmed) {
        display.info('Cancelled.')
        return
      }
      try {
        await deleteAccount(name)
        display.success(`Account "${name}" deleted.`)
      } catch (err) {
        display.error(String(err))
        process.exit(1)
      }
    })
}

function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`${prompt} [y/N] `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}
