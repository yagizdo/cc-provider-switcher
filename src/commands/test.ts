import { type Command } from 'commander'
import chalk from 'chalk'
import { buildEnvBlock, CLAUDE_NATIVE_NAMES } from './switch.js'
import * as display from '../utils/display.js'

const TIMEOUT_MS = 60_000
// Thinking counts against max_tokens on several providers and may use it all; a 200 still proves key, URL and model.
const MAX_TOKENS = 256

// Same join as the Anthropic SDK inside Claude Code: one trailing slash dropped, path prefix kept.
export function messagesUrl(baseUrl: string): string {
  return (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') + 'v1/messages?beta=true'
}

function errorMessage(text: string): string {
  let msg = text
  try {
    const body = JSON.parse(text)
    msg = body?.error?.message ?? body?.message ?? body?.msg ?? text
  } catch {
    /* not JSON: keep the text */
  }
  msg = String(msg).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return msg.length > 200 ? msg.slice(0, 200) + '...' : msg
}

function statusReason(status: number): string {
  if (status === 401 || status === 403) return `key rejected (HTTP ${status})`
  if (status === 404) return 'model or URL not found (HTTP 404)'
  if (status === 429) return 'rate limited or out of quota (HTTP 429)'
  return `HTTP ${status}`
}

function networkReason(err: unknown, url: URL, providerName: string): string {
  const e = err as Error & { cause?: { code?: string; message?: string } }
  if (e.name === 'TimeoutError') return `no answer within ${TIMEOUT_MS / 1000}s`
  const code = e.cause?.code
  if (code === 'ECONNREFUSED') {
    const local = isLocal(url)
    return `connection refused by ${url.host}` + (local ? `. Is the ${providerName} server running?` : '')
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return `DNS lookup failed for ${url.hostname}`
  if (code === 'UND_ERR_CONNECT_TIMEOUT') return `could not connect to ${url.host} (timeout)`
  return `request failed: ${e.cause?.message ?? e.message}`
}

function isLocal(url: URL): boolean {
  return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
}

async function checkModel(url: string, apiKey: string, model: string, providerName: string) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: [{ role: 'user', content: 'Reply with OK.' }] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const text = await res.text()
    if (res.ok) return { ok: true, reason: `${((Date.now() - started) / 1000).toFixed(1)}s` }
    // Some providers echo the request in errors; mask the key before the message is cut, so no part of it shows.
    const msg = errorMessage(apiKey.length > 8 ? text.split(apiKey).join('***') : text)
    return { ok: false, reason: statusReason(res.status) + (msg ? `: ${msg}` : '') }
  } catch (err) {
    return { ok: false, reason: networkReason(err, new URL(url), providerName) }
  }
}

async function doTest(providerName: string, region: string | undefined, opts: { model?: string; accept?: boolean }) {
  if (CLAUDE_NATIVE_NAMES.has(providerName.toLowerCase())) {
    display.info('Claude is Claude Code\'s native default. There is no provider to test.')
    return
  }

  const { provider, baseUrl, apiKey } = await buildEnvBlock(providerName, region, opts.model)

  if (provider.testNote) {
    display.warn(provider.testNote)
    if (!opts.accept) {
      if (!process.stdin.isTTY) {
        display.error('No request sent. Pass --accept to send it without asking.')
        process.exit(1)
      }
      if (!(await display.confirm('Send anyway?'))) {
        display.info('No request sent.')
        process.exit(1)
      }
    }
  }

  const roles = new Map<string, string[]>()
  for (const [role, id] of Object.entries(provider.models)) roles.set(id, [...(roles.get(id) ?? []), role])

  const url = messagesUrl(baseUrl)
  const count = roles.size
  const cost = isLocal(new URL(url)) ? ' to a local server' : ', billed by the provider'
  display.info(`Testing ${provider.name} at ${baseUrl}: ${count} request${count === 1 ? '' : 's'}${cost}`)
  const ids = [...roles.keys()]
  const results = await Promise.all(ids.map((id) => checkModel(url, apiKey, id, provider.name)))

  ids.forEach((id, i) => {
    const { ok, reason } = results[i]
    const icon = ok ? chalk.green('✓') : chalk.red('✗')
    console.log(`  ${icon} ${id} (${roles.get(id)!.join(', ')})  ${reason}`)
  })

  if (results.some((r) => !r.ok)) process.exit(1)
}

export function registerTestCommand(program: Command): void {
  program
    .command('test <provider> [region]')
    .description('Send one paid request per model ID to check the key, base URL and model IDs')
    .option('-m, --model <id>', 'Test only this model ID')
    .option('--accept', 'Send without asking when the provider warns about its terms')
    .action(async (provider: string, region: string | undefined, opts: { model?: string; accept?: boolean }) => {
      await doTest(provider, region, opts)
    })
}
