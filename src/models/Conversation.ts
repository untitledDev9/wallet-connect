import { Schema, model } from 'mongoose'

const conversationSchema = new Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  escalated: { type: Boolean, default: false },
})

export const Conversation = model('Conversation', conversationSchema)
