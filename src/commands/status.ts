import { type Command } from 'commander'
import { allProviders } from '../providers/registry.js'
import { loadUserConfig } from '../config/user-config.js'
import { type Provider } from '../types.js'
import { readUserSettings, readProjectSettings } from '../config/claude-settings.js'
import { readAuthState, describeAuthSource, loginOverrideWarning } from '../config/auth-source.js'
import * as display from '../utils/display.js'

// Longest prefix wins: a custom http://127.0.0.1:1234/v1 must not show as LM Studio's http://127.0.0.1:1234.
function providerFor(baseUrl: string, providers: Provider[]): Provider | undefined {
  let best: Provider | undefined
  let bestLength = -1
  for (const p of providers) {
    for (const url of [p.baseUrl, ...Object.values(p.regions ?? {})]) {
      if (baseUrl.startsWith(url) && url.length > bestLength) {
        best = p
        bestLength = url.length
      }
    }
  }
  return best
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show current provider, model, and key status')
    .action(async () => {
      const [userSettings, projectSettings] = await Promise.all([
        readUserSettings(),
        readProjectSettings(),
      ])

      const providers = Object.values(allProviders(await loadUserConfig()))

      for (const [scope, settings] of [
        ['User', userSettings],
        ['Project', projectSettings],
      ] as const) {
        const env = settings.env ?? {}
        const baseUrl = env['ANTHROPIC_BASE_URL']
        if (!baseUrl) continue

        const providerName = providerFor(baseUrl, providers)?.name ?? 'Unknown'
        const model = env['ANTHROPIC_MODEL'] ?? 'unknown'
        const key = env['ANTHROPIC_AUTH_TOKEN'] ?? ''

        console.log(`\n${scope} settings:`)
        const caps = env['ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES']
        const rows: [string, string][] = [
          ['Provider', providerName],
          ['Base URL', baseUrl],
          ['Model', model],
          ['API Key', key ? display.maskKey(key) : '(not set)'],
        ]
        if (caps) rows.push(['Capabilities', caps])
        display.table(rows)
      }

      const hasAny =
        (userSettings.env?.['ANTHROPIC_BASE_URL']) ||
        (projectSettings.env?.['ANTHROPIC_BASE_URL'])
      if (!hasAny) {
        display.info('No provider configured. Run "ccs <provider>" to switch.')
      }

      const { account, source } = await readAuthState()
      const email = typeof account?.emailAddress === 'string' ? account.emailAddress : undefined
      const org = typeof account?.organizationName === 'string' ? account.organizationName : undefined
      console.log('\nClaude account:')
      display.table([
        ['Login', email ? (org ? `${email} (${org})` : email) : 'not logged in'],
        ['Credential', source ? describeAuthSource(source) : email ? '/login' : 'none'],
      ])
      if (source && email) display.warn(loginOverrideWarning(source))
    })
}
