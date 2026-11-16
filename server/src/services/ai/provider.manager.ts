import { ENV } from '../../config/env.js';
import { GeminiProvider } from './gemini.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { DeterministicFallbackEngine } from './fallback.engine.js';
import {
  AIProvider,
  AIProviderName,
  ClassifyEmailInput,
  GenerateReplyInput,
  SummarizeConversationInput,
  AskAssistantInput,
  ExtractMeetingsInput,
  ExtractedMeeting,
  MultiProviderStatusResponse,
  ProviderHealth,
} from './ai.types.js';
import { AIClassificationResult } from '../../validators/ai.schema.js';

export class AIProviderManager {
  private static geminiProvider = new GeminiProvider();
  private static openaiProvider = new OpenAIProvider();

  // Circuit Breaker State: Gemini
  private static geminiRetryTimestamp: number | null = null;
  private static geminiTransientBackoff: number | null = null;
  private static consecutiveGeminiFailures = 0;
  private static geminiHealth: ProviderHealth = {
    configured: false,
    available: false,
    status: 'unconfigured',
    model: ENV.GEMINI_MODEL || 'gemini-3.8-flash',
  };

  // Circuit Breaker State: OpenAI
  private static openaiRetryTimestamp: number | null = null;
  private static openaiTransientBackoff: number | null = null;
  private static consecutiveOpenAIFailures = 0;
  private static openaiHealth: ProviderHealth = {
    configured: false,
    available: false,
    status: 'disabled',
    model: ENV.OPENAI_MODEL || 'gpt-4o-mini',
  };

  private static hasInitialized = false;

  /**
   * One-time initialization check at server boot.
   */
  static async initialize(): Promise<MultiProviderStatusResponse> {
    if (this.hasInitialized) {
      return this.getStatus();
    }
    this.hasInitialized = true;
    return this.checkHealth(true);
  }

