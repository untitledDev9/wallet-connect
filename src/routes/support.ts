import { Router } from 'express'
import { Message } from '../models/Message'

const router = Router()

router.get('/conversations/:id/messages', async (req, res) => {
  const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 })
  res.json(messages)
})

export default router
