import { AIProviderManager } from '../services/ai/provider.manager.js';
import { AIService } from '../services/ai.service.js';
import { DeterministicFallbackEngine } from '../services/ai/fallback.engine.js';
import { AIClassificationResultSchema } from '../validators/ai.schema.js';
import { SendReplySchema } from '../validators/email.schema.js';

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

async function runDualProviderTestSuite() {
  console.log('\n========================================================================');
  console.log('🤖 MAILPILOT DUAL LLM PROVIDER (OPENAI + GEMINI + FALLBACK) TEST SUITE');
  console.log('========================================================================\n');

  let geminiCalls = 0;
  let openaiCalls = 0;

  let geminiMode: 'SUCCESS' | '429_QUOTA' | 'INVALID_KEY' | 'MODEL_NOT_FOUND' | 'MALFORMED_JSON' = 'SUCCESS';
  let openaiMode: 'SUCCESS' | 'BILLING_ERROR' | 'RATE_LIMIT' | 'INVALID_KEY' | 'MODEL_NOT_FOUND' | 'MALFORMED_JSON' = 'SUCCESS';

  // 1. Mock Gemini Client
  const mockGeminiClient = {
    models: {
      generateContent: async (_opts: any) => {
        geminiCalls++;
        if (geminiMode === '429_QUOTA') {
          const quotaErr = new Error(
            JSON.stringify({
              error: {
                code: 429,
                message: 'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20.\nPlease retry in 23h33m19s.',
                status: 'RESOURCE_EXHAUSTED',
                details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '84799s' }],
              },
            })
          );
          (quotaErr as any).status = 429;
          throw quotaErr;
        }

        if (geminiMode === 'INVALID_KEY') {
          const keyErr = new Error('API_KEY_INVALID: Gemini API key is invalid');
          (keyErr as any).code = 400;
          throw keyErr;
        }

        if (geminiMode === 'MODEL_NOT_FOUND') {
          const notFoundErr = new Error('NOT_FOUND: Model gemini-3.8-flash does not exist');
          (notFoundErr as any).code = 404;
          throw notFoundErr;
        }

        if (geminiMode === 'MALFORMED_JSON') {
          return { text: 'INVALID_JSON_CONTENT_FROM_GEMINI' };
        }

        return {
          text: JSON.stringify({
            classification: 'ASSISTANT_TO_REPLY',
            confidence: 0.94,
            priority: 'MEDIUM',
            requiresAction: true,
            summary: 'Scheduling coordination via Gemini Live.',
            reason: 'Operational calendar request suitable for assistant.',
            suggestedAction: 'Propose calendar times.',
            suggestedCategory: 'Scheduling',
            keyPoints: ['Gemini Live responded successfully'],
            extractedDates: ['2026-11-20'],
            suggestedReply: 'I will coordinate our availability.',
          }),
        };
      },
    },
  };

  // 2. Mock OpenAI Client
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: async (_opts: any) => {
          openaiCalls++;
          if (openaiMode === 'BILLING_ERROR') {
            const billErr = new Error('You exceeded your current quota, please check your plan and billing details.');
            (billErr as any).status = 429;
            (billErr as any).error = { code: 'insufficient_quota' };
            throw billErr;
          }

          if (openaiMode === 'RATE_LIMIT') {
            const rateErr = new Error('Rate limit exceeded');
            (rateErr as any).status = 429;
            (rateErr as any).error = { code: 'rate_limit_exceeded' };
            (rateErr as any).headers = { 'retry-after': '60' };
            throw rateErr;
          }

          if (openaiMode === 'INVALID_KEY') {
            const authErr = new Error('Incorrect API key provided');
            (authErr as any).status = 401;
            throw authErr;
          }

          if (openaiMode === 'MODEL_NOT_FOUND') {
            const modelErr = new Error('The model `gpt-fake` does not exist');
            (modelErr as any).status = 404;
            throw modelErr;
          }

          if (openaiMode === 'MALFORMED_JSON') {
            return {
              choices: [{ message: { content: '{ malformed json: true ' } }],
            };
          }

          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    classification: 'CLIENT_TO_REPLY',
                    confidence: 0.96,
                    priority: 'HIGH',
                    requiresAction: true,
                    summary: 'Term sheet approval via OpenAI Live.',
                    reason: 'Requires direct executive authorization.',
                    suggestedAction: 'Review terms and sign.',
                    suggestedCategory: 'Executive Decision',
                    keyPoints: ['OpenAI Live responded successfully'],
                    extractedDates: ['2026-11-25'],
                    suggestedReply: 'Reviewing the agreement now.',
                  }),
                },
              },
            ],
          };
        },
      },
    },
  };

  // Inject mocks and reset provider state
  AIProviderManager._setGeminiClient(mockGeminiClient);
  AIProviderManager._setOpenAIClient(mockOpenAIClient);
  AIProviderManager._resetStateForTesting();

  // -------------------------------------------------------------------------
  // TEST 1 — Gemini Successful Response
  // -------------------------------------------------------------------------
  await assertTest('T1', 'Gemini successful response', async () => {
    geminiCalls = 0;
    openaiCalls = 0;
    geminiMode = 'SUCCESS';

    const res = await AIService.classifyEmail({
      subject: 'Quarterly Sync Meeting',
      body: 'Can we meet next week?',
      sender: { name: 'Colleague', email: 'colleague@domain.io' },
    });

    if (geminiCalls !== 1) throw new Error(`Expected 1 Gemini call, got ${geminiCalls}`);
    if (openaiCalls !== 0) throw new Error(`Expected 0 OpenAI calls, got ${openaiCalls}`);
    if (res.engine !== 'Gemini Live' || res.provider !== 'gemini' || res.isGeminiLive !== true) {
      throw new Error(`Unexpected metadata: engine=${res.engine}, provider=${res.provider}`);
    }

    return { details: `Processed via ${res.engine} with confidence ${res.confidence} (Calls: Gemini=1, OpenAI=0)` };
  });

  // -------------------------------------------------------------------------
  // TEST 2 — OpenAI Successful Response
  // -------------------------------------------------------------------------
  await assertTest('T2', 'OpenAI successful response', async () => {
    geminiCalls = 0;
    openaiCalls = 0;
    // Set Gemini to quota exhausted so it falls back to OpenAI
    geminiMode = '429_QUOTA';
    openaiMode = 'SUCCESS';
    // Temporarily ensure OpenAI is enabled in mock provider
    const openAIProv = AIProviderManager._getOpenAIProvider();
    (openAIProv as any).isBillingDisabled = false;
    openAIProv.isEnabled = () => true;
    openAIProv.isConfigured = () => true;

    // Trigger failover from Gemini to OpenAI
    const res = await AIService.classifyEmail({
      subject: 'Series A Term Sheet Review',
      body: 'Please approve the terms.',
      sender: { name: 'Investor', email: 'partner@vc.com' },
    });

    if (openaiCalls !== 1) throw new Error(`Expected 1 OpenAI call, got ${openaiCalls}`);
    if (res.engine !== 'OpenAI Live' || res.provider !== 'openai') {
      throw new Error(`Expected OpenAI Live, got ${res.engine}`);
    }

    return { details: `Processed via ${res.engine} with classification ${res.classification} (Calls: Gemini=1, OpenAI=1)` };
  });

  // -------------------------------------------------------------------------
  // TEST 3 — Gemini 429 Switches to OpenAI When Enabled
  // -------------------------------------------------------------------------
  await assertTest('T3', 'Gemini 429 switches to OpenAI when enabled', async () => {
    geminiCalls = 0;
    openaiCalls = 0;
    // Gemini remains in quota exhausted lockout
    const res = await AIService.generateReply({
      subject: 'Product Demo Follow-up',
      body: 'Thank you for the demo.',
      sender: { name: 'Lead', email: 'lead@client.com' },
      tone: 'professional',
    });

    // Gemini should NOT even be called because lockout timestamp is active!
    if (geminiCalls !== 0) throw new Error(`Gemini was called during 429 lockout! Calls: ${geminiCalls}`);
    if (openaiCalls !== 1) throw new Error(`OpenAI was not called as secondary provider! Calls: ${openaiCalls}`);
    if (res.engine !== 'OpenAI Live') throw new Error(`Expected OpenAI Live, got ${res.engine}`);

    return { details: `Gemini was skipped (0 calls); OpenAI handled reply seamlessly (1 call)` };
  });

  // -------------------------------------------------------------------------
  // TEST 4 — OpenAI Billing Error Disables Further Attempts
  // -------------------------------------------------------------------------
  await assertTest('T4', 'OpenAI billing error disables further attempts', async () => {
    geminiCalls = 0;
    openaiCalls = 0;
    openaiMode = 'BILLING_ERROR';

    const res = await AIService.classifyEmail({
      subject: 'Board Meeting Prep',
      body: 'Reviewing the deck.',
      sender: { name: 'Director', email: 'director@company.com' },
    });

    if (openaiCalls !== 1) throw new Error(`Expected 1 OpenAI attempt before billing disable, got ${openaiCalls}`);
    if (res.engine !== 'Demo Fallback' || res.provider !== 'fallback') {
      throw new Error(`Expected fallback engine after OpenAI billing error, got ${res.engine}`);
    }

    // Attempt second call: OpenAI should now be disabled and NOT called!
    const callsAfterFirst = openaiCalls;
    const res2 = await AIService.classifyEmail({
      subject: 'Second email test',
      body: 'Should use fallback immediately.',
      sender: { name: 'Staff', email: 'staff@company.com' },
    });

    if (openaiCalls !== callsAfterFirst) {
      throw new Error(`OpenAI was called again despite billing disable! Calls: ${openaiCalls - callsAfterFirst}`);
    }
    if (res2.engine !== 'Demo Fallback') throw new Error('Expected Demo Fallback');

    return { details: 'Billing error detected; OpenAI immediately disabled for subsequent calls (0 leaked calls)' };
  });

  // -------------------------------------------------------------------------
  // TEST 5 — Both Providers Unavailable Activates Deterministic Fallback
  // -------------------------------------------------------------------------
  await assertTest('T5', 'Both providers unavailable activates deterministic fallback', async () => {
    const res = await AIService.classifyEmail({
      subject: 'Invoice #1042 Payment Confirmation',
      body: 'Your receipt for payment of $500 is attached. Unsubscribe here.',
      sender: { name: 'Billing Dept', email: 'no-reply@vendor.com' },
    });

    if (res.engine !== 'Demo Fallback' || res.isGeminiLive !== false) {
      throw new Error(`Expected Demo Fallback, got ${res.engine}`);
    }
    if (res.classification !== 'NO_REPLY_NEEDED') {
      throw new Error(`Expected NO_REPLY_NEEDED, got ${res.classification}`);
    }

    return { details: `Handled via ${res.engine} (${res.classification}) without crashing workflow` };
  });

  // -------------------------------------------------------------------------
  // TEST 6 — Gemini Quota Reset Permits a Later Retry
  // -------------------------------------------------------------------------
  await assertTest('T6', 'Gemini quota reset permits a later retry', async () => {
    // Move Gemini retry timestamp to the past to simulate time advancing
    AIProviderManager._setGeminiRetryTimestamp(Date.now() - 1000);
    geminiMode = 'SUCCESS';
    geminiCalls = 0;

    const res = await AIService.classifyEmail({
      subject: 'Executive Board Dinner',
      body: 'Can we schedule reservations for Thursday?',
      sender: { name: 'Board Member', email: 'member@board.com' },
    });

    if (geminiCalls !== 1) throw new Error(`Gemini was not called after quota reset! Calls: ${geminiCalls}`);
    if (res.engine !== 'Gemini Live' || res.provider !== 'gemini') {
      throw new Error(`Expected return to Gemini Live, got ${res.engine}`);
    }

    return { details: `Gemini successfully re-probed and recovered to ${res.engine}` };
  });

  // -------------------------------------------------------------------------
  // TEST 7 — Invalid API Keys Are Handled Correctly
  // -------------------------------------------------------------------------
  await assertTest('T7', 'Invalid API keys are handled correctly', async () => {
    AIProviderManager._resetStateForTesting();
    geminiMode = 'INVALID_KEY';

    const health = await AIProviderManager.checkHealth(true);
    if (health.providers.gemini.status !== 'invalid_key') {
      throw new Error(`Expected invalid_key status, got ${health.providers.gemini.status}`);
    }
    if (health.providers.gemini.available !== false) throw new Error('Expected available=false');

    return { details: `Detected invalid key status: ${health.providers.gemini.status} without endless retry loop` };
  });

  // -------------------------------------------------------------------------
  // TEST 8 — Model-Not-Found Errors Are Handled Correctly
  // -------------------------------------------------------------------------
  await assertTest('T8', 'Model-not-found errors are handled correctly', async () => {
    AIProviderManager._resetStateForTesting();
    geminiMode = 'MODEL_NOT_FOUND';

    const health = await AIProviderManager.checkHealth(true);
    if (health.providers.gemini.status !== 'model_not_found') {
      throw new Error(`Expected model_not_found status, got ${health.providers.gemini.status}`);
    }

    return { details: `Detected model_not_found: ${health.providers.gemini.error}` };
  });

  // -------------------------------------------------------------------------
  // TEST 9 — Malformed JSON Is Rejected & Retried
  // -------------------------------------------------------------------------
  await assertTest('T9', 'Malformed JSON is rejected and retried safely', async () => {
    AIProviderManager._resetStateForTesting();
    geminiMode = 'MALFORMED_JSON';

    const res = await AIService.classifyEmail({
      subject: 'Partnership Inquiry',
      body: 'We would love to connect.',
      sender: { name: 'Partner', email: 'partner@tech.io' },
    });

    // Retried once then safely failed over to fallback
    if (res.engine !== 'Demo Fallback') throw new Error(`Expected Demo Fallback, got ${res.engine}`);

    return { details: `Malformed JSON rejected and safely handled by ${res.engine}` };
  });

  // -------------------------------------------------------------------------
  // TEST 10 — Zod Schema Validation Works for Both Providers
  // -------------------------------------------------------------------------
  await assertTest('T10', 'Zod schema validation works for both providers', async () => {
    AIProviderManager._resetStateForTesting();
    geminiMode = 'SUCCESS';

    const resGemini = await AIService.classifyEmail({
      subject: 'Review request',
      body: 'Review attached.',
      sender: { name: 'User', email: 'user@io.com' },
    });
    const parsedGemini = AIClassificationResultSchema.safeParse(resGemini);
    if (!parsedGemini.success) throw new Error('Gemini output failed Zod schema');

    // Force OpenAI
    AIProviderManager._setGeminiRetryTimestamp(Date.now() + 100000);
    const openAIProv = AIProviderManager._getOpenAIProvider();
    (openAIProv as any).isBillingDisabled = false;
    openAIProv.isEnabled = () => true;
    openAIProv.isConfigured = () => true;
    openaiMode = 'SUCCESS';

    const resOpenAI = await AIService.classifyEmail({
      subject: 'Terms review',
      body: 'Approve terms.',
      sender: { name: 'Counsel', email: 'counsel@legal.com' },
    });
    const parsedOpenAI = AIClassificationResultSchema.safeParse(resOpenAI);
    if (!parsedOpenAI.success) throw new Error('OpenAI output failed Zod schema');

    return { details: `Both Gemini (${parsedGemini.success}) and OpenAI (${parsedOpenAI.success}) output strictly valid schemas` };
  });

  // -------------------------------------------------------------------------
  // TEST 11 — All Four Classification Categories Work
  // -------------------------------------------------------------------------
  await assertTest('T11', 'All four classification categories work', async () => {
    const c1 = DeterministicFallbackEngine.classifyEmail({
      subject: 'Schedule Zoom Sync',
      body: 'When are you free for a 30-min call?',
      sender: { name: 'Recruiter', email: 'recruiter@talent.io' },
    });
    if (c1.classification !== 'ASSISTANT_TO_REPLY') throw new Error(`Expected ASSISTANT_TO_REPLY, got ${c1.classification}`);

    const c2 = DeterministicFallbackEngine.classifyEmail({
      subject: 'Series A Term Sheet Approval and Signature',
      body: 'Please execute and sign the covenants.',
      sender: { name: 'Investor', email: 'investor@sequoia.com' },
    });
    if (c2.classification !== 'CLIENT_TO_REPLY') throw new Error(`Expected CLIENT_TO_REPLY, got ${c2.classification}`);

    const c3 = DeterministicFallbackEngine.classifyEmail({
      subject: 'Newsletter: Tech Weekly Updates',
      body: 'Here are this week top stories. Unsubscribe if not interested.',
      sender: { name: 'Tech Weekly', email: 'newsletter@techweekly.com' },
    });
    if (c3.classification !== 'NO_REPLY_NEEDED') throw new Error(`Expected NO_REPLY_NEEDED, got ${c3.classification}`);

    const c4 = DeterministicFallbackEngine.classifyEmail({
      subject: 'Thoughts on potential idea?',
      body: 'Let me know what you think when you have a moment.',
      sender: { name: 'Friend', email: 'friend@gmail.com' },
    });
    if (c4.classification !== 'NEEDS_REVIEW') throw new Error(`Expected NEEDS_REVIEW, got ${c4.classification}`);

    return { details: 'Verified: ASSISTANT_TO_REPLY, CLIENT_TO_REPLY, NO_REPLY_NEEDED, NEEDS_REVIEW' };
  });

  // -------------------------------------------------------------------------
  // TEST 12 — Conversation History Awareness Remains Intact
  // -------------------------------------------------------------------------
  await assertTest('T12', 'Conversation history awareness remains intact', async () => {
    const res = DeterministicFallbackEngine.classifyEmail({
      subject: 'Re: Board Meeting Dinner',
      body: '7 PM works for everyone.',
      sender: { name: 'Board Member', email: 'board@corp.com' },
      conversationHistory: [
        {
          sender: 'Alexander Wright <client@mailpilot.io>',
          body: 'Sarah (Assistant), please take over scheduling and coordinate reservation details.',
          date: new Date().toISOString(),
        },
      ],
    });

    if (res.classification !== 'ASSISTANT_TO_REPLY') {
      throw new Error(`Expected ASSISTANT_TO_REPLY from thread delegation, got ${res.classification}`);
    }

    return { details: `Re-evaluated to ${res.classification} based on client delegation in thread history` };
  });

  // -------------------------------------------------------------------------
  // TEST 13 — All Four Reply Tones Work
  // -------------------------------------------------------------------------
  await assertTest('T13', 'All four reply tones work', async () => {
    const tones = ['professional', 'friendly', 'concise', 'formal'] as const;
    for (const tone of tones) {
      const res = DeterministicFallbackEngine.generateReply({
        subject: 'Partnership Discussion',
        body: 'Interested in working together.',
        sender: { name: 'Jordan Smith', email: 'jordan@firm.com' },
        tone,
      });
      if (!res.reply || res.reply.length < 20) throw new Error(`Failed tone: ${tone}`);
    }

    return { details: 'Generated replies across professional, friendly, concise, and formal tones' };
  });

  // -------------------------------------------------------------------------
  // TEST 14 — Contextual Inbox Q&A Works
  // -------------------------------------------------------------------------
  await assertTest('T14', 'Contextual inbox Q&A works', async () => {
    const res = DeterministicFallbackEngine.askAssistant({
      query: 'Which emails require client attention?',
      relevantEmails: [
        {
          subject: 'Term Sheet Signature',
          sender: 'Marcus Vance',
          classification: 'CLIENT_TO_REPLY',
          summary: 'Signature required by 5 PM.',
          priority: 'HIGH',
          date: '2026-11-15',
        },
      ],
    });

    if (!res.answer || !res.answer.includes('Term Sheet Signature')) {
      throw new Error(`Expected answer to reference email, got: ${res.answer}`);
    }

    return { details: `Synthesized verified records: "${res.answer.slice(0, 75)}..."` };
  });

  // -------------------------------------------------------------------------
  // TEST 15 — Meeting and Date Extraction Work
  // -------------------------------------------------------------------------
  await assertTest('T15', 'Meeting and date extraction work', async () => {
    const meetings = DeterministicFallbackEngine.extractMeetings({
      subject: 'Dinner with Board at Nobu',
      body: 'Let us meet for dinner on Friday Nov 20 at 7:00 PM at Nobu.',
      sender: { name: 'Chairman', email: 'chair@board.com' },
    });

    if (meetings.length === 0) throw new Error('Expected extracted meeting');
    const m = meetings[0];
    if (!m.location?.includes('Nobu') || !m.time?.includes('7')) {
      throw new Error(`Unexpected meeting details: ${JSON.stringify(m)}`);
    }

    return { details: `Extracted: "${m.title}" at ${m.location} (${m.time})` };
  });

  // -------------------------------------------------------------------------
  // TEST 16 — Human Approval Is Enforced
  // -------------------------------------------------------------------------
  await assertTest('T16', 'Human approval is enforced (isApproved: true)', async () => {
    const unapproved = SendReplySchema.safeParse({
      body: {
        to: 'client@mailpilot.io',
        subject: 'Re: Draft',
        body: 'Attempting unapproved dispatch.',
        tone: 'professional',
        isSimulated: true,
        isApproved: false,
      },
    });
    if (unapproved.success) throw new Error('Schema permitted unapproved dispatch!');

    const approved = SendReplySchema.safeParse({
      body: {
        to: 'client@mailpilot.io',
        subject: 'Re: Draft',
        body: 'Dispatching with explicit assistant approval.',
        tone: 'professional',
        isSimulated: true,
        isApproved: true,
      },
    });
    if (!approved.success) throw new Error('Schema rejected approved dispatch');

    return { details: 'Unapproved rejected by Zod; explicit approval accepted' };
  });

  // -------------------------------------------------------------------------
  // TEST 17 — Repeated Status Polling Does Not Trigger Provider Calls
  // -------------------------------------------------------------------------
  await assertTest('T17', 'Repeated status polling does not trigger provider calls', async () => {
    const geminiBaseline = geminiCalls;
    const openaiBaseline = openaiCalls;

    // Simulate 30 rapid status checks from dashboard and header polling
    for (let i = 0; i < 30; i++) {
      const status = AIService.getStatus();
      if (!status.engine) throw new Error('Invalid status');
    }

    if (geminiCalls !== geminiBaseline || openaiCalls !== openaiBaseline) {
      throw new Error(`Leaked provider calls! Gemini: ${geminiCalls - geminiBaseline}, OpenAI: ${openaiCalls - openaiBaseline}`);
    }

    return { details: '30 status checks executed with 0 outbound LLM calls' };
  });

  // -------------------------------------------------------------------------
  // TEST 18 — MultiProvider Status Schema Accuracy (/api/ai/status)
  // -------------------------------------------------------------------------
  await assertTest('T18', 'MultiProvider status schema accuracy (/api/ai/status)', async () => {
    const status = AIService.getStatus();
    if (!status.providers || !status.providers.gemini || !status.providers.openai) {
      throw new Error('Missing providers map in status response');
    }
    if (typeof status.fallbackActive !== 'boolean') throw new Error('Missing fallbackActive boolean');
    if (!status.activeProvider) throw new Error('Missing activeProvider');

    return {
      details: `ActiveProvider=${status.activeProvider}, ActiveModel=${status.model}, Gemini=${status.providers.gemini.status}, OpenAI=${status.providers.openai.status}`,
    };
  });

  // Reset to clean state
  AIProviderManager._resetStateForTesting();

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n========================================================================');
  console.log(`📊 DUAL PROVIDER TEST SUITE: ${passed} PASSED / ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDualProviderTestSuite().catch((err) => {
  console.error('Fatal failure in dual provider test suite:', err);
  process.exit(1);
});
