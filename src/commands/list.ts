import { type Command } from 'commander'
import { loadRegistry } from '../providers/registry.js'
import chalk from 'chalk'

function thinkingIndicator(key: string, caps: string[] | undefined): string {
  if (!caps) return key === 'claude' ? 'native' : key === 'openrouter' ? 'passthrough' : ''
  if (caps.includes('adaptive_thinking')) return 'adaptive'
  if (caps.includes('thinking') && caps.includes('effort')) return 'effort'
  if (caps.includes('thinking')) return 'on/off'
  return ''
}

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List all available providers')
    .action(() => {
      const registry = loadRegistry()
      const providers = Object.entries(registry.providers)

      console.log(chalk.bold('\nAvailable providers:\n'))
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
      console.log()
    })
}
