export type UserRole = 'ADMIN' | 'ASSISTANT' | 'CLIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  workspaceId: string;
  workspaceName?: string;
  avatar?: string;
}

export type ClassificationType = 'ASSISTANT_TO_REPLY' | 'CLIENT_TO_REPLY' | 'NO_REPLY_NEEDED' | 'NEEDS_REVIEW';
export type PriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EmailStatusType = 'PENDING' | 'HANDLED' | 'DELEGATED' | 'COMPLETED';

export interface EmailParticipant {
  name: string;
  email: string;
  avatar?: string;
}

export interface EmailAttachment {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface ManualOverride {
  isOverridden: boolean;
  previousClassification?: ClassificationType;
  overriddenBy?: string;
  overriddenAt?: string;
  reason?: string;
}

export interface Email {
  _id: string;
  workspaceId: string;
  accountId: {
    _id: string;
    provider: 'gmail' | 'outlook';
    emailAddress: string;
    displayName: string;
  };
  conversationId: string;
  sender: EmailParticipant;
  recipients: EmailParticipant[];
  cc?: EmailParticipant[];
  subject: string;
  body: string;
  bodyHtml?: string;
  receivedAt: string;
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
  manualOverride?: ManualOverride;
  status: EmailStatusType;
  clientNotes?: string;
  delegationReason?: string;
  attachments: EmailAttachment[];
  messageCount?: number;
  participants?: string[];
  participantNames?: string[];
  direction?: 'INBOUND' | 'OUTBOUND';
  hasOutbound?: boolean;
  snippet?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  workspaceId: string;
  subject: string;
  messageIds: string[];
  lastMessageAt: string;
  currentClassification: ClassificationType;
  assignedTo: 'ASSISTANT' | 'CLIENT' | 'NONE';
  isCompleted: boolean;
  isArchived: boolean;
  isStarred: boolean;
  snippet: string;
  participantNames: string[];
  unreadCount: number;
}

export interface Task {
  _id: string;
  workspaceId: string;
  conversationId?: string;
  emailId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignedTo: 'ASSISTANT' | 'CLIENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  type: 'FOLLOW_UP' | 'MEETING' | 'APPROVAL' | 'GENERAL';
  meetingDetails?: {
    title: string;
    date: string;
    time: string;
    participants: string[];
    location?: string;
    isExtracted: boolean;
  };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAccount {
  _id: string;
  workspaceId: string;
  ownerId: string;
  provider: 'gmail' | 'outlook';
  emailAddress: string;
  displayName: string;
  connectionStatus: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSyncedAt?: string;
  isSimulated: boolean;
  syncStats: {
    totalMessages: number;
    unreadCount: number;
  };
}

export interface ActivityLog {
  _id: string;
  workspaceId: string;
  userId?: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  description: string;
  createdAt: string;
}

export interface DashboardStats {
  totalEmails: number;
  unreadEmails: number;
  actionRequired: number;
  clientAttention: number;
  assistantTasks: number;
  waitingForResponse: number;
  breakdown: {
    assistantToReply: number;
    clientToReply: number;
    needsReview: number;
    noReplyNeeded: number;
  };
}
