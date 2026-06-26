import { z } from 'zod'

export const ProviderSchema = z.object({
  name: z.string(),
  baseUrl: z.string().url(),
  defaultModel: z.string(),
  aliases: z.array(z.string()),
  keyEnvVar: z.string(),
  models: z.object({
    sonnet: z.string(),
    opus: z.string(),
    haiku: z.string(),
  }),
  regions: z.record(z.string(), z.string()).optional(),
  optional: z.boolean().optional(),
  supportedCapabilities: z.array(z.string()).optional(),
  thinkingNote: z.string().optional(),
})

export const ProviderRegistrySchema = z.object({
  providers: z.record(z.string(), ProviderSchema),
})

export const UserConfigSchema = z.object({
  keys: z.record(z.string(), z.string()).default({}),
  defaults: z
    .object({
      region: z.string().optional(),
    })
    .default({}),
  providerOverrides: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
})

export const AccountSnapshotSchema = z.object({
  credentials: z.unknown(),
  savedAt: z.string(),
})

export type Provider = z.infer<typeof ProviderSchema>
export type ProviderRegistry = z.infer<typeof ProviderRegistrySchema>
export type UserConfig = z.infer<typeof UserConfigSchema>
export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>
