import type { Server as HTTPServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { Message, type MessageDoc } from '../models/Message'
import { isValidAdminKey } from '../middleware/adminAuth'

const ADMIN_ROOM = 'admins'
const conversationRoom = (id: string) => `conv:${id}`
const WAIT_MESSAGE = "Thanks for reaching out — a support agent will be with you shortly."

export function attachChatServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  function broadcastMessage(conversationId: string, message: MessageDoc) {
    io.to(conversationRoom(conversationId)).emit('message:new', message)
    io.to(ADMIN_ROOM).emit('admin:conversation-update', {
      conversationId,
      lastMessage: message.text,
      lastMessageAt: message.createdAt,
      lastSender: message.sender,
    })
  }

  async function maybeSendWaitMessage(conversationId: string) {
    const humanTookOver = await Message.exists({ conversationId, sender: 'admin' })
    if (humanTookOver) return

    const messageCount = await Message.countDocuments({ conversationId })
    if (messageCount !== 1) return

    const botMessage = await Message.create({
      conversationId,
      sender: 'bot',
      text: WAIT_MESSAGE,
    })
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

        const message = await Message.create({
          conversationId,
          sender: 'visitor',
          text: text.trim(),
        })

        broadcastMessage(conversationId, message)
        maybeSendWaitMessage(conversationId).catch((err) =>
          console.error('Wait message failed', err),
        )
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

        broadcastMessage(conversationId, message)
      },
    )
  })

  return io
}
