import { Router } from 'express'
import { AdminKey } from '../models/AdminKey'
import { Message } from '../models/Message'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ status: 'ok', admin: true })
})

router.get('/conversations', async (_req, res) => {
  const conversations = await Message.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$text' },
        lastMessageAt: { $first: '$createdAt' },
        lastSender: { $first: '$sender' },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ])

  res.json(
    conversations.map((c) => ({
      conversationId: c._id,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      lastSender: c.lastSender,
    })),
  )
})

router.get('/conversations/:id/messages', async (req, res) => {
  const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 })
  res.json(messages)
})

router.put('/key', async (req, res) => {
  const { newKey } = req.body as { newKey?: string }

  if (!newKey || newKey.trim().length < 8) {
    res.status(400).json({ error: 'New key must be at least 8 characters' })
    return
  }

  await AdminKey.findOneAndUpdate({}, { value: newKey.trim() }, { upsert: true })
  res.json({ status: 'ok' })
})

export default router
