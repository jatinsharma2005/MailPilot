import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkspace extends Document {
  _id: Types.ObjectId;
  name: string;
  assistantId: Types.ObjectId;
  clientIds: Types.ObjectId[];
  settings: {
    defaultProvider?: string;
    syncIntervalMinutes?: number;
    aiAutoSummarize?: boolean;
    aiSensitivity?: 'balanced' | 'conservative' | 'aggressive';
  };
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    assistantId: { type: Schema.Types.ObjectId, ref: 'User' },
    clientIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    settings: {
      defaultProvider: { type: String, default: 'gmail' },
      syncIntervalMinutes: { type: Number, default: 15 },
      aiAutoSummarize: { type: Boolean, default: true },
      aiSensitivity: { type: String, enum: ['balanced', 'conservative', 'aggressive'], default: 'balanced' },
    },
  },
  { timestamps: true }
);

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
