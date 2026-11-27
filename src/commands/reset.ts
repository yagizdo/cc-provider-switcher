import { type Command } from 'commander'
import { clearManagedSettings } from '../config/claude-settings.js'
import * as display from '../utils/display.js'

export function registerResetCommand(program: Command): void {
  program
    .command('reset')
    .description('Remove ccs-managed provider settings')
    .option('--project', 'Reset project-level settings only')
    .option('--all', 'Reset both user and project settings')
    .action(async (opts: { project?: boolean; all?: boolean }) => {
      const scope = opts.all ? 'all' : opts.project ? 'project' : 'user'
      const desc = scope === 'all' ? 'user + project' : scope

      const confirmed = await display.confirm(`Remove ccs-managed settings (${desc})?`)
      if (!confirmed) {
        display.info('Cancelled.')
        return
      }

      await clearManagedSettings(scope)
      display.success(`Cleared ${desc} settings.`)
    })
}
