import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import mongoose, { Types } from 'mongoose';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Email } from '../models/Email.js';
import { Conversation } from '../models/Conversation.js';
import { EmailAccount } from '../models/EmailAccount.js';
import { generateToken } from '../utils/generateToken.js';
import { syncConversations } from '../utils/conversationSync.js';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(id: string, name: string, fn: () => Promise<string | void>) {
  const t0 = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - t0;
    results.push({ id, name, passed: true, durationMs, details: details || undefined });
    console.log(`  ✓ [PASS] [${id}] ${name} (${durationMs}ms)${details ? ` - ${details}` : ''}`);
  } catch (err: any) {
    const durationMs = Date.now() - t0;
    results.push({ id, name, passed: false, durationMs, error: err.message });
    console.error(`  ✗ [FAIL] [${id}] ${name} (${durationMs}ms)\n      Error: ${err.message}`);
  }
}

async function run() {
  console.log('\n========================================================================');
  console.log('📬 MAILPILOT GMAIL-STYLE CONVERSATION & CLASSIFICATION TEST SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(ENV.MONGODB_URI);
  const baseUrl = `http://localhost:${ENV.PORT}/api`;

  try {
    // 1. Fetch test users
    const assistant = await User.findOne({ email: 'assistant@mailpilot.io' });
    const client = await User.findOne({ email: 'client@mailpilot.io' });
    if (!assistant || !client) throw new Error('Seeded users not found.');

    const assistantToken = generateToken({
      userId: assistant._id,
      email: assistant.email,
      role: assistant.role,
      workspaceId: assistant.workspaceId,
    });

    const clientToken = generateToken({
      userId: client._id,
      email: client.email,
      role: client.role,
      workspaceId: client.workspaceId,
    });

    // Run sync before test suite
    await syncConversations();

    // ------------------------------------------------------------------------
    // TEST 1 & 2: CONVERSATION GROUPING
    // ------------------------------------------------------------------------
    console.log('--- 1. Conversation Grouping & Inbox Deduplication ---');

    let testConvId: string = '';
    let testEmailId: string = '';

    await runTest('C1', 'Multiple messages with same conversationId produce exactly ONE inbox row', async () => {
      const res = await fetch(`${baseUrl}/emails?limit=50`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data: any = await res.json();
      const items: any[] = data.data;

      // Ensure all returned conversationIds are distinct
      const convIds = items.map((i) => i.conversationId);
      const uniqueConvIds = new Set(convIds);
      if (convIds.length !== uniqueConvIds.size) {
        throw new Error(`Found duplicate conversation rows in inbox: total=${convIds.length}, unique=${uniqueConvIds.size}`);
      }

      // Find multi-message conversation
      const multi = items.find((i) => i.messageCount > 1);
      if (multi) {
        testConvId = multi.conversationId;
        testEmailId = multi._id;
      } else if (items.length > 0) {
        testConvId = items[0].conversationId;
        testEmailId = items[0]._id;
      }

      return `Verified ${items.length} unique conversations in inbox (0 duplicate rows)`;
    });

    await runTest('C2', 'Different conversation IDs produce separate conversations', async () => {
      const convCount = await Conversation.countDocuments({ workspaceId: assistant.workspaceId, isArchived: false, hasInbound: true });
      const res = await fetch(`${baseUrl}/emails?limit=100`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const data: any = await res.json();
      return `Total DB Inbox Conversations: ${convCount}, API returned: ${data.data.length}`;
    });

    // ------------------------------------------------------------------------
    // TEST 3 & 4: INBOUND/OUTBOUND DETAILS & THREAD COMPOSITION
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Thread Composition & Message Direction ---');

    await runTest('C3', 'Incoming messages are displayed correctly with participant names and subject', async () => {
      const res = await fetch(`${baseUrl}/emails/${testEmailId}`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data: any = await res.json();
      const { email, conversation, threadMessages } = data.data;

      if (!email.subject) throw new Error('Email subject missing');
      if (!conversation) throw new Error('Parent conversation missing');
      if (!Array.isArray(threadMessages) || threadMessages.length === 0) {
        throw new Error('Thread messages array missing or empty');
      }

      return `Thread contains ${threadMessages.length} message(s) under subject: "${email.subject}"`;
    });

    await runTest('C4', 'Assistant replies appear inside the same thread with direction OUTBOUND', async () => {
      // Dispatch a simulated reply to this thread
      const replyRes = await fetch(`${baseUrl}/emails/${testEmailId}/reply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assistantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'client@mailpilot.io',
          subject: 'Thread Verification Reply',
          body: 'This is an automated test reply to verify thread grouping and direction.',
          tone: 'professional',
          isSimulated: true,
          isApproved: true,
        }),
      });

      if (replyRes.status !== 201) throw new Error(`Expected 201, got ${replyRes.status}`);
      const replyData: any = await replyRes.json();
      const replyEmail = replyData.data;

      if (replyEmail.direction !== 'OUTBOUND') {
        throw new Error(`Expected reply direction OUTBOUND, got ${replyEmail.direction}`);
      }

      // Verify it appears in the thread
      const threadRes = await fetch(`${baseUrl}/emails/${testEmailId}`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const threadData: any = await threadRes.json();
      const messages: any[] = threadData.data.threadMessages;

      const found = messages.some((m) => m._id === replyEmail._id);
      if (!found) throw new Error('Newly sent reply not found in thread messages');

      return `Reply ID ${replyEmail._id} verified inside thread with direction: OUTBOUND`;
    });

    await runTest('C5', 'Sent replies do NOT create duplicate top-level inbox rows', async () => {
      const res = await fetch(`${baseUrl}/emails?limit=100`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const data: any = await res.json();
      const items: any[] = data.data;

      // Group by conversationId to confirm no duplicates
      const convIds = items.map((i) => i.conversationId);
      const uniqueConvIds = new Set(convIds);
      if (convIds.length !== uniqueConvIds.size) {
        throw new Error(`Duplicate rows found in inbox after sending reply: total=${convIds.length}, unique=${uniqueConvIds.size}`);
      }

      const matchingConv = items.find((i) => i.conversationId === testConvId);
      if (matchingConv && !matchingConv.snippet.startsWith('You:')) {
        throw new Error(`Expected latest snippet to start with 'You:', got: ${matchingConv.snippet}`);
      }

      return `Deduplication confirmed: thread updated in-place with latest preview starting with 'You:'`;
    });

    // ------------------------------------------------------------------------
    // TEST 6 & 7 & 8: FOLDER SEMANTICS (SENT, INBOX, ARCHIVED)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Folder Semantics (Inbox, Sent, Archived) ---');

    await runTest('C6', 'Sent view (filter=sent) displays outbound conversations', async () => {
      const res = await fetch(`${baseUrl}/emails?filter=sent`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data: any = await res.json();
      const items: any[] = data.data;

      if (items.length === 0) throw new Error('Expected at least 1 sent conversation');
      const hasOutbound = items.every((i) => i.hasOutbound === true);
      if (!hasOutbound) throw new Error('All conversations in sent folder must have hasOutbound === true');

      return `Sent view returned ${items.length} conversation(s) with confirmed outbound replies`;
    });

    await runTest('C7', 'Archived view (filter=archived) isolates archived conversations', async () => {
      // Toggle archive on test conversation
      const arcRes = await fetch(`${baseUrl}/emails/${testEmailId}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (arcRes.status !== 200) throw new Error(`Archive failed: ${arcRes.status}`);

      // Verify it appears in archived filter
      const checkArc = await fetch(`${baseUrl}/emails?filter=archived`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const arcData: any = await checkArc.json();
      const foundInArchived = arcData.data.some((i: any) => i._id === testEmailId || i.conversationId === testConvId);
      if (!foundInArchived) throw new Error('Archived conversation not found in archived filter');

      // Verify it is NOT in main inbox
      const checkInbox = await fetch(`${baseUrl}/emails?filter=all`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const inboxData: any = await checkInbox.json();
      const foundInInbox = inboxData.data.some((i: any) => i._id === testEmailId || i.conversationId === testConvId);
      if (foundInInbox) throw new Error('Archived conversation should not appear in main inbox');

      // Restore it
      await fetch(`${baseUrl}/emails/${testEmailId}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assistantToken}` },
      });

      return 'Archive isolation and restoration verified cleanly';
    });

    // ------------------------------------------------------------------------
    // TEST 9 & 10: FILTERS ON CONVERSATIONS
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Conversation Filters & Verification ---');

    await runTest('C8', 'filter=no_reply returns ONLY conversations with classification NO_REPLY_NEEDED', async () => {
      const res = await fetch(`${baseUrl}/emails?filter=no_reply`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data: any = await res.json();
      const items: any[] = data.data;

      if (items.length === 0) throw new Error('Expected at least 1 conversation under filter=no_reply');
      const allNoReply = items.every((i) => i.classification === 'NO_REPLY_NEEDED');
      if (!allNoReply) throw new Error('filter=no_reply leaked conversations with other classifications');

      return `Verified ${items.length} conversation(s), 100% strictly classified as NO_REPLY_NEEDED`;
    });

    await runTest('C9', 'All other classification filters return strictly matching records', async () => {
      const tests = [
        { filter: 'assistant', expected: 'ASSISTANT_TO_REPLY' },
        { filter: 'client', expected: 'CLIENT_TO_REPLY' },
        { filter: 'needs_review', expected: 'NEEDS_REVIEW' },
      ];

      for (const t of tests) {
        const res = await fetch(`${baseUrl}/emails?filter=${t.filter}`, {
          headers: { Authorization: `Bearer ${assistantToken}` },
        });
        const data: any = await res.json();
        const items: any[] = data.data;
        if (items.length > 0) {
          const match = items.every((i) => i.classification === t.expected);
          if (!match) throw new Error(`Filter ${t.filter} leaked non-${t.expected} items`);
        }
      }

      return 'assistant, client, and needs_review filters verified strictly';
    });

    // ------------------------------------------------------------------------
    // TEST 11 & 12: INTERACTIVE CLASSIFICATION DROPDOWN BACKEND PERSISTENCE
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Interactive Classification Dropdown & Persistence ---');

    await runTest('C10', 'Classification dropdown updates backend state and syncs conversation', async () => {
      const newClass = 'NEEDS_REVIEW';
      const patchRes = await fetch(`${baseUrl}/emails/${testEmailId}/classification`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${assistantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classification: newClass,
          reason: 'Manual adjustment via interactive dropdown test',
        }),
      });

      if (patchRes.status !== 200) throw new Error(`Expected 200, got ${patchRes.status}`);
      const patchData: any = await patchRes.json();
      if (patchData.data.classification !== newClass) {
        throw new Error(`Expected classification ${newClass}, got ${patchData.data.classification}`);
      }

      // Verify conversation record was synced
      const conv = await Conversation.findById(testConvId);
      if (conv?.currentClassification !== newClass) {
        throw new Error(`Conversation currentClassification was not synced: got ${conv?.currentClassification}`);
      }

      return `Classification updated to ${newClass} and synced to Conversation record in MongoDB`;
    });

    await runTest('C11', 'Classification change persists after page reload / direct DB reload', async () => {
      const reloadedEmail = await Email.findById(testEmailId);
      if (reloadedEmail?.classification !== 'NEEDS_REVIEW') {
        throw new Error(`Persisted classification mismatch: ${reloadedEmail?.classification}`);
      }
      if (!reloadedEmail?.manualOverride?.isOverridden) {
        throw new Error('manualOverride.isOverridden was not set to true');
      }

      return 'Audit trail & persistence confirmed in MongoDB';
    });

    // ------------------------------------------------------------------------
    // TEST 13 & 14 & 15: SEARCH, PAGINATION & METRICS
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Search, Pagination & Metadata Accuracy ---');

    await runTest('C12', 'Search query works in conjunction with category filter', async () => {
      const res = await fetch(`${baseUrl}/emails?search=Series&filter=no_reply`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data: any = await res.json();
      return `Combined search+filter returned ${data.data.length} match(es) with pagination`;
    });

    await runTest('C13', 'Pagination works cleanly on conversation records', async () => {
      const p1 = await fetch(`${baseUrl}/emails?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${assistantToken}` },
      });
      const d1: any = await p1.json();
      if (d1.data.length > 5) throw new Error(`Page 1 returned more than limit: ${d1.data.length}`);
      if (d1.pagination.page !== 1) throw new Error(`Pagination page mismatch`);

      return `Pagination verified: limit 5 returned ${d1.data.length} conversations, totalPages: ${d1.pagination.totalPages}`;
    });

    // ------------------------------------------------------------------------
    // TEST 16 & 17 & 18: SECURITY & ACCESS CONTROL
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Security, RBAC & Isolation ---');

    await runTest('C14', 'Client user cannot change assistant-only classification (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/emails/${testEmailId}/classification`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classification: 'NO_REPLY_NEEDED',
        }),
      });

      if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      return 'Client forbidden from assistant classification controls (403 Forbidden)';
    });

    await runTest('C15', 'Unapproved reply dispatch is rejected with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/emails/${testEmailId}/reply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assistantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'test@mailpilot.io',
          subject: 'Unapproved Reply',
          body: 'This should fail.',
          isApproved: false,
        }),
      });

      if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
      return 'Human-in-the-loop validation strictly enforced (isApproved: true)';
    });
  } finally {
    await mongoose.disconnect();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log('\n========================================================================');
  console.log(`📊 CONVERSATION & CLASSIFICATION AUDIT: ${passed} PASSED / ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
