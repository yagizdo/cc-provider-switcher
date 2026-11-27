import { type Command } from 'commander'
import { addCustomProvider, removeCustomProvider } from '../config/user-config.js'
import { resolveProvider, loadRegistry } from '../providers/registry.js'
import { CCS_CONFIG_FILE } from '../utils/paths.js'
import * as display from '../utils/display.js'

function builtinKey(name: string): string | undefined {
  for (const [key, p] of Object.entries(loadRegistry().providers)) {
    if (key === name || p.aliases.map((a) => a.toLowerCase()).includes(name)) return key
  }
}

export function registerProviderCommand(program: Command): void {
  const provider = program.command('provider').description('Add or remove custom providers')

  provider
    .command('add <name> <baseUrl>')
    .description('Add a custom Anthropic-compatible provider')
    .requiredOption('-m, --model <id>', 'Model ID for sonnet, opus and haiku')
    .action(async (name: string, baseUrl: string, opts: { model: string }) => {
      const key = name.toLowerCase()
      const config = await addCustomProvider(key, baseUrl, opts.model)
      const added = resolveProvider(key, config)
      display.success(`Added custom provider "${key}" (${baseUrl}, model ${opts.model})`)
      display.info(`API key: set ${added.keyEnvVar} or run "ccs config". Then run "ccs test ${key}".`)
    })

  provider
    .command('remove <name>')
    .description('Remove a custom provider')
    .action(async (name: string) => {
      const key = name.toLowerCase()
      const builtin = builtinKey(key)
      if (builtin) throw new Error(`"${key}" is the built-in provider "${builtin}". Only custom providers can be removed.`)
      const { keptKey } = await removeCustomProvider(key)
      display.success(`Removed custom provider "${key}"`)
      if (keptKey) {
        display.info(`Its API key stays in ${CCS_CONFIG_FILE} under keys.${key}. Delete it there if you no longer need it; adding "${key}" again is refused while it is there.`)
      }
    })
}
