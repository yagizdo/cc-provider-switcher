import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { type ZodSchema } from 'zod'

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function writeFileAtomically(
  filePath: string,
  data: string,
  mode = 0o644
): Promise<void> {
  const dir = path.dirname(filePath)
  await ensureDir(dir)
  const tmp = path.join(dir, `.ccs-tmp-${process.pid}-${Date.now()}`)
  await fs.writeFile(tmp, data, { mode })
  await fs.rename(tmp, filePath)
}

export async function readJsonFile<T>(
  filePath: string,
  schema?: ZodSchema<T>
): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (schema) return schema.parse(parsed)
    return parsed as T
  } catch {
    return null
  }
}

export async function writeJsonFile(
  filePath: string,
  data: unknown,
  mode = 0o644
): Promise<void> {
  await writeFileAtomically(filePath, JSON.stringify(data, null, 2), mode)
}
