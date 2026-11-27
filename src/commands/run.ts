import { type Command } from 'commander'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import { rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { buildEnvBlock, CLAUDE_NATIVE_NAMES } from './switch.js'
import * as display from '../utils/display.js'

// commander's optional [region] would take the first word after `--`, so the tail is cut off before parsing.
export function splitClaudeArgs(argv: string[]): { argv: string[]; claudeArgs: string[] } {
  const i = argv.indexOf('--')
  if (argv[2] !== 'run' || i === -1) return { argv, claudeArgs: [] }
  return { argv: argv.slice(0, i), claudeArgs: argv.slice(i + 1) }
}

async function doRun(
  providerName: string,
  region: string | undefined,
  model: string | undefined,
  claudeArgs: string[]
): Promise<void> {
  if (CLAUDE_NATIVE_NAMES.has(providerName.toLowerCase())) {
    display.info('Claude is Claude Code\'s native default. Run "claude" directly.')
    return
  }

  const { provider, envBlock } = await buildEnvBlock(providerName, region, model)

  // A file, not inline JSON: every local user can read process arguments, and the block holds the key.
  // Empty values stay "": they cancel a value a lower settings layer would otherwise supply.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccs-run-'))
  const cleanup = () => rmSync(dir, { recursive: true, force: true })
  const settingsPath = path.join(dir, 'settings.json')
  try {
    await fs.writeFile(settingsPath, JSON.stringify({ env: envBlock }), { mode: 0o600 })
  } catch (err) {
    cleanup()
    throw err
  }

  const child = spawn('claude', ['--settings', settingsPath, ...claudeArgs], { stdio: 'inherit' })
  child.on('spawn', () => display.info(`Starting Claude Code with ${provider.name} (this session only)`))

  // The terminal sends Ctrl+C to claude as well; ccs waits for claude to decide.
  const ignore = () => {}
  const forward = (signal: NodeJS.Signals) => child.kill(signal)
  process.on('SIGINT', ignore)
  process.on('SIGTERM', forward)
  process.on('SIGHUP', forward)

  child.on('error', (err: NodeJS.ErrnoException) => {
    cleanup()
    if (err.code === 'ENOENT') {
      display.error('claude was not found on PATH. Install Claude Code: https://code.claude.com/docs/en/setup')
    } else {
      display.error(`Could not start claude: ${err.message}`)
    }
    process.exit(1)
  })

  child.on('exit', (code, signal) => {
    cleanup()
    if (signal) {
      // End the same way claude did, so the shell sees the signal.
      process.removeAllListeners(signal)
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 1)
  })
}

export function registerRunCommand(program: Command, claudeArgs: string[]): void {
  program
    .command('run <provider> [region]')
    .description('Start Claude Code with a provider for this session only (claude args go after --)')
    .option('-m, --model <id>', 'Use this model ID for all of sonnet/opus/haiku')
    .action(async (provider: string, region: string | undefined, opts: { model?: string }) => {
      await doRun(provider, region, opts.model, claudeArgs)
    })
}
