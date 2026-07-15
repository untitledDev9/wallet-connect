import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { connectDB } from './config/db'
import healthRouter from './routes/health'
import adminRouter from './routes/admin'
import supportRouter from './routes/support'
import { adminAuth } from './middleware/adminAuth'
import { attachChatServer } from './realtime/chat'

dotenv.config({ quiet: true })

const app = express()
const port = process.env.PORT || 5000
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wallet'

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/admin', adminAuth, adminRouter)
app.use('/api/support', supportRouter)

const server = createServer(app)
attachChatServer(server)

connectDB(mongoUri).then(() => {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
})