  /**
   * Manual or periodic health check across both providers.
   */
  static async checkHealth(force = false): Promise<MultiProviderStatusResponse> {
    const now = Date.now();

    // 1. Check Gemini
    if (this.geminiRetryTimestamp !== null && now < this.geminiRetryTimestamp) {
      this.geminiHealth.available = false;
      this.geminiHealth.status = 'quota_exhausted';
      this.geminiHealth.retryAfter = new Date(this.geminiRetryTimestamp).toISOString();
    } else if (this.geminiTransientBackoff !== null && now < this.geminiTransientBackoff) {
      this.geminiHealth.available = false;
      this.geminiHealth.status = 'transient_error';
      this.geminiHealth.retryAfter = new Date(this.geminiTransientBackoff).toISOString();
    } else {
      if (this.geminiRetryTimestamp !== null && now >= this.geminiRetryTimestamp) {
        this.geminiRetryTimestamp = null;
      }

      if (this.geminiProvider.isConfigured()) {
        this.geminiHealth.configured = true;
        this.geminiHealth.model = this.geminiProvider.getModel();
        try {
          const res = await this.geminiProvider.checkHealth(force);
          this.geminiHealth.available = res.isAvailable;
          this.geminiHealth.status = res.status;
          this.geminiHealth.error = res.error;
          this.geminiHealth.retryAfter = res.retryAfter;
          this.geminiHealth.lastChecked = new Date().toISOString();

          if (res.status === 'quota_exhausted' && res.retryAfter) {
            this.geminiRetryTimestamp = new Date(res.retryAfter).getTime();
          } else if (res.status === 'transient_error' || res.status === 'error') {
            this.consecutiveGeminiFailures++;
            const backoffSec = Math.min(300, 5 * Math.pow(2, this.consecutiveGeminiFailures - 1));
            this.geminiTransientBackoff = Date.now() + backoffSec * 1000;
            this.geminiHealth.status = 'transient_error';
            this.geminiHealth.retryAfter = new Date(this.geminiTransientBackoff).toISOString();
          }
        } catch (err: any) {
          const parsed = this.geminiProvider.parseGeminiError(err);
          this.geminiHealth.available = false;
          this.geminiHealth.status = parsed.status;
          this.geminiHealth.error = parsed.error;
          this.geminiHealth.retryAfter = parsed.retryAfter;
          if (parsed.status === 'quota_exhausted' && parsed.retryAfter) {
            this.geminiRetryTimestamp = new Date(parsed.retryAfter).getTime();
          } else if (parsed.status === 'transient_error' || parsed.status === 'error') {
            this.consecutiveGeminiFailures++;
            const backoffSec = Math.min(300, 5 * Math.pow(2, this.consecutiveGeminiFailures - 1));
            this.geminiTransientBackoff = Date.now() + backoffSec * 1000;
            this.geminiHealth.status = 'transient_error';
            this.geminiHealth.retryAfter = new Date(this.geminiTransientBackoff).toISOString();
          }
        }
      } else {
        this.geminiHealth.configured = false;
        this.geminiHealth.available = false;
        this.geminiHealth.status = 'unconfigured';
      }
    }

    // 2. Check OpenAI
    if (this.openaiRetryTimestamp !== null && now < this.openaiRetryTimestamp) {
      this.openaiHealth.available = false;
      this.openaiHealth.status = 'rate_limited';
      this.openaiHealth.retryAfter = new Date(this.openaiRetryTimestamp).toISOString();
    } else {
      if (this.openaiRetryTimestamp !== null && now >= this.openaiRetryTimestamp) {
        this.openaiRetryTimestamp = null;
      }

      if (this.openaiProvider.isConfigured() && this.openaiProvider.isEnabled()) {
        this.openaiHealth.configured = true;
        this.openaiHealth.model = this.openaiProvider.getModel();
        try {
          const res = await this.openaiProvider.checkHealth(force);
          this.openaiHealth.available = res.isAvailable;
          this.openaiHealth.status = res.status;
          this.openaiHealth.error = res.error;
          this.openaiHealth.retryAfter = res.retryAfter;
          this.openaiHealth.lastChecked = new Date().toISOString();

          if (res.status === 'rate_limited' && res.retryAfter) {
            this.openaiRetryTimestamp = new Date(res.retryAfter).getTime();
          }
        } catch (err: any) {
          const parsed = this.openaiProvider.parseOpenAIError(err);
          this.openaiHealth.available = false;
          this.openaiHealth.status = parsed.status;
          this.openaiHealth.error = parsed.error;
          this.openaiHealth.retryAfter = parsed.retryAfter;
        }
      } else {
        this.openaiHealth.configured = this.openaiProvider.isConfigured();
        this.openaiHealth.available = false;
        this.openaiHealth.status = !this.openaiProvider.isEnabled()
          ? 'disabled'
          : !this.openaiProvider.isConfigured()
          ? 'unconfigured'
          : 'disabled';
      }
    }

    return this.getStatus();
  }

  /**
   * Fast, non-blocking status check reading from cache.
   * NEVER initiates network requests to Gemini or OpenAI.
   */
  static getStatus(): MultiProviderStatusResponse {
    let activeProvider: AIProviderName | 'fallback' = 'fallback';
    let activeModel = 'deterministic-local';
    let isLive = false;
    let fallbackActive = true;
    let fallbackReason: string | null = null;
    let engine = 'Demo Fallback';
    let reason: string | undefined = undefined;
    let retryAfter: string | undefined = undefined;

    // Check Gemini availability
    if (this.isGeminiCallable()) {
      activeProvider = 'gemini';
      activeModel = this.geminiHealth.model || ENV.GEMINI_MODEL || 'gemini-3.8-flash';
      isLive = true;
      fallbackActive = false;
      engine = 'Gemini Live';
      reason = 'ONLINE';
    } else if (this.isOpenAICallable()) {
      // Check OpenAI availability
      activeProvider = 'openai';
      activeModel = this.openaiHealth.model || ENV.OPENAI_MODEL || 'gpt-4o-mini';
      isLive = true;
      fallbackActive = false;
      engine = 'OpenAI Live';
      reason = 'ONLINE';
    } else {
      // Fallback is active
      activeProvider = 'fallback';
      fallbackActive = true;
      isLive = false;
      engine = 'Demo Fallback';
      activeModel = this.geminiHealth.model || ENV.GEMINI_MODEL || 'gemini-3.8-flash';

      if (this.geminiHealth.status === 'quota_exhausted') {
        fallbackReason = 'GEMINI_QUOTA_EXHAUSTED';
        reason = 'QUOTA_EXHAUSTED';
        retryAfter = this.geminiHealth.retryAfter;
      } else if (this.geminiHealth.status === 'transient_error' || this.geminiTransientBackoff) {
        fallbackReason = 'GEMINI_TRANSIENT_ERROR';
        reason = 'TRANSIENT_ERROR';
        retryAfter = this.geminiHealth.retryAfter || (this.geminiTransientBackoff ? new Date(this.geminiTransientBackoff).toISOString() : undefined);
      } else if (this.openaiHealth.status === 'billing_unavailable') {
        fallbackReason = 'OPENAI_BILLING_UNAVAILABLE';
        reason = 'BILLING_UNAVAILABLE';
      } else if (!this.geminiHealth.configured && !this.openaiHealth.configured) {
        fallbackReason = 'NO_PROVIDERS_CONFIGURED';
        reason = 'API_KEY_MISSING';
      } else {
        fallbackReason = 'PROVIDERS_UNAVAILABLE';
        reason = 'UNAVAILABLE';
      }
    }

    return {
      success: true,
      activeProvider,
      activeModel,
      isLive,
      fallbackActive,
      providers: {
        gemini: { ...this.geminiHealth },
        openai: { ...this.openaiHealth },
      },
      fallbackReason,
      engine,
      model: activeModel,
      reason,
      retryAfter,
      data: {
        activeProvider,
        activeModel,
        isLive,
        fallbackActive,
        providers: {
          gemini: { ...this.geminiHealth },
          openai: { ...this.openaiHealth },
        },
        fallbackReason,
        engine,
        model: activeModel,
        reason,
        retryAfter,
      },
    };
  }

