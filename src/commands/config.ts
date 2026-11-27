import { type Command } from 'commander'
import { initConfig } from '../config/user-config.js'

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Interactive setup: configure API keys for providers')
    .action(async () => {
      await initConfig()
    })
}
