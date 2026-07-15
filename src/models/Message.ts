import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose'

const messageSchema = new Schema({
  conversationId: { type: String, required: true, index: true },
  sender: { type: String, enum: ['visitor', 'admin', 'bot'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export type MessageDoc = HydratedDocument<InferSchemaType<typeof messageSchema>>

export const Message = model('Message', messageSchema)
