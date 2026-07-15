import type { Server as HTTPServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { Message, type MessageDoc } from '../models/Message'
import { Conversation } from '../models/Conversation'
import { isValidAdminKey } from '../middleware/adminAuth'
import { generateAutoReply } from '../lib/groq'

const ADMIN_ROOM = 'admins'
const conversationRoom = (id: string) => `conv:${id}`
const HISTORY_LIMIT = 20

const HUMAN_REQUEST_PATTERN =
  /\b(human|agent|representative)\b|real\s+person|\b(talk|speak|connect)\s+(to|with)\s+(a\s+)?(human|agent|person|someone|rep)\b/i

function looksLikeHumanRequest(text: string): boolean {
  return HUMAN_REQUEST_PATTERN.test(text)
}

export function attachChatServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  function broadcastMessage(conversationId: string, message: MessageDoc, escalated = false) {
    io.to(conversationRoom(conversationId)).emit('message:new', message)
    io.to(ADMIN_ROOM).emit('admin:conversation-update', {
      conversationId,
      lastMessage: message.text,
      lastMessageAt: message.createdAt,
      lastSender: message.sender,
      escalated,
    })
  }

  async function isEscalated(conversationId: string) {
    const conversation = await Conversation.findOne({ conversationId })
    return !!conversation?.escalated
  }

  async function escalate(conversationId: string) {
    await Conversation.findOneAndUpdate(
      { conversationId },
      { conversationId, escalated: true },
      { upsert: true },
    )

    const message = await Message.create({
      conversationId,
      sender: 'bot',
      text: "I've let our team know you'd like to speak with a human — someone will be with you shortly.",
    })

    broadcastMessage(conversationId, message, true)
  }

  async function maybeAutoReply(conversationId: string) {
    const humanTookOver = await Message.exists({ conversationId, sender: 'admin' })
    if (humanTookOver) return
    if (await isEscalated(conversationId)) return

    const history = await Message.find({ conversationId, sender: { $ne: 'admin' } })
      .sort({ createdAt: 1 })
      .limit(HISTORY_LIMIT)

    const reply = await generateAutoReply(
      history.map((m) => ({
        role: m.sender === 'bot' ? 'assistant' : 'user',
        content: m.text,
      })),
    )
    if (!reply) return

    const botMessage = await Message.create({ conversationId, sender: 'bot', text: reply })
    broadcastMessage(conversationId, botMessage)
  }

  io.on('connection', (socket: Socket) => {
    let isAdmin = false

    socket.on('visitor:join', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return
      socket.join(conversationRoom(conversationId))
    })

    socket.on(
      'visitor:message',
      async ({ conversationId, text }: { conversationId: string; text: string }) => {
        if (!conversationId || !text || !text.trim()) return
        const trimmed = text.trim()

        const message = await Message.create({
          conversationId,
          sender: 'visitor',
          text: trimmed,
        })

        const alreadyEscalated = await isEscalated(conversationId)
        broadcastMessage(conversationId, message, alreadyEscalated)

        if (!alreadyEscalated && looksLikeHumanRequest(trimmed)) {
          escalate(conversationId).catch((err) => console.error('Escalation failed', err))
          return
        }

        maybeAutoReply(conversationId).catch((err) => console.error('Auto-reply failed', err))
      },
    )

    socket.on(
      'admin:join',
      async ({ adminKey }: { adminKey: string }, ack?: (ok: boolean) => void) => {
        if (!(await isValidAdminKey(adminKey))) {
          ack?.(false)
          return
        }
        isAdmin = true
        socket.join(ADMIN_ROOM)
        ack?.(true)
      },
    )

    socket.on('admin:watch', ({ conversationId }: { conversationId: string }) => {
      if (!isAdmin || !conversationId) return
      socket.join(conversationRoom(conversationId))
    })

    socket.on(
      'admin:message',
      async ({ conversationId, text }: { conversationId: string; text: string }) => {
        if (!isAdmin || !conversationId || !text || !text.trim()) return

        const message = await Message.create({
          conversationId,
          sender: 'admin',
          text: text.trim(),
        })

        broadcastMessage(conversationId, message, await isEscalated(conversationId))
      },
    )
  })

  return io
}
