import mongoose, { Document, Schema, Types } from 'mongoose';

export type ActivityAction =
  | 'CLASSIFICATION_OVERRIDDEN'
  | 'EMAIL_DELEGATED'
  | 'EMAIL_HANDLED'
  | 'REPLY_SENT'
  | 'REPLY_DRAFTED'
  | 'EMAIL_ARCHIVED'
  | 'EMAIL_STARRED'
  | 'ACCOUNT_CONNECTED'
  | 'ACCOUNT_DISCONNECTED'
  | 'ACCOUNT_SYNCED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED';

export interface IActivityLog extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId?: Types.ObjectId;
  action: ActivityAction;
  entityType: 'EMAIL' | 'CONVERSATION' | 'TASK' | 'ACCOUNT' | 'WORKSPACE';
  entityId: string;
  previousValue?: string;
  newValue?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, enum: ['EMAIL', 'CONVERSATION', 'TASK', 'ACCOUNT', 'WORKSPACE'], required: true },
    entityId: { type: String, required: true },
    previousValue: { type: String },
    newValue: { type: String },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
