import type { Request, Response, NextFunction } from 'express'
import { AdminKey } from '../models/AdminKey'

export async function getAdminKey(): Promise<string | null> {
  const record = await AdminKey.findOne()
  if (record) return record.value

  const envKey = process.env.ADMIN_API_KEY
  if (!envKey) return null

  await AdminKey.create({ value: envKey })
  return envKey
}

export function getMasterKey(): string | null {
  return process.env.ADMIN_API_KEY || null
}

export async function isValidAdminKey(key: string | undefined | null): Promise<boolean> {
  if (!key) return false

  const master = getMasterKey()
  if (master && key === master) return true

  const current = await getAdminKey()
  return !!current && key === current
}

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-admin-key')

  if (!(await isValidAdminKey(key))) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}
