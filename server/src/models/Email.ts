import mongoose, { Document, Schema, Types } from 'mongoose';
import { ClassificationType } from './Conversation.js';

export type PriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EmailStatusType = 'PENDING' | 'HANDLED' | 'DELEGATED' | 'COMPLETED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export interface IEmailParticipant {
  name: string;
  email: string;
  avatar?: string;
}

export interface IEmailAttachment {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface IManualOverride {
  isOverridden: boolean;
  previousClassification?: ClassificationType;
  overriddenBy?: Types.ObjectId;
  overriddenAt?: Date;
  reason?: string;
}

export interface IEmail extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  accountId: Types.ObjectId;
  conversationId: Types.ObjectId;
  sender: IEmailParticipant;
  recipients: IEmailParticipant[];
  cc?: IEmailParticipant[];
  subject: string;
  body: string;
  bodyHtml?: string;
  receivedAt: Date;
  isRead: boolean;
  isImportant: boolean;
  isArchived: boolean;
  isStarred: boolean;
  classification: ClassificationType;
  confidence: number;
  priority: PriorityType;
  aiSummary: string;
  classificationReason: string;
  suggestedAction: string;
  suggestedCategory?: string;
  keyPoints: string[];
  extractedDates: string[];
  suggestedReply?: string;
  requiresAction: boolean;
  manualOverride: IManualOverride;
  status: EmailStatusType;
  clientNotes?: string;
  delegationReason?: string;
  direction?: MessageDirection;
  isSent?: boolean;
  threadId?: string;
  inReplyTo?: string;
  attachments: IEmailAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const EmailSchema = new Schema<IEmail>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'EmailAccount', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      avatar: { type: String },
    },
    recipients: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
      },
    ],
    cc: [
      {
        name: { type: String },
        email: { type: String },
      },
    ],
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    bodyHtml: { type: String },
    receivedAt: { type: Date, default: Date.now, index: true },
    isRead: { type: Boolean, default: false, index: true },
    isImportant: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    isStarred: { type: Boolean, default: false, index: true },
    classification: {
      type: String,
      enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
      default: 'NEEDS_REVIEW',
      index: true,
    },
    confidence: { type: Number, default: 0.85, min: 0, max: 1 },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true,
    },
    aiSummary: { type: String, default: '' },
    classificationReason: { type: String, default: '' },
    suggestedAction: { type: String, default: '' },
    suggestedCategory: { type: String, default: 'General' },
    keyPoints: [{ type: String }],
    extractedDates: [{ type: String }],
    suggestedReply: { type: String },
    requiresAction: { type: Boolean, default: false, index: true },
    manualOverride: {
      isOverridden: { type: Boolean, default: false },
      previousClassification: { type: String, enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'] },
      overriddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
      overriddenAt: { type: Date },
      reason: { type: String },
    },
    status: {
      type: String,
      enum: ['PENDING', 'HANDLED', 'DELEGATED', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    clientNotes: { type: String },
    delegationReason: { type: String },
    direction: {
      type: String,
      enum: ['INBOUND', 'OUTBOUND'],
      default: 'INBOUND',
      index: true,
    },
    isSent: { type: Boolean, default: false, index: true },
    threadId: { type: String, index: true },
    inReplyTo: { type: String },
    attachments: [
      {
        name: { type: String, required: true },
        size: { type: Number, default: 0 },
        type: { type: String, default: 'application/octet-stream' },
        url: { type: String },
      },
    ],
  },
  { timestamps: true }
);

EmailSchema.index({ workspaceId: 1, subject: 'text', body: 'text', 'sender.name': 'text', 'sender.email': 'text' });

export const Email = mongoose.model<IEmail>('Email', EmailSchema);
