import { z } from 'zod'

export const ProviderSchema = z.object({
  name: z.string(),
  baseUrl: z.string().url(),
  defaultModel: z.string(),
  aliases: z.array(z.string()),
  keyEnvVar: z.string(),
  keyOptional: z.boolean().optional(),
  models: z.object({
    sonnet: z.string(),
    opus: z.string(),
    haiku: z.string(),
  }),
  regions: z.record(z.string(), z.string()).optional(),
  supportedCapabilities: z.array(z.string()).optional(),
  thinkingNote: z.string().optional(),
  testNote: z.string().optional(),
})

export const ProviderRegistrySchema = z.object({
  providers: z.record(z.string(), ProviderSchema),
})

// Lowercase, so lookup by lowercased input finds it; no leading "-", which commander reads as an option.
const PROVIDER_NAME = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'use lowercase letters, digits, "-" and "_", starting with a letter or digit')

// Only baseUrl and models.sonnet are required; customProvider() in registry.ts fills the rest.
export const CustomProviderSchema = z.object({
  name: z.string().optional(),
  // http(s) only: a bare "localhost:1234" passes a plain URL check and then fails every request.
  baseUrl: z.url({ protocol: /^https?$/ }),
  defaultModel: z.string().optional(),
  aliases: z.array(PROVIDER_NAME).default([]),
  keyEnvVar: z.string().optional(),
  keyOptional: z.boolean().optional(),
  models: z.object({
    sonnet: z.string(),
    opus: z.string().optional(),
    haiku: z.string().optional(),
  }),
  regions: z.record(z.string(), z.url({ protocol: /^https?$/ })).optional(),
  supportedCapabilities: z.array(z.string()).optional(),
  thinkingNote: z.string().optional(),
  testNote: z.string().optional(),
})

export const UserConfigSchema = z.object({
  keys: z.record(z.string(), z.string()).default({}),
  defaults: z
    .object({
      region: z.string().optional(),
    })
    .default({}),
  providerOverrides: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  customProviders: z.record(PROVIDER_NAME, CustomProviderSchema).optional(),
})

export const AccountSnapshotSchema = z.object({
  credentials: z.unknown(),
  savedAt: z.string(),
})

export type Provider = z.infer<typeof ProviderSchema>
export type CustomProvider = z.infer<typeof CustomProviderSchema>
export type ProviderRegistry = z.infer<typeof ProviderRegistrySchema>
export type UserConfig = z.infer<typeof UserConfigSchema>
export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>
