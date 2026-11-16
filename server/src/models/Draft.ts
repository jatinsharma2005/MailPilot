import mongoose, { Document, Schema, Types } from 'mongoose';

export type DraftTone = 'professional' | 'friendly' | 'concise' | 'formal';

export interface IDraft extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  emailId?: Types.ObjectId;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  tone: DraftTone;
  generatedByAi: boolean;
  isSent: boolean;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DraftSchema = new Schema<IDraft>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    emailId: { type: Schema.Types.ObjectId, ref: 'Email' },
    to: { type: String, required: true },
    cc: { type: String },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    tone: { type: String, enum: ['professional', 'friendly', 'concise', 'formal'], default: 'professional' },
    generatedByAi: { type: Boolean, default: false },
    isSent: { type: Boolean, default: false },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

export const Draft = mongoose.model<IDraft>('Draft', DraftSchema);