  // --- Callable Checks ---

  private static isGeminiCallable(): boolean {
    if (!this.geminiProvider.isConfigured()) return false;
    const now = Date.now();
    if (this.geminiRetryTimestamp !== null && now < this.geminiRetryTimestamp) return false;
    if (this.geminiTransientBackoff !== null && now < this.geminiTransientBackoff) return false;
    if (this.geminiHealth.status === 'invalid_key' || this.geminiHealth.status === 'model_not_found') return false;
    return true;
  }

  private static isOpenAICallable(): boolean {
    if (!this.openaiProvider.isEnabled() || !this.openaiProvider.isConfigured()) return false;
    const now = Date.now();
    if (this.openaiRetryTimestamp !== null && now < this.openaiRetryTimestamp) return false;
    if (this.openaiTransientBackoff !== null && now < this.openaiTransientBackoff) return false;
    if (this.openaiHealth.status === 'billing_unavailable' || this.openaiHealth.status === 'invalid_key' || this.openaiHealth.status === 'model_not_found') return false;
    return true;
  }

  // --- Failover Handlers ---

  private static handleGeminiError(err: any): void {
    const parsed = this.geminiProvider.parseGeminiError(err);
    this.geminiHealth.available = false;
    this.geminiHealth.status = parsed.status;
    this.geminiHealth.error = parsed.error;
    this.geminiHealth.retryAfter = parsed.retryAfter;
    this.geminiHealth.lastChecked = new Date().toISOString();

    if (parsed.status === 'quota_exhausted' && parsed.retryAfter) {
      this.geminiRetryTimestamp = new Date(parsed.retryAfter).getTime();
      console.warn(`[AIProviderManager] Gemini quota exhausted. Switching failover until ${parsed.retryAfter}.`);
    } else if (parsed.status === 'error') {
      this.consecutiveGeminiFailures++;
      const backoffSec = Math.min(300, 5 * Math.pow(2, this.consecutiveGeminiFailures - 1));
      this.geminiTransientBackoff = Date.now() + backoffSec * 1000;
      console.warn(`[AIProviderManager] Gemini transient error. Backing off ${backoffSec}s.`);
    }
  }

