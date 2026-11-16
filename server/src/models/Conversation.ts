import mongoose, { Document, Schema, Types } from 'mongoose';

export type ClassificationType = 'ASSISTANT_TO_REPLY' | 'CLIENT_TO_REPLY' | 'NO_REPLY_NEEDED' | 'NEEDS_REVIEW';
export type AssignedToType = 'ASSISTANT' | 'CLIENT' | 'NONE';
export type PriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  subject: string;
  messageIds: Types.ObjectId[];
  lastMessageAt: Date;
  currentClassification: ClassificationType;
  assignedTo: AssignedToType;
  isCompleted: boolean;
  isArchived: boolean;
  isStarred: boolean;
  snippet: string;
  participantNames: string[];
  unreadCount: number;
  messageCount: number;
  hasOutbound: boolean;
  hasInbound: boolean;
  latestEmailId?: Types.ObjectId;
  priority: PriorityType;
  requiresAction: boolean;
  aiSummary: string;
  classificationReason: string;
  suggestedAction: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    messageIds: [{ type: Schema.Types.ObjectId, ref: 'Email' }],
    lastMessageAt: { type: Date, default: Date.now, index: true },
    currentClassification: {
      type: String,
      enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
      default: 'NEEDS_REVIEW',
      index: true,
    },
    assignedTo: {
      type: String,
      enum: ['ASSISTANT', 'CLIENT', 'NONE'],
      default: 'NONE',
      index: true,
    },
    isCompleted: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    isStarred: { type: Boolean, default: false, index: true },
    snippet: { type: String, default: '' },
    participantNames: [{ type: String }],
    unreadCount: { type: Number, default: 0 },
    messageCount: { type: Number, default: 1 },
    hasOutbound: { type: Boolean, default: false, index: true },
    hasInbound: { type: Boolean, default: true, index: true },
    latestEmailId: { type: Schema.Types.ObjectId, ref: 'Email' },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true,
    },
    requiresAction: { type: Boolean, default: false, index: true },
    aiSummary: { type: String, default: '' },
    classificationReason: { type: String, default: '' },
    suggestedAction: { type: String, default: '' },
  },
  { timestamps: true }
);

ConversationSchema.index({ workspaceId: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
