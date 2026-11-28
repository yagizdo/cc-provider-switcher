import fs from 'fs/promises'
import { z } from 'zod'
import { type UserConfig } from '../types.js'
import { allProviders, resolveProvider } from '../providers/registry.js'
import { CCS_STATE_FILE } from '../utils/paths.js'
import { readJsonFile, writeFileAtomically } from '../utils/fs.js'

// No API key here: `ccs -` resolves it again, so a rotated key is used and no extra plain-text copy exists.
const PreviousSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('provider'), provider: z.string(), region: z.string().optional(), model: z.string().optional() }),
  z.object({ kind: z.literal('native') }),
  z.object({ kind: z.literal('unknown'), baseUrl: z.string() }),
])
const StateSchema = z.object({ previous: PreviousSchema })

export type Previous = z.infer<typeof PreviousSchema>

// Read from the live settings, not from what ccs last wrote, so a hand edit since then is what `ccs -` returns to.
// Exact URL match only: a prefix match would map ".../anthropic/v2" to a provider and drop the suffix on the way back.
export function describeSettings(env: Record<string, string>, userConfig: UserConfig): Previous {
  const baseUrl = env['ANTHROPIC_BASE_URL']
  if (!baseUrl) return { kind: 'native' }
  // Built-ins come first, so a custom provider on a built-in's URL loses the tie.
  for (const key of Object.keys(allProviders(userConfig))) {
    const p = resolveProvider(key, userConfig)
    const region = p.baseUrl === baseUrl ? undefined : Object.entries(p.regions ?? {}).find(([, url]) => url === baseUrl)?.[0]
    if (p.baseUrl !== baseUrl && !region) continue
    const model = env['ANTHROPIC_MODEL']
    return {
      kind: 'provider',
      provider: key,
      ...(region && { region }),
      ...(model && model !== p.defaultModel && { model }),
    }
  }
  return { kind: 'unknown', baseUrl }
}

// A missing or broken file means no previous state: it holds nothing the user typed, and the next switch rewrites it.
export async function readPrevious(): Promise<Previous | null> {
  return (await readJsonFile(CCS_STATE_FILE, StateSchema))?.previous ?? null
}

// Like kubectx: switching to the state you are already in keeps the older previous.
export async function recordPrevious(before: Previous, after: Previous): Promise<void> {
  if (JSON.stringify(before) === JSON.stringify(after)) return
  await writeFileAtomically(CCS_STATE_FILE, JSON.stringify({ previous: before }, null, 2) + '\n', 0o600)
}

// For a change ccs could not record: an older previous left in place would make `ccs -` jump two states back.
export async function forgetPrevious(): Promise<void> {
  await fs.rm(CCS_STATE_FILE, { force: true })
}
