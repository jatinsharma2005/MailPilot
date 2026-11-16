import { AIClassificationResult } from '../../validators/ai.schema.js';

export type AIProviderName = 'gemini' | 'openai';

export interface ClassifyEmailInput {
  subject: string;
  body: string;
  sender: { name: string; email: string };
  recipients?: { name: string; email: string }[];
  conversationHistory?: { sender: string; body: string; date: string }[];
}

export interface GenerateReplyInput {
  subject: string;
  body: string;
  sender: { name: string; email: string };
  tone: 'professional' | 'friendly' | 'concise' | 'formal';
  customInstructions?: string;
}

export interface SummarizeConversationInput {
  subject: string;
  emails: Array<{
    sender: { name: string; email: string };
    body: string;
    date?: string | Date;
  }>;
}

export interface AskAssistantInput {
  query: string;
  relevantEmails: Array<{
    subject: string;
    sender: string;
    classification: string;
    summary: string;
    priority: string;
    date: string;
  }>;
}

export interface ExtractMeetingsInput {
  subject: string;
  body: string;
  sender: { name: string; email: string };
  conversationHistory?: { sender: string; body: string; date: string }[];
}

export interface ExtractedMeeting {
  title: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  attendees?: string[];
  location?: string;
  confidence: number;
}

export interface ProviderHealthCheckResult {
  isAvailable: boolean;
  status: ProviderStatus;
  error?: string;
  retryAfter?: string;
}

export interface AIProvider {
  name: AIProviderName;
  classifyEmail(input: ClassifyEmailInput): Promise<AIClassificationResult>;
  generateReply(input: GenerateReplyInput): Promise<{ reply: string }>;
  summarizeConversation(input: SummarizeConversationInput): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedAction: string;
  }>;
  askAssistant(input: AskAssistantInput): Promise<{ answer: string }>;
  extractMeetings(input: ExtractMeetingsInput): Promise<ExtractedMeeting[]>;
  checkHealth(force?: boolean): Promise<ProviderHealthCheckResult>;
}

export type ProviderStatus =
  | 'available'
  | 'quota_exhausted'
  | 'billing_unavailable'
  | 'rate_limited'
  | 'transient_error'
  | 'invalid_key'
  | 'model_not_found'
  | 'error'
  | 'disabled'
  | 'unconfigured';

export interface ProviderHealth {
  configured: boolean;
  available: boolean;
  status: ProviderStatus;
  model: string;
  lastChecked?: string;
  retryAfter?: string;
  error?: string;
}

export interface MultiProviderStatusResponse {
  success: boolean;
  activeProvider: AIProviderName | 'fallback';
  activeModel: string;
  isLive: boolean;
  fallbackActive: boolean;
  providers: {
    gemini: ProviderHealth;
    openai: ProviderHealth;
  };
  fallbackReason: string | null;
  // Backwards compatibility fields for existing frontend and test suites
  engine: string;
  model: string;
  reason?: string;
  retryAfter?: string;
  data?: any;
}
