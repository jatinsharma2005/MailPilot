import mongoose, { Document, Schema, Types } from 'mongoose';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskType = 'FOLLOW_UP' | 'MEETING' | 'APPROVAL' | 'GENERAL';

export interface ITask extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  emailId?: Types.ObjectId;
  title: string;
  description?: string;
  dueDate?: Date;
  assignedTo: 'ASSISTANT' | 'CLIENT';
  status: TaskStatus;
  type: TaskType;
  meetingDetails?: {
    title: string;
    date: string;
    time: string;
    participants: string[];
    location?: string;
    isExtracted: boolean;
  };
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    emailId: { type: Schema.Types.ObjectId, ref: 'Email' },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date },
    assignedTo: { type: String, enum: ['ASSISTANT', 'CLIENT'], default: 'ASSISTANT', required: true },
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'], default: 'TODO', index: true },
    type: { type: String, enum: ['FOLLOW_UP', 'MEETING', 'APPROVAL', 'GENERAL'], default: 'FOLLOW_UP', index: true },
    meetingDetails: {
      title: { type: String },
      date: { type: String },
      time: { type: String },
      participants: [{ type: String }],
      location: { type: String },
      isExtracted: { type: Boolean, default: false },
    },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', TaskSchema);
