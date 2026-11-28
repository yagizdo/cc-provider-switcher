import { type Command } from 'commander'
import { resolveProvider, resolveBaseUrl, getApiKey, withModel, allProviders, loadRegistry, CLAUDE_NATIVE_NAMES } from '../providers/registry.js'
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
  return switchToNative()
}

async function switchToNative(): Promise<void> {
  const before = describeSettings((await readUserSettings()).env ?? {}, await loadUserConfig())
  await recordPrevious(before, { kind: 'native' })
  await clearManagedSettings('user')
  display.success('Switched to Claude Code\'s native default (user-level)')
}

// Bare `ccs`. Both ends must be a terminal: keys come from stdin and the list is drawn on stdout.
async function pickAndSwitch(program: Command): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) program.help({ error: true })

  const userConfig = await loadUserConfig()
  const current = describeSettings((await readUserSettings()).env ?? {}, userConfig)
  const builtin = loadRegistry().providers
  const keys = Object.keys(allProviders(userConfig))
  const resolved = keys.map((key) => resolveProvider(key, userConfig))
  const modelWidth = Math.max(...resolved.map((p) => p.defaultModel.length)) + 2
  const rows = resolved.map((p) => {
    const key = p.registryKey
    // Same rule as buildEnvBlock, so a row without "no key" never fails for a missing key.
    const hasKey = getApiKey(p, userConfig) !== null || !!p.keyOptional
    const tags = [current.kind === 'provider' && current.provider === key && 'current', !hasKey && 'no key']
    return {
      label: p.name,
      hint: (p.defaultModel.padEnd(modelWidth) + tags.filter(Boolean).join(', ')).trimEnd(),
      group: key in builtin ? undefined : 'Custom providers (~/.ccs/config.json)',
      dim: !hasKey,
      hasKey,
    }
  })
  const items = [{ label: 'Claude (native default)', hint: current.kind === 'native' ? 'current' : undefined }, ...rows]
  const at = current.kind === 'native' ? 0 : current.kind === 'provider' ? keys.indexOf(current.provider) + 1 : 1
  const title = current.kind === 'unknown'
    ? `Now on ${current.baseUrl}, which matches no provider. Switch to:`
    : 'Switch Claude Code to (user-level):'

  const picked = await display.select(title, items, at)
  if (picked === null) return
  if (picked === 0) return switchToNative()

  const key = keys[picked - 1]
  const provider = resolved[picked - 1]
  const named = Object.entries(provider.regions ?? {})
  // A base URL that is none of the regions (custom provider, override) gets its own row, or the list could never reach it.
  const regions: [string | undefined, string][] = named.some(([, url]) => url === provider.baseUrl)
    ? named
    : [[undefined, provider.baseUrl], ...named]
  let region: string | undefined
  // Without a key the switch stops at "No API key" anyway; asking for a region first would be wasted.
  if (named.length && rows[picked - 1].hasKey) {
    const now = current.kind === 'provider' && current.provider === key ? current.region : undefined
    // describeSettings leaves the region out when the URL is the base URL.
    const start = regions.findIndex(([name, url]) => (now ? name === now : url === provider.baseUrl))
    const choice = await display.select(
      `Region for ${provider.name}:`,
      regions.map(([name, url]) => ({ label: name ?? 'default', hint: url })),
      Math.max(start, 0)
    )
    if (choice === null) return
    region = regions[choice][0]
  }
  await doSwitch(key, region, 'user')
}

export function registerSwitchCommand(program: Command): void {
  program
    .argument('[provider]', 'Provider name or alias')
    .argument('[region]', 'Optional region (global, china, etc.)')
    .option('-m, --model <id>', 'Use this model ID for all of sonnet/opus/haiku')
    .action(async (provider: string | undefined, region: string | undefined, opts: { model?: string }) => {
      if (provider === undefined) {
        if (opts.model) throw new Error('"--model" needs a provider: ccs <provider> -m <id>')
        return pickAndSwitch(program)
      }
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
