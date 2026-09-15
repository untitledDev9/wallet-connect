import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const startTime = Date.now()

router.get('/', (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  const uptime = Math.floor((Date.now() - startTime) / 1000)

  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime,
    database: dbStatus,
    version: process.env.npm_package_version || '1.0.0',
  })
})

export default router