  private static handleOpenAIError(err: any): void {
    const parsed = this.openaiProvider.parseOpenAIError(err);
    this.openaiHealth.available = false;
    this.openaiHealth.status = parsed.status;
    this.openaiHealth.error = parsed.error;
    this.openaiHealth.retryAfter = parsed.retryAfter;
    this.openaiHealth.lastChecked = new Date().toISOString();

    if (parsed.status === 'billing_unavailable') {
      console.warn('[AIProviderManager] OpenAI billing unavailable / credits exhausted. Disabled further automatic attempts.');
    } else if (parsed.status === 'rate_limited' && parsed.retryAfter) {
      this.openaiRetryTimestamp = new Date(parsed.retryAfter).getTime();
      console.warn(`[AIProviderManager] OpenAI rate limited. Retry scheduled after ${parsed.retryAfter}.`);
    } else if (parsed.status === 'error') {
      this.consecutiveOpenAIFailures++;
      const backoffSec = Math.min(300, 5 * Math.pow(2, this.consecutiveOpenAIFailures - 1));
      this.openaiTransientBackoff = Date.now() + backoffSec * 1000;
      console.warn(`[AIProviderManager] OpenAI transient error. Backing off ${backoffSec}s.`);
    }
  }

  // --- AI Operations with Failover ---

  static async classifyEmail(
    input: ClassifyEmailInput
  ): Promise<AIClassificationResult & { isGeminiLive: boolean; engine: string; provider: string }> {
    // 1. Try Gemini
    if (this.isGeminiCallable()) {
      try {
        const result = await this.geminiProvider.classifyEmail(input);
        this.geminiHealth.available = true;
        this.geminiHealth.status = 'available';
        this.consecutiveGeminiFailures = 0;
        return {
          ...result,
          isGeminiLive: true,
          engine: 'Gemini Live',
          provider: 'gemini',
        };
      } catch (err: any) {
        this.handleGeminiError(err);
      }
    }

    // 2. Try OpenAI
    if (this.isOpenAICallable()) {
      try {
        const result = await this.openaiProvider.classifyEmail(input);
        this.openaiHealth.available = true;
        this.openaiHealth.status = 'available';
        this.consecutiveOpenAIFailures = 0;
        return {
          ...result,
          isGeminiLive: false,
          engine: 'OpenAI Live',
          provider: 'openai',
        };
      } catch (err: any) {
        this.handleOpenAIError(err);
      }
    }

    // 3. Deterministic Fallback
    const fallback = DeterministicFallbackEngine.classifyEmail(input);
    return {
      ...fallback,
      isGeminiLive: false,
      engine: 'Demo Fallback',
      provider: 'fallback',
    };
  }

  static async generateReply(
    input: GenerateReplyInput
  ): Promise<{ reply: string; isGeminiLive: boolean; engine: string; provider: string }> {
    // 1. Try Gemini
    if (this.isGeminiCallable()) {
      try {
        const result = await this.geminiProvider.generateReply(input);
        this.geminiHealth.available = true;
        this.geminiHealth.status = 'available';
        this.consecutiveGeminiFailures = 0;
        return {
          reply: result.reply,
          isGeminiLive: true,
          engine: 'Gemini Live',
          provider: 'gemini',
        };
      } catch (err: any) {
        this.handleGeminiError(err);
      }
    }

    // 2. Try OpenAI
    if (this.isOpenAICallable()) {
      try {
        const result = await this.openaiProvider.generateReply(input);
        this.openaiHealth.available = true;
        this.openaiHealth.status = 'available';
        this.consecutiveOpenAIFailures = 0;
        return {
          reply: result.reply,
          isGeminiLive: false,
          engine: 'OpenAI Live',
          provider: 'openai',
        };
      } catch (err: any) {
        this.handleOpenAIError(err);
      }
    }

    // 3. Fallback
    const fallback = DeterministicFallbackEngine.generateReply(input);
    return {
      reply: fallback.reply,
      isGeminiLive: false,
      engine: 'Demo Fallback',
      provider: 'fallback',
    };
  }

