import { type Command } from 'commander'
import { resolveProvider, resolveBaseUrl, getApiKey } from '../providers/registry.js'
import { loadUserConfig } from '../config/user-config.js'
import { writeUserSettings, writeProjectSettings } from '../config/claude-settings.js'
import * as display from '../utils/display.js'

async function doSwitch(
  providerName: string,
  region: string | undefined,
  scope: 'user' | 'project'
): Promise<void> {
  const userConfig = await loadUserConfig()
  const provider = resolveProvider(providerName, userConfig)
  const baseUrl = resolveBaseUrl(provider, region)
  const apiKey = getApiKey(provider, userConfig)

  if (!apiKey && !provider.optional) {
    display.error(
      `No API key for ${provider.name}. Set ${provider.keyEnvVar} or run "ccs config".`
    )
    process.exit(1)
  }

  const caps = provider.supportedCapabilities?.join(',') ?? ''
  const envBlock = {
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

  if (scope === 'project') {
    await writeProjectSettings(envBlock)
    display.success(`Switched to ${provider.name} (project-level)`)
  } else {
    await writeUserSettings(envBlock)
    display.success(`Switched to ${provider.name} (user-level)`)
  }

  display.info(`Base URL: ${baseUrl}`)
  display.info(`Model: ${provider.defaultModel}`)
  if (apiKey) display.info(`Key: ${display.maskKey(apiKey)}`)
  if (provider.thinkingNote) display.info(`Thinking: ${provider.thinkingNote}`)
}

export function registerSwitchCommand(program: Command): void {
  program
    .argument('<provider>', 'Provider name or alias')
    .argument('[region]', 'Optional region (global, china, etc.)')
    .action(async (provider: string, region: string | undefined) => {
      await doSwitch(provider, region, 'user')
    })

  program
    .command('project <provider> [region]')
    .description('Switch provider for current project only')
    .action(async (provider: string, region: string | undefined) => {
      await doSwitch(provider, region, 'project')
    })
}
