import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import app from '../app.js';
import http from 'http';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, category, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, category, passed: false, error: err.message, durationMs: Date.now() - start });
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
  }
}

async function start() {
  console.log('\n======================================================');
  console.log('🧪 MAILPILOT SENIOR QA AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  await mongoose.connect(ENV.MONGODB_URI);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5001, () => resolve()));
  const baseUrl = 'http://127.0.0.1:5001/api';

  try {
    // CATEGORY 1: HEALTH & CONFIG
    console.log('\n--- 1. Health & Config Verification ---');
    await runTest('Health', 'Health endpoint returns 200 & healthy status', async () => {
      const res = await fetch(`${baseUrl}/health`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.status !== 'healthy') throw new Error(`Expected healthy, got ${data.status}`);
    });

    // CATEGORY 2: AUTHENTICATION & SESSIONS
    console.log('\n--- 2. Authentication & Session Validation ---');
    let assistantToken = '';
    let clientToken = '';
    let assistantWorkspaceId = '';

    await runTest('Auth', 'Assistant demo login succeeds with JWT token', async () => {
      const res = await fetch(`${baseUrl}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ASSISTANT' }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.token || data.user.role !== 'ASSISTANT') throw new Error('Invalid token/role response');
      assistantToken = data.token;
      assistantWorkspaceId = data.user.workspaceId;
    });

    await runTest('Auth', 'Client demo login succeeds with JWT token', async () => {
      const res = await fetch(`${baseUrl}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'CLIENT' }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.token || data.user.role !== 'CLIENT') throw new Error('Invalid token/role response');
      clientToken = data.token;
    });

    await runTest('Auth', 'Rejects requests without authorization header', async () => {
      const res = await fetch(`${baseUrl}/emails`);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    // CATEGORY 3: DASHBOARD STATS & WORKSPACE ISOLATION
    console.log('\n--- 3. Workspace Isolation & Dashboard Statistics ---');
    await runTest('Dashboard', 'Calculates real database counts for dashboard statistics', async () => {
      const res = await fetch(`${baseUrl}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (typeof data.data.totalEmails !== 'number' || data.data.totalEmails < 1) {
        throw new Error(`Expected non-zero totalEmails, got ${data.data.totalEmails}`);
      }
      if (typeof data.data.clientAttention !== 'number') {
        throw new Error('Missing clientAttention count');
      }
    });

    // CATEGORY 4: EMAIL MANAGEMENT & FILTERS
    console.log('\n--- 4. Email Management, Filters & Search ---');
    let testEmailId = '';
    let testConversationId = '';

    await runTest('Emails', 'Fetches synchronized email list with pagination', async () => {
      const res = await fetch(`${baseUrl}/emails?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.data || data.data.length === 0) throw new Error('Email list is empty');
      testEmailId = data.data[0]._id;
      testConversationId = data.data[0].conversationId;
    });

    await runTest('Emails', 'Filters by classification (CLIENT_TO_REPLY)', async () => {
      const res = await fetch(`${baseUrl}/emails?classification=CLIENT_TO_REPLY`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const data = await res.json();
      for (const email of data.data) {
        if (email.classification !== 'CLIENT_TO_REPLY') {
          throw new Error(`Expected CLIENT_TO_REPLY, found ${email.classification}`);
        }
      }
    });

    await runTest('Emails', 'Searches emails by keyword with debouncing compatibility', async () => {
      const res = await fetch(`${baseUrl}/emails?search=Term`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const data = await res.json();
      if (!data.data || data.data.length === 0) throw new Error('Search failed to find seeded Term Sheet email');
    });

    // CATEGORY 5: MANUAL CLASSIFICATION OVERRIDES & AUDIT LOGS
    console.log('\n--- 5. Manual Classification Override & Audit Trail ---');
    await runTest('Classification', 'Manually adjusts classification and records override audit trail', async () => {
      const res = await fetch(`${baseUrl}/emails/${testEmailId}/classification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantToken}`,
        },
        body: JSON.stringify({
          classification: 'CLIENT_TO_REPLY',
          reason: 'Senior QA Audit test adjustment',
        }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.data.classification !== 'CLIENT_TO_REPLY') throw new Error('Classification not updated');
      if (!data.data.manualOverride?.isOverridden) throw new Error('Manual override flag not recorded');
    });

    // CATEGORY 6: CLIENT WORKSPACE & ACTIONS
    console.log('\n--- 6. Client Workspace: Attention, Handling & Delegation ---');
    await runTest('Client', 'Client attention endpoint returns only pending client decisions', async () => {
      const res = await fetch(`${baseUrl}/client/attention`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      for (const e of data.data.emails) {
        if (e.classification !== 'CLIENT_TO_REPLY' || e.status !== 'PENDING') {
          throw new Error(`Invalid item in client attention: status=${e.status}, class=${e.classification}`);
        }
      }
    });

    await runTest('Client', 'Client marks matter as handled ("I\'ll Handle This")', async () => {
      const res = await fetch(`${baseUrl}/client/emails/${testEmailId}/handle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({ clientNotes: 'Handled directly during QA verification.' }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.data.status !== 'HANDLED') throw new Error(`Expected HANDLED, got ${data.data.status}`);
    });

    await runTest('Client', 'Client delegates matter to assistant ("Delegate to Assistant")', async () => {
      // Re-delegate
      const res = await fetch(`${baseUrl}/client/emails/${testEmailId}/delegate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({ delegationReason: 'Assistant should handle booking.' }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.data.status !== 'DELEGATED' || data.data.classification !== 'ASSISTANT_TO_REPLY') {
        throw new Error(`Expected DELEGATED & ASSISTANT_TO_REPLY, got ${data.data.status} & ${data.data.classification}`);
      }
    });

    // CATEGORY 7: AI CLASSIFICATION, SUMMARIZATION & REPLY GENERATION
    console.log('\n--- 7. AI Engine (Gemini / Hybrid Fallback) ---');
    await runTest('AI', 'Generates contextual email reply with tone selection', async () => {
      const res = await fetch(`${baseUrl}/ai/generate-reply/${testConversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantToken}`,
        },
        body: JSON.stringify({ tone: 'friendly' }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.data.reply || data.data.reply.length < 10) throw new Error('Reply too short or missing');
    });

    await runTest('AI', 'Answers contextual questions using actual database records', async () => {
      const res = await fetch(`${baseUrl}/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantToken}`,
        },
        body: JSON.stringify({ query: 'Which emails require client attention?' }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.data.answer || data.data.answer.length < 15) throw new Error('Answer missing or invalid');
    });

    // CATEGORY 8: TASKS & CONNECTED ACCOUNTS
    console.log('\n--- 8. Operational Follow-ups & Account Sync ---');
    await runTest('Accounts', 'Lists connected Google & Outlook accounts', async () => {
      const res = await fetch(`${baseUrl}/accounts`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.data || data.data.length < 2) throw new Error('Expected at least 2 connected accounts');
    });

    await runTest('Tasks', 'Lists follow-up reminders and extracted calendar meetings', async () => {
      const res = await fetch(`${baseUrl}/tasks`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.data || data.data.length < 2) throw new Error('Expected at least 2 tasks');
    });
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  // SUMMARY REPORT
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log('\n======================================================');
  console.log(`📊 TEST EXECUTION SUMMARY: ${passed} PASSED / ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

start().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
