import { type Command } from 'commander'
import { resolveProvider, resolveBaseUrl, getApiKey, withModel, CLAUDE_NATIVE_NAMES } from '../providers/registry.js'
import { loadUserConfig } from '../config/user-config.js'
import { writeUserSettings, writeProjectSettings, readUserSettings, clearManagedSettings, type ENV_KEYS } from '../config/claude-settings.js'
import { describeSettings, readPrevious, recordPrevious } from '../config/state.js'
import * as display from '../utils/display.js'

// Every key is required: `ccs run` sends the block as is, and a missing key lets a lower settings layer win.
export type FullEnvBlock = Record<(typeof ENV_KEYS)[number], string>

export async function buildEnvBlock(providerName: string, region: string | undefined, model?: string) {
  const userConfig = await loadUserConfig()
  const resolved = resolveProvider(providerName, userConfig)
  const provider = model ? withModel(resolved, model) : resolved
  const baseUrl = resolveBaseUrl(provider, region)
  // Local servers need no key, but Claude Code refuses an empty auth token.
  const apiKey = getApiKey(provider, userConfig) ?? (provider.keyOptional ? provider.registryKey : null)

  if (!apiKey) {
    display.error(
      `No API key for ${provider.name}. Set ${provider.keyEnvVar} or run "ccs config".`
    )
    process.exit(1)
  }

  const caps = provider.supportedCapabilities?.join(',') ?? ''
  const envBlock: FullEnvBlock = {
    ANTHROPIC_BASE_URL: baseUrl,
    ANTHROPIC_AUTH_TOKEN: apiKey ?? '',
    ANTHROPIC_MODEL: provider.defaultModel,
    ANTHROPIC_DEFAULT_SONNET_MODEL: provider.models.sonnet,
    ANTHROPIC_DEFAULT_OPUS_MODEL: provider.models.opus,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: provider.models.haiku,
    CLAUDE_CODE_SUBAGENT_MODEL: provider.models.sonnet,
    ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES: caps,
    ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: caps,
    ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES: caps,
  }
  return { provider, baseUrl, apiKey, envBlock, userConfig }
}

async function doSwitch(
  providerName: string,
  region: string | undefined,
  scope: 'user' | 'project',
  model?: string
): Promise<void> {
  if (CLAUDE_NATIVE_NAMES.has(providerName.toLowerCase())) {
    display.info('Claude is Claude Code\'s native default — there is nothing to switch to.')
    display.info('Run "ccs reset" to clear provider overrides and return to it.')
    return
  }

  const { provider, baseUrl, apiKey, envBlock, userConfig } = await buildEnvBlock(providerName, region, model)

  if (scope === 'project') {
    await writeProjectSettings(envBlock)
    display.success(`Switched to ${provider.name} (project-level)`)
  } else {
    // Recorded before the write: if the write then fails, "previous" is the unchanged live state and `ccs -` is a no-op.
    const before = describeSettings((await readUserSettings()).env ?? {}, userConfig)
    await recordPrevious(before, describeSettings(envBlock, userConfig))
    await writeUserSettings(envBlock)
    display.success(`Switched to ${provider.name} (user-level)`)
  }

  display.info(`Base URL: ${baseUrl}`)
  display.info(`Model: ${provider.defaultModel}`)
  if (apiKey) display.info(`Key: ${display.maskKey(apiKey)}`)
  if (provider.thinkingNote) display.info(`Thinking: ${provider.thinkingNote}`)
}

// `ccs -`, like `cd -`. User level only: the project file lives in each cwd and nothing keys a state to it.
async function switchBack(): Promise<void> {
  const previous = await readPrevious()
  if (!previous) throw new Error('No previous provider to return to. "ccs -" works after "ccs <provider>" or "ccs reset".')
  if (previous.kind === 'unknown') {
    throw new Error(`Before the last switch, ANTHROPIC_BASE_URL was ${previous.baseUrl}, which matches no provider. Nothing changed.`)
  }
  if (previous.kind === 'provider') return doSwitch(previous.provider, previous.region, 'user', previous.model)

  // No y/N as in `ccs reset`: this is the undo, and one more `ccs -` brings the provider back.
  const before = describeSettings((await readUserSettings()).env ?? {}, await loadUserConfig())
  await recordPrevious(before, previous)
  await clearManagedSettings('user')
  display.success('Switched to Claude Code\'s native default (user-level)')
}

export function registerSwitchCommand(program: Command): void {
  program
    .argument('<provider>', 'Provider name or alias')
    .argument('[region]', 'Optional region (global, china, etc.)')
    .option('-m, --model <id>', 'Use this model ID for all of sonnet/opus/haiku')
    .action(async (provider: string, region: string | undefined, opts: { model?: string }) => {
      if (provider === '-') {
        if (region || opts.model) throw new Error('"ccs -" takes no region or --model.')
        return switchBack()
      }
      await doSwitch(provider, region, 'user', opts.model)
    })

  program
    .command('project <provider> [region]')
    .description('Switch provider for current project only')
    .option('-m, --model <id>', 'Use this model ID for all of sonnet/opus/haiku')
    .action(async (provider: string, region: string | undefined, opts: { model?: string }) => {
      if (provider === '-') throw new Error('"ccs project -" is not supported: ccs only remembers the previous user-level provider.')
      await doSwitch(provider, region, 'project', opts.model)
    })
}
