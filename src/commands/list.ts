import { type Command } from 'commander'
import { loadRegistry, allProviders } from '../providers/registry.js'
import { loadUserConfig } from '../config/user-config.js'
import { type Provider } from '../types.js'
import chalk from 'chalk'

function thinkingIndicator(key: string, caps: string[] | undefined): string {
  if (!caps) return key === 'openrouter' ? 'passthrough' : ''
  if (caps.includes('adaptive_thinking')) return 'adaptive'
  if (caps.includes('thinking') && caps.includes('effort')) return 'effort'
  if (caps.includes('thinking')) return 'on/off'
  return ''
}

function printRows(title: string, providers: [string, Provider][]): void {
  console.log(chalk.bold(`\n${title}\n`))
  console.log(
    chalk.dim(
      'Name'.padEnd(14) +
        'Aliases'.padEnd(18) +
        'Default Model'.padEnd(32) +
        'Thinking'.padEnd(12) +
        'Regions'
    )
  )
  console.log(chalk.dim('─'.repeat(90)))

  for (const [key, provider] of providers) {
    const aliases = [key, ...provider.aliases].join(', ')
    const regions = provider.regions ? Object.keys(provider.regions).join(', ') : 'global'
    const thinking = thinkingIndicator(key, provider.supportedCapabilities)
    console.log(
      chalk.green(provider.name.padEnd(14)) +
        aliases.padEnd(18) +
        provider.defaultModel.padEnd(32) +
        chalk.cyan(thinking.padEnd(12)) +
        chalk.dim(regions)
    )
  }
}

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List all available providers')
    .action(async () => {
      const userConfig = await loadUserConfig()
      const builtin = loadRegistry().providers
      const all = Object.entries(allProviders(userConfig))
      printRows('Available providers:', all.filter(([key]) => key in builtin))
      const custom = all.filter(([key]) => !(key in builtin))
      if (custom.length) printRows('Custom providers (~/.ccs/config.json):', custom)
      console.log()
    })
}
