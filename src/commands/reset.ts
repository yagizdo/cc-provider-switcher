import { type Command } from 'commander'
import { clearManagedSettings, readUserSettings, readProjectSettings } from '../config/claude-settings.js'
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

      // Outside the try below: a settings file ccs cannot read stops the reset before state.json changes.
      const userEnv = scope !== 'project' ? (await readUserSettings()).env ?? {} : undefined
      if (scope === 'all') await readProjectSettings()
      if (userEnv) {
        // Reset must still work with a broken config.json; only `ccs -` loses its way back.
        try {
          await recordPrevious(describeSettings(userEnv, await loadUserConfig()), { kind: 'native' })
        } catch (err) {
          await forgetPrevious()
          display.warn(`Previous provider not saved, "ccs -" cannot undo this reset: ${(err as Error).message}`)
        }
      }
      await clearManagedSettings(scope)
      display.success(`Cleared ${desc} settings.`)
    })
}
