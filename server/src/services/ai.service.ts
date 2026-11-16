import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import { AIProviderManager } from './ai/provider.manager.js';
import {
  ClassifyEmailInput,
  GenerateReplyInput,
  SummarizeConversationInput,
  AskAssistantInput,
  ExtractMeetingsInput,
  ExtractedMeeting,
} from './ai/ai.types.js';
import { AIClassificationResult } from '../validators/ai.schema.js';

export interface AIConnectivityStatus {
  isLive: boolean;
  engine: string;
  model: string;
  lastChecked?: string;
  reason?: 'QUOTA_EXHAUSTED' | 'API_KEY_MISSING' | 'TRANSIENT_ERROR' | 'UNAVAILABLE' | 'ONLINE' | string;
  retryAfter?: string;
  error?: string;
  activeProvider?: string;
  fallbackActive?: boolean;
  providers?: any;
}

export class AIService {
  /**
   * Health and connectivity check.
   * Performs real check if forceCheck is true or on initial boot.
   */
  static async checkGeminiConnectivity(forceCheck = false): Promise<AIConnectivityStatus> {
    const status = await AIProviderManager.checkHealth(forceCheck);
    return {
      isLive: status.isLive,
      engine: status.engine,
      model: status.activeModel,
      lastChecked: new Date().toISOString(),
      reason: status.reason,
      retryAfter: status.retryAfter,
      activeProvider: status.activeProvider,
      fallbackActive: status.fallbackActive,
      providers: status.providers,
    };
  }

  /**
   * Fast, non-blocking cached status check.
   * Never makes network requests.
   */
  static getStatus(): AIConnectivityStatus {
    const status = AIProviderManager.getStatus();
    return {
      isLive: status.isLive,
      engine: status.engine,
      model: status.activeModel,
      lastChecked: new Date().toISOString(),
      reason: status.reason,
      retryAfter: status.retryAfter,
      activeProvider: status.activeProvider,
      fallbackActive: status.fallbackActive,
      providers: status.providers,
    };
  }

  /**
   * Classify an email and extract structured insights
   */
  static async classifyEmail(
    data: ClassifyEmailInput
  ): Promise<AIClassificationResult & { isGeminiLive: boolean; engine: string; provider: string }> {
    return AIProviderManager.classifyEmail(data);
  }

  /**
   * Generate an email reply draft
   */
  static async generateReply(
    data: GenerateReplyInput
  ): Promise<{ reply: string; isGeminiLive: boolean; engine: string; provider: string }> {
    return AIProviderManager.generateReply(data);
  }

  /**
   * Summarize a conversation thread
   */
  static async summarizeConversation(
    data: SummarizeConversationInput
  ): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedAction: string;
    isGeminiLive: boolean;
    engine: string;
    provider: string;
  }> {
    return AIProviderManager.summarizeConversation(data);
  }

  /**
   * Contextual Inbox Q&A
   */
  static async askAssistant(
    data: AskAssistantInput
  ): Promise<{ answer: string; isGeminiLive: boolean; engine: string; provider: string }> {
    return AIProviderManager.askAssistant(data);
  }

  /**
   * Extract meetings and calendar details
   */
  static async extractMeetings(data: ExtractMeetingsInput): Promise<ExtractedMeeting[]> {
    return AIProviderManager.extractMeetings(data);
  }

  // --- Testing & Inspection Support Methods ---
  static _setClientForTesting(client: any): void {
    AIProviderManager._setGeminiClient(client);
  }

  static _setOpenAIClientForTesting(client: any): void {
    AIProviderManager._setOpenAIClient(client);
  }

  static _resetStateForTesting(): void {
    AIProviderManager._resetStateForTesting();
  }

  static _setQuotaResetTimestampForTesting(ts: number | null): void {
    AIProviderManager._setGeminiRetryTimestamp(ts);
  }

  static _getQuotaResetTimestampForTesting(): number | null {
    const status = AIProviderManager.getStatus();
    return status.providers.gemini.retryAfter ? new Date(status.providers.gemini.retryAfter).getTime() : null;
  }
}
