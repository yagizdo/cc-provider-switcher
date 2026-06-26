import { type Command } from 'commander'
import { loadRegistry } from '../providers/registry.js'
import { readUserSettings, readProjectSettings } from '../config/claude-settings.js'
import * as display from '../utils/display.js'

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show current provider, model, and key status')
    .action(async () => {
      const [userSettings, projectSettings] = await Promise.all([
        readUserSettings(),
        readProjectSettings(),
      ])

      const registry = loadRegistry()

      for (const [scope, settings] of [
        ['User', userSettings],
        ['Project', projectSettings],
      ] as const) {
        const env = settings.env ?? {}
        const baseUrl = env['ANTHROPIC_BASE_URL']
        if (!baseUrl) continue

        const providerEntry = Object.entries(registry.providers).find(([, p]) =>
          baseUrl.startsWith(p.baseUrl)
        )
        const providerName = providerEntry ? providerEntry[1].name : 'Unknown'
        const model = env['ANTHROPIC_MODEL'] ?? 'unknown'
        const key = env['ANTHROPIC_AUTH_TOKEN'] ?? ''

        console.log(`\n${scope} settings:`)
        display.table([
          ['Provider', providerName],
          ['Base URL', baseUrl],
          ['Model', model],
          ['API Key', key ? display.maskKey(key) : '(not set)'],
        ])
      }

      const hasAny =
        (userSettings.env?.['ANTHROPIC_BASE_URL']) ||
        (projectSettings.env?.['ANTHROPIC_BASE_URL'])
      if (!hasAny) {
        display.info('No provider configured. Run "ccs <provider>" to switch.')
      }
    })
}
