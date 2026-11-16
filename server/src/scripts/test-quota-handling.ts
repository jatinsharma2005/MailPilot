import { AIService, AIConnectivityStatus } from '../services/ai.service.js';
import { AIClassificationResultSchema } from '../validators/ai.schema.js';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function assertTest(
  id: string,
  name: string,
  fn: () => Promise<{ details?: string }>
) {
  const start = Date.now();
  try {
    const res = await fn();
    const durationMs = Date.now() - start;
    results.push({ id, name, passed: true, durationMs, details: res?.details });
    console.log(`  ✓ [PASS] [${id}] ${name} (${durationMs}ms)${res?.details ? ` - ${res.details}` : ''}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ id, name, passed: false, durationMs, error: err.message || String(err) });
    console.error(`  ✗ [FAIL] [${id}] ${name} (${durationMs}ms)`);
    console.error(`      Error: ${err.message || err}`);
  }
}

async function runQuotaTests() {
  console.log('\n========================================================================');
  console.log('🧪 MAILPILOT GEMINI QUOTA HANDLING & CIRCUIT BREAKER TEST SUITE');
  console.log('========================================================================\n');

  // Track mock API calls
  let generateContentCallCount = 0;
  let mockMode: '429_QUOTA' | '503_TRANSIENT' | '200_SUCCESS' = '429_QUOTA';

  const mockGoogleGenAIClient = {
    models: {
      generateContent: async (_opts: any) => {
        generateContentCallCount++;
        if (mockMode === '429_QUOTA') {
          const quotaError = new Error(
            JSON.stringify({
              error: {
                code: 429,
                message:
                  'You exceeded your current quota, please check your plan and billing details. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash.\nPlease retry in 23h33m19s.',
                status: 'RESOURCE_EXHAUSTED',
                details: [
                  {
                    '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                    retryDelay: '84799s',
                  },
                ],
              },
            })
          );
          (quotaError as any).status = 429;
          throw quotaError;
        }

        if (mockMode === '503_TRANSIENT') {
          const transError = new Error('Service Unavailable: 503 Backend temporary error');
          (transError as any).status = 503;
          (transError as any).code = 503;
          throw transError;
        }

        return {
          text: JSON.stringify({
            classification: 'ASSISTANT_TO_REPLY',
            confidence: 0.95,
            priority: 'MEDIUM',
            requiresAction: true,
            summary: 'Scheduling confirmed via mock live AI.',
            reason: 'Assistant coordination required.',
            suggestedAction: 'Schedule meeting.',
            suggestedCategory: 'Meeting',
            keyPoints: ['Live call succeeded'],
            extractedDates: [],
            suggestedReply: 'We are confirmed.',
          }),
        };
      },
    },
  };

  // Inject mock client and reset state
  AIService._setClientForTesting(mockGoogleGenAIClient);
  AIService._resetStateForTesting();

  // 1. Initial 429 Detection & Quota Exhaustion Status
  await assertTest('Q1.1', 'Detect HTTP 429 / RESOURCE_EXHAUSTED and set status', async () => {
    generateContentCallCount = 0;
    mockMode = '429_QUOTA';

    const status = await AIService.checkGeminiConnectivity();
    if (status.isLive !== false) throw new Error('Expected isLive=false');
    if (status.engine !== 'Demo Fallback') throw new Error(`Expected engine='Demo Fallback', got ${status.engine}`);
    if (status.reason !== 'QUOTA_EXHAUSTED') throw new Error(`Expected reason='QUOTA_EXHAUSTED', got ${status.reason}`);
    if (!status.retryAfter) throw new Error('Missing retryAfter date in status');

    const retryTimestamp = new Date(status.retryAfter).getTime();
    if (isNaN(retryTimestamp) || retryTimestamp <= Date.now()) {
      throw new Error(`Invalid retryAfter timestamp: ${status.retryAfter}`);
    }

    if (generateContentCallCount !== 1) {
      throw new Error(`Expected exactly 1 call to Gemini, got ${generateContentCallCount}`);
    }

    return {
      details: `Engine=${status.engine}, Reason=${status.reason}, RetryAfter=${status.retryAfter} (calls=${generateContentCallCount})`,
    };
  });

  // 2. Zero Repeated Calls during repeated status polling
  await assertTest('Q1.2', 'Zero repeated Gemini API calls on repeated status checks', async () => {
    const baselineCalls = generateContentCallCount;

    // Simulate 25 rapid status checks from multiple components / dashboard polls
    for (let i = 0; i < 25; i++) {
      const s1 = AIService.getStatus();
      if (s1.reason !== 'QUOTA_EXHAUSTED') throw new Error(`Unexpected reason: ${s1.reason}`);
      const s2 = await AIService.checkGeminiConnectivity(false);
      if (s2.reason !== 'QUOTA_EXHAUSTED') throw new Error(`Unexpected reason: ${s2.reason}`);
    }

    if (generateContentCallCount !== baselineCalls) {
      throw new Error(
        `Gemini API was called ${generateContentCallCount - baselineCalls} additional times! Quota leaked.`
      );
    }

    return { details: `25 repeated status checks executed with 0 additional Gemini calls (Call count remained ${baselineCalls})` };
  });

  // 3. Fallback Operations (Classification, Reply, Summary, Ask) with 0 API calls
  await assertTest('Q1.3', 'Fallback classification works without calling Gemini', async () => {
    const baselineCalls = generateContentCallCount;

    const res = await AIService.classifyEmail({
      subject: 'Quarterly Vendor Review Meeting',
      body: 'Can we schedule a 30-minute sync this Thursday?',
      sender: { name: 'Vendor Rep', email: 'vendor@supplies.com' },
    });

    if (generateContentCallCount !== baselineCalls) {
      throw new Error(`Gemini called during quota cooldown! Calls: ${generateContentCallCount - baselineCalls}`);
    }

    if (res.isGeminiLive !== false || res.engine !== 'Demo Fallback') {
      throw new Error(`Expected fallback response metadata, got live=${res.isGeminiLive}, engine=${res.engine}`);
    }

    const validation = AIClassificationResultSchema.safeParse(res);
    if (!validation.success) {
      throw new Error(`Schema validation failed on fallback classification: ${validation.error}`);
    }

    return { details: `Classified as ${res.classification} via Demo Fallback with valid schema (0 API calls)` };
  });

  await assertTest('Q1.4', 'Fallback reply generation works without calling Gemini', async () => {
    const baselineCalls = generateContentCallCount;

    const res = await AIService.generateReply({
      subject: 'Partnership Inquiry',
      body: 'We would love to discuss a potential partnership.',
      sender: { name: 'Alex Partner', email: 'alex@venture.com' },
      tone: 'professional',
    });

    if (generateContentCallCount !== baselineCalls) {
      throw new Error('Gemini called during quota cooldown!');
    }

    if (res.isGeminiLive !== false || res.engine !== 'Demo Fallback' || !res.reply) {
      throw new Error('Invalid fallback reply');
    }

    return { details: `Generated ${res.reply.length} chars reply via Demo Fallback (0 API calls)` };
  });

  await assertTest('Q1.5', 'Fallback conversation summarization works without calling Gemini', async () => {
    const baselineCalls = generateContentCallCount;

    const res = await AIService.summarizeConversation({
      subject: 'Term Sheet Review',
      emails: [
        {
          sender: { name: 'Counsel', email: 'counsel@law.com' },
          body: 'Here is the redline for your review.',
        },
      ],
    });

    if (generateContentCallCount !== baselineCalls) {
      throw new Error('Gemini called during quota cooldown!');
    }

    if (res.isGeminiLive !== false || !res.summary || !Array.isArray(res.keyPoints)) {
      throw new Error('Invalid fallback summary structure');
    }

    return { details: `Summary generated with ${res.keyPoints.length} keypoints via Demo Fallback (0 API calls)` };
  });

  await assertTest('Q1.6', 'Fallback inbox Q&A works without calling Gemini', async () => {
    const baselineCalls = generateContentCallCount;

    const res = await AIService.askAssistant({
      query: 'Which emails require client attention?',
      relevantEmails: [
        {
          subject: 'Term Sheet Signature',
          sender: 'Investor',
          classification: 'CLIENT_TO_REPLY',
          summary: 'Signature needed.',
          priority: 'URGENT',
          date: '2026-11-15',
        },
      ],
    });

    if (generateContentCallCount !== baselineCalls) {
      throw new Error('Gemini called during quota cooldown!');
    }

    if (res.isGeminiLive !== false || !res.answer) {
      throw new Error('Invalid fallback answer');
    }

    return { details: `Answer generated via Demo Fallback (0 API calls)` };
  });

  // 4. Recovery after quota reset time
  await assertTest('Q1.7', 'Gemini is checked again after retry time has arrived', async () => {
    // Simulate quota reset time arriving by moving timestamp to the past
    AIService._setQuotaResetTimestampForTesting(Date.now() - 1000);
    mockMode = '200_SUCCESS';

    const beforeCall = generateContentCallCount;
    const status = await AIService.checkGeminiConnectivity(true);

    if (generateContentCallCount !== beforeCall + 1) {
      throw new Error('Gemini was not called after retry time arrived');
    }

    if (status.isLive !== true || status.engine !== 'Gemini Live' || status.reason !== 'ONLINE') {
      throw new Error(`Expected recovery to Gemini Live, got: ${JSON.stringify(status)}`);
    }

    return { details: `Successfully transitioned back to ${status.engine} (Status: ${status.reason})` };
  });

  // 5. Transient error exponential backoff
  await assertTest('Q1.8', 'Transient error exponential backoff handling', async () => {
    AIService._resetStateForTesting();
    mockMode = '503_TRANSIENT';

    const status1 = await AIService.checkGeminiConnectivity(true);
    if (status1.isLive !== false || status1.reason !== 'TRANSIENT_ERROR') {
      throw new Error(`Expected TRANSIENT_ERROR, got ${status1.reason}`);
    }

    // Immediate second check should be blocked by backoff
    const callCountAfterFirst = generateContentCallCount;
    const status2 = await AIService.checkGeminiConnectivity(false);

    if (generateContentCallCount !== callCountAfterFirst) {
      throw new Error('Transient backoff did not block immediate re-query');
    }

    return { details: `Transient 503 error caught, backoff scheduled until ${status1.retryAfter}` };
  });

  // Reset to clean state
  AIService._resetStateForTesting();

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n========================================================================');
  console.log(`📊 QUOTA HANDLING VERIFICATION: ${passed} PASSED / ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runQuotaTests().catch((err) => {
  console.error('Fatal error in quota test suite:', err);
  process.exit(1);
});