  static async summarizeConversation(
    input: SummarizeConversationInput
  ): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedAction: string;
    isGeminiLive: boolean;
    engine: string;
    provider: string;
  }> {
    // 1. Try Gemini
    if (this.isGeminiCallable()) {
      try {
        const result = await this.geminiProvider.summarizeConversation(input);
        this.geminiHealth.available = true;
        this.geminiHealth.status = 'available';
        this.consecutiveGeminiFailures = 0;
        return {
          ...result,
          isGeminiLive: true,
          engine: 'Gemini Live',
          provider: 'gemini',
        };
      } catch (err: any) {
        this.handleGeminiError(err);
      }
    }

    // 2. Try OpenAI
    if (this.isOpenAICallable()) {
      try {
        const result = await this.openaiProvider.summarizeConversation(input);
        this.openaiHealth.available = true;
        this.openaiHealth.status = 'available';
        this.consecutiveOpenAIFailures = 0;
        return {
          ...result,
          isGeminiLive: false,
          engine: 'OpenAI Live',
          provider: 'openai',
        };
      } catch (err: any) {
        this.handleOpenAIError(err);
      }
    }

    // 3. Fallback
    const fallback = DeterministicFallbackEngine.summarizeConversation(input);
    return {
      ...fallback,
      isGeminiLive: false,
      engine: 'Demo Fallback',
      provider: 'fallback',
    };
  }

  static async askAssistant(
    input: AskAssistantInput
  ): Promise<{ answer: string; isGeminiLive: boolean; engine: string; provider: string }> {
    // 1. Try Gemini
    if (this.isGeminiCallable()) {
      try {
        const result = await this.geminiProvider.askAssistant(input);
        this.geminiHealth.available = true;
        this.geminiHealth.status = 'available';
        this.consecutiveGeminiFailures = 0;
        return {
          answer: result.answer,
          isGeminiLive: true,
          engine: 'Gemini Live',
          provider: 'gemini',
        };
      } catch (err: any) {
        this.handleGeminiError(err);
      }
    }

    // 2. Try OpenAI
    if (this.isOpenAICallable()) {
      try {
        const result = await this.openaiProvider.askAssistant(input);
        this.openaiHealth.available = true;
        this.openaiHealth.status = 'available';
        this.consecutiveOpenAIFailures = 0;
        return {
          answer: result.answer,
          isGeminiLive: false,
          engine: 'OpenAI Live',
          provider: 'openai',
        };
      } catch (err: any) {
        this.handleOpenAIError(err);
      }
    }

    // 3. Fallback
    const fallback = DeterministicFallbackEngine.askAssistant(input);
    return {
      answer: fallback.answer,
      isGeminiLive: false,
      engine: 'Demo Fallback',
      provider: 'fallback',
    };
  }

  static async extractMeetings(input: ExtractMeetingsInput): Promise<ExtractedMeeting[]> {
    if (this.isGeminiCallable()) {
      try {
        const res = await this.geminiProvider.extractMeetings(input);
        if (res.length > 0) return res;
      } catch (err: any) {
        this.handleGeminiError(err);
      }
    }

    if (this.isOpenAICallable()) {
      try {
        const res = await this.openaiProvider.extractMeetings(input);
        if (res.length > 0) return res;
      } catch (err: any) {
        this.handleOpenAIError(err);
      }
    }

    return DeterministicFallbackEngine.extractMeetings(input);
  }

  // --- Testing & Administration Hooks ---

  static _getGeminiProvider(): GeminiProvider {
    return this.geminiProvider;
  }

  static _getOpenAIProvider(): OpenAIProvider {
    return this.openaiProvider;
  }

  static _setGeminiClient(client: any): void {
    this.geminiProvider.setClient(client);
  }

  static _setOpenAIClient(client: any): void {
    this.openaiProvider.setClient(client);
  }

  static _resetStateForTesting(): void {
    this.geminiRetryTimestamp = null;
    this.geminiTransientBackoff = null;
    this.consecutiveGeminiFailures = 0;
    this.geminiHealth = {
      configured: this.geminiProvider.isConfigured(),
      available: false,
      status: this.geminiProvider.isConfigured() ? 'available' : 'unconfigured',
      model: this.geminiProvider.getModel(),
    };

    this.openaiRetryTimestamp = null;
    this.openaiTransientBackoff = null;
    this.consecutiveOpenAIFailures = 0;
    this.openaiProvider.resetBillingStatus();
    this.openaiHealth = {
      configured: this.openaiProvider.isConfigured(),
      available: false,
      status: this.openaiProvider.isEnabled() ? 'available' : 'disabled',
      model: this.openaiProvider.getModel(),
    };

    this.hasInitialized = false;
  }

  static _setGeminiRetryTimestamp(ts: number | null): void {
    this.geminiRetryTimestamp = ts;
  }

  static _setOpenAIRetryTimestamp(ts: number | null): void {
    this.openaiRetryTimestamp = ts;
  }
}
