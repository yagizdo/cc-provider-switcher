import { type Command } from 'commander'
import { clearManagedSettings, readUserSettings } from '../config/claude-settings.js'
import { loadUserConfig } from '../config/user-config.js'
import { describeSettings, recordPrevious, forgetPrevious } from '../config/state.js'
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

      if (scope !== 'project') {
        // Reset must still work with a broken config.json; only `ccs -` loses its way back.
        try {
          const before = describeSettings((await readUserSettings()).env ?? {}, await loadUserConfig())
          await recordPrevious(before, { kind: 'native' })
        } catch (err) {
          await forgetPrevious()
          display.warn(`Previous provider not saved, "ccs -" cannot undo this reset: ${(err as Error).message}`)
        }
      }
      await clearManagedSettings(scope)
      display.success(`Cleared ${desc} settings.`)
    })
}
