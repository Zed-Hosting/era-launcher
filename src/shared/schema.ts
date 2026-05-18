import { z } from 'zod'

export const modFileSchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  size: z.number().int().nonnegative()
})

export const modEntrySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  source: z.enum(['nexus', 'url', 'github']),
  sourceRef: z.string().min(1),
  archiveSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
  files: z.array(modFileSchema),
  plugin: z.string().optional(),
  loadOrderIndex: z.number().int().optional(),
  notes: z.string().optional()
})

export const modlistManifestSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1),
  version: z.string().min(1),
  gameVersion: z.string().min(1),
  strVersion: z.string().min(1),
  publishedAt: z.string(),
  serverHint: z
    .object({
      host: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      password: z.string().optional()
    })
    .optional(),
  mods: z.array(modEntrySchema)
})

export const serverFavoriteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  modlistUrl: z.string().url().optional(),
  password: z.string().optional()
})

export const launcherConfigSchema = z.object({
  skyrimPathOverride: z.string().optional(),
  autoUpdateEnabled: z.boolean().default(true),
  defaultServerPort: z.number().int().min(1).max(65535).default(10578),
  favorites: z.array(serverFavoriteSchema).default([]),
  lastModlistUrl: z.string().url().optional(),
  ahUsername: z.string().optional(),
  ahUrl: z.string().url().optional()
})

export type ModlistManifestInput = z.input<typeof modlistManifestSchema>
