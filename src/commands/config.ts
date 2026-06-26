import { type Command } from 'commander'
import { initConfig } from '../config/user-config.js'
import * as display from '../utils/display.js'

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Interactive setup: configure API keys for providers')
    .action(async () => {
      try {
        await initConfig()
      } catch (err) {
        display.error(String(err))
        process.exit(1)
      }
    })
}
