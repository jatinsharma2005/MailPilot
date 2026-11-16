import mongoose, { Document, Schema, Types } from 'mongoose';

export type ProviderType = 'gmail' | 'outlook';
export type ConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

export interface IEmailAccount extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  provider: ProviderType;
  emailAddress: string;
  displayName: string;
  encryptedTokens?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  connectionStatus: ConnectionStatus;
  lastSyncedAt?: Date;
  isSimulated: boolean;
  syncStats: {
    totalMessages: number;
    unreadCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmailAccountSchema = new Schema<IEmailAccount>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['gmail', 'outlook'], required: true },
    emailAddress: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    encryptedTokens: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresAt: { type: Date },
    },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'syncing', 'error'],
      default: 'connected',
    },
    lastSyncedAt: { type: Date, default: Date.now },
    isSimulated: { type: Boolean, default: true },
    syncStats: {
      totalMessages: { type: Number, default: 0 },
      unreadCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

EmailAccountSchema.index({ workspaceId: 1, emailAddress: 1 }, { unique: true });

export const EmailAccount = mongoose.model<IEmailAccount>('EmailAccount', EmailAccountSchema);
