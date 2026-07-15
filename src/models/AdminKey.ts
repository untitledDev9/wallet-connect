import { Schema, model } from 'mongoose'

const adminKeySchema = new Schema({
  value: { type: String, required: true },
})

export const AdminKey = model('AdminKey', adminKeySchema)
