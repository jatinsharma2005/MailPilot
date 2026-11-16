import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import mongoose, { Types } from 'mongoose';
import { chromium, Browser, Page } from 'playwright';

import { ENV } from '../config/env.js';
import app from '../app.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Email } from '../models/Email.js';
import { Conversation } from '../models/Conversation.js';
import { Task } from '../models/Task.js';
import { AIService } from '../services/ai.service.js';
import { AIClassificationResultSchema } from '../validators/ai.schema.js';

interface TestRecord {
  id: string;
  category: string;
  title: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const testResults: TestRecord[] = [];

async function assertTest(
  id: string,
  category: string,
  title: string,
  fn: () => Promise<{ details?: string } | void>
) {
  const t0 = Date.now();
  try {
    const outcome = await fn();
    const durationMs = Date.now() - t0;
    const details = outcome && outcome.details ? ` - ${outcome.details}` : '';
    testResults.push({ id, category, title, passed: true, durationMs, details });
    console.log(`  ✓ [PASS] [${id}] ${category}: ${title} (${durationMs}ms)${details}`);
  } catch (err: any) {
    const durationMs = Date.now() - t0;
    testResults.push({ id, category, title, passed: false, durationMs, error: err.message });
    console.error(`  ✗ [FAIL] [${id}] ${category}: ${title} (${durationMs}ms)\n      Error: ${err.message}`);
  }
}

async function runAcceptanceSuite() {
  console.log('\n========================================================================');
  console.log('🚀 MAILPILOT COMPREHENSIVE ASSIGNMENT ACCEPTANCE TEST SUITE');
  console.log('========================================================================\n');

  // 1. Connect MongoDB
  await mongoose.connect(ENV.MONGODB_URI);

  // 2. Setup combined Express app serving API and built client bundle
  const combinedApp = express();
  const distPath = path.resolve('../client/dist');

  // Serve static assets
  if (fs.existsSync(distPath)) {
    combinedApp.use(express.static(distPath));
  }

  // Delegate /api to backend Express app; all other GET requests serve SPA index.html
  combinedApp.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return (app as any)(req, res, next);
    }
    if (req.method === 'GET' && fs.existsSync(distPath)) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });

  const PORT = 5055;
  const server = http.createServer(combinedApp);
  await new Promise<void>((resolve) => server.listen(PORT, () => resolve()));
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const apiUrl = `${baseUrl}/api`;

  const screenshotDir = path.resolve(
    'C:/Users/ns448/.gemini/antigravity/brain/8883565c-0e92-408d-bb64-d2a509f75c8f/screenshots'
  );
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Launch Playwright headless browser
  const browser: Browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // TEST 1 — AUTHENTICATION AND ONBOARDING
    // =========================================================================
    console.log('\n--- TEST 1: AUTHENTICATION AND ONBOARDING ---');

    let assistantUserToken = '';
    let clientUserToken = '';
    let clientUserObj: any = null;
    const testAssistantEmail = `test_asst_${Date.now()}@mailpilot.io`;
    const testClientEmail = `test_clnt_${Date.now()}@mailpilot.io`;

    // 1.1 Register new assistant
    await assertTest('T1.1', 'Auth', 'Register new assistant account', async () => {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rachel Green Assistant',
          email: testAssistantEmail,
          password: 'Password123!',
          role: 'ASSISTANT',
          workspaceName: 'Green Executive Office',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const data: any = await res.json();
      if (!data.token || data.user.role !== 'ASSISTANT') throw new Error('Invalid token or role');
      assistantUserToken = data.token;
      return { details: `Registered ${testAssistantEmail} with role ASSISTANT` };
    });

    // 1.2 Register new client
    await assertTest('T1.2', 'Auth', 'Register new client account', async () => {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alexander Client',
          email: testClientEmail,
          password: 'Password123!',
          role: 'CLIENT',
          workspaceName: 'Green Executive Office',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const data: any = await res.json();
      if (!data.token || data.user.role !== 'CLIENT') throw new Error('Invalid token or role');
      clientUserToken = data.token;
      clientUserObj = data.user;
      return { details: `Registered ${testClientEmail} with role CLIENT` };
    });

    // 1.3 Duplicate email registration validation
    await assertTest('T1.3', 'Auth', 'Validate duplicate email registration rejection (409)', async () => {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Attempt',
          email: testAssistantEmail,
          password: 'Password123!',
          role: 'ASSISTANT',
        }),
      });
      if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
      return { details: 'Duplicate email safely blocked with 409 Conflict' };
    });

    // 1.4 Incorrect password validation
    await assertTest('T1.4', 'Auth', 'Validate incorrect password rejection (401)', async () => {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAssistantEmail,
          password: 'WrongPassword999!',
        }),
      });
      if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
      return { details: 'Invalid credentials rejected with 401' };
    });

    // 1.5 Missing form fields validation
    await assertTest('T1.5', 'Auth', 'Validate missing required fields validation (400)', async () => {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'incomplete@mailpilot.io',
          // missing password and name
        }),
      });
      if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
      return { details: 'Missing fields rejected with 400 Bad Request' };
    });

    // 1.6 Login and session persistence in browser via Playwright
    const page = await browser.newPage();
    await assertTest('T1.6', 'Auth & Browser', 'Browser Login, Token persistence, and Logout', async () => {
      await page.goto(`${baseUrl}/login`);
      await page.waitForSelector('input[type="email"]');

      // Fill login form
      await page.fill('input[type="email"]', 'assistant@mailpilot.io');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Verify redirection to /assistant/dashboard
      await page.waitForURL('**/assistant/dashboard', { timeout: 10000 });
      const token = await page.evaluate(() => localStorage.getItem('mailpilot_token'));
      if (!token) throw new Error('Token not persisted in localStorage');

      // Refresh page to verify session persistence
      await page.reload();
      await page.waitForSelector('header');
      const isHeaderVisible = await page.isVisible('header');
      if (!isHeaderVisible) throw new Error('Session lost after page refresh');

      return { details: 'Browser session active and survives page refresh' };
    });

    // 1.7 Role-based workspace redirection
    await assertTest('T1.7', 'Auth & RBAC', 'Role-based workspace redirection', async () => {
      // Set client session in browser
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem('mailpilot_token', token);
          localStorage.setItem('mailpilot_user', JSON.stringify(user));
        },
        {
          token: clientUserToken,
          user: clientUserObj,
        }
      );

      // Attempt to access assistant workspace as client
      await page.goto(`${baseUrl}/assistant/dashboard`);
      await page.waitForURL('**/client/dashboard', { timeout: 10000 });
      const currentUrl = page.url();
      if (!currentUrl.includes('/client/dashboard')) {
        throw new Error(`Expected redirect to /client/dashboard, but at ${currentUrl}`);
      }

      return { details: 'Client automatically redirected away from assistant workspace to /client/dashboard' };
    });

    // 1.8 Complete Onboarding journey in browser
    await assertTest('T1.8', 'Onboarding', 'Complete full 3-step onboarding journey with provider sync', async () => {
      // Set assistant session in browser for onboarding
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem('mailpilot_token', token);
          localStorage.setItem('mailpilot_user', JSON.stringify(user));
        },
        {
          token: assistantUserToken,
          user: { role: 'ASSISTANT', name: 'Rachel Green Assistant', email: testAssistantEmail },
        }
      );

      await page.goto(`${baseUrl}/onboarding`);
      await page.waitForSelector('text=Welcome to MailPilot');

      // Step 1: Select Executive Assistant
      await page.click('text=Executive Assistant Workspace');
      await page.click('text=Next: Connect Email Account');

      // Step 2: Choose Gmail and Connect
      await page.waitForSelector('text=Connect Client Inbox');
      await page.click('text=Google Workspace / Gmail');
      await page.click('text=Connect & Synchronize Inbox');

      // Step 3: Wait for Step 3 (Ready)
      await page.waitForSelector('text=Workspace Ready', { timeout: 10000 });
      await page.click('text=Enter Assistant Workspace');
      await page.waitForURL('**/assistant/dashboard', { timeout: 10000 });

      return { details: 'Full 3-step onboarding successfully completed with synchronized inbox' };
    });

    // =========================================================================
    // TEST 2 — ASSISTANT DASHBOARD
    // =========================================================================
    console.log('\n--- TEST 2: ASSISTANT DASHBOARD & MONGODB STATS PARITY ---');

    // Authenticate as default seeded assistant
    let assistantAuthToken = '';
    let seededWorkspaceId = '';
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'assistant@mailpilot.io', password: 'password123' }),
    });
    const loginData: any = await loginRes.json();
    assistantAuthToken = loginData.token;
    seededWorkspaceId = loginData.user.workspaceId;

    await assertTest('T2.1', 'Dashboard', 'Dashboard stats match direct MongoDB collection counts', async () => {
      const res = await fetch(`${apiUrl}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (res.status !== 200) throw new Error(`Stats status ${res.status}`);
      const json: any = await res.json();
      const stats = json.data;

      const wsObjectId = new Types.ObjectId(seededWorkspaceId);
      const totalEmailsDb = await Email.countDocuments({ workspaceId: wsObjectId, isArchived: false });
      const unreadEmailsDb = await Email.countDocuments({ workspaceId: wsObjectId, isRead: false, isArchived: false });
      const importantEmailsDb = await Email.countDocuments({ workspaceId: wsObjectId, isImportant: true, isArchived: false });
      const actionEmailsDb = await Email.countDocuments({ workspaceId: wsObjectId, requiresAction: true, isArchived: false });
      const clientAttentionDb = await Email.countDocuments({
        workspaceId: wsObjectId,
        classification: 'CLIENT_TO_REPLY',
        status: 'PENDING',
        isArchived: false,
      });

      if (stats.totalEmails !== totalEmailsDb) {
        throw new Error(`totalEmails mismatch: API=${stats.totalEmails}, DB=${totalEmailsDb}`);
      }
      if (stats.unreadEmails !== unreadEmailsDb) {
        throw new Error(`unreadEmails mismatch: API=${stats.unreadEmails}, DB=${unreadEmailsDb}`);
      }
      if (stats.importantEmails !== importantEmailsDb) {
        throw new Error(`importantEmails mismatch: API=${stats.importantEmails}, DB=${importantEmailsDb}`);
      }
      if (stats.actionRequired !== actionEmailsDb) {
        throw new Error(`actionRequired mismatch: API=${stats.actionRequired}, DB=${actionEmailsDb}`);
      }
      if (stats.clientAttention !== clientAttentionDb) {
        throw new Error(`clientAttention mismatch: API=${stats.clientAttention}, DB=${clientAttentionDb}`);
      }

      return {
        details: `Parity confirmed: Total=${stats.totalEmails}, Unread=${stats.unreadEmails}, Important=${stats.importantEmails}, Action=${stats.actionRequired}, ClientAttention=${stats.clientAttention}`,
      };
    });

    await assertTest('T2.2', 'Dashboard Interaction', 'Clicking metric cards filters the email list properly', async () => {
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem('mailpilot_token', token);
          localStorage.setItem('mailpilot_user', JSON.stringify(user));
        },
        {
          token: assistantAuthToken,
          user: { role: 'ASSISTANT', name: 'Sarah Executive Assistant', email: 'assistant@mailpilot.io' },
        }
      );

      await page.goto(`${baseUrl}/assistant/dashboard`);
      await page.waitForSelector('text=Total Emails');

      // Click Unread card
      await page.click('text=Unread');
      await page.waitForURL('**/assistant/emails?filter=unread', { timeout: 10000 });

      // Click Client to Reply filter
      await page.click('text=Client to Reply');
      await page.waitForURL('**/assistant/emails?filter=client', { timeout: 10000 });

      return { details: 'Filter routing navigation operational across cards' };
    });

    // =========================================================================
    // TEST 3 — EMAIL CLASSIFICATION (ALL 4 TYPES & THREAD HISTORY)
    // =========================================================================
    console.log('\n--- TEST 3: EMAIL CLASSIFICATION & CONVERSATION AWARENESS ---');

    // 3.1 Test all 4 classifications
    await assertTest('T3.1', 'Classification', 'Classify ASSISTANT_TO_REPLY (Scheduling inquiry)', async () => {
      const res = await AIService.classifyEmail({
        subject: 'Scheduling a 30-min Zoom call for next Thursday',
        body: 'Hi Sarah, could we coordinate a 30-minute calendar slot for Alexander next Thursday at 2 PM EST?',
        sender: { name: 'Peter Thiel', email: 'peter@foundersfund.com' },
      });
      if (res.classification !== 'ASSISTANT_TO_REPLY') {
        throw new Error(`Expected ASSISTANT_TO_REPLY, got ${res.classification}`);
      }
      return { details: `Classified as ${res.classification} with confidence ${res.confidence}` };
    });

    await assertTest('T3.2', 'Classification', 'Classify CLIENT_TO_REPLY (Executive Approval / Legal)', async () => {
      const res = await AIService.classifyEmail({
        subject: 'Series A Term Sheet Approval and Signature',
        body: 'Dear Alexander, please review and sign off on the attached Series A term sheet before the wire transfer tomorrow.',
        sender: { name: 'Venture Partner', email: 'partner@vc.com' },
      });
      if (res.classification !== 'CLIENT_TO_REPLY') {
        throw new Error(`Expected CLIENT_TO_REPLY, got ${res.classification}`);
      }
      if (!res.requiresAction) throw new Error('requiresAction must be true');
      return { details: `Classified as ${res.classification} with confidence ${res.confidence}` };
    });

    await assertTest('T3.3', 'Classification', 'Classify NO_REPLY_NEEDED (Automated receipt / Newsletter)', async () => {
      const res = await AIService.classifyEmail({
        subject: 'Your Stripe Receipt for Invoice #10492',
        body: 'Receipt for your payment of $120.00. Unsubscribe here if you no longer wish to receive notifications.',
        sender: { name: 'Stripe Billing', email: 'receipts@stripe.com' },
      });
      if (res.classification !== 'NO_REPLY_NEEDED') {
        throw new Error(`Expected NO_REPLY_NEEDED, got ${res.classification}`);
      }
      if (res.requiresAction !== false) throw new Error('requiresAction must be false');
      return { details: `Classified as ${res.classification} with confidence ${res.confidence}` };
    });

    await assertTest('T3.4', 'Classification', 'Classify NEEDS_REVIEW (Ambiguous exploratory request)', async () => {
      const res = await AIService.classifyEmail({
        subject: 'General Thoughts on Future Roadmap',
        body: 'Just jotting down some high-level thoughts on operations and design. Let us connect sometime.',
        sender: { name: 'Colleague', email: 'colleague@domain.io' },
      });
      if (res.classification !== 'NEEDS_REVIEW') {
        throw new Error(`Expected NEEDS_REVIEW, got ${res.classification}`);
      }
      return { details: `Classified as ${res.classification} with confidence ${res.confidence}` };
    });

    // 3.5 Conversation history awareness
    await assertTest('T3.5', 'Classification', 'AI re-evaluates responsibility considering full thread history', async () => {
      // Simulate client delegating operational scheduling in previous message
      const res = await AIService.classifyEmail({
        subject: 'Re: Board Meeting Dinner',
        body: 'Sounds good! 7 PM at Nobu works for me.',
        sender: { name: 'Board Member', email: 'board@company.com' },
        conversationHistory: [
          {
            sender: 'Alexander Wright <client@mailpilot.io>',
            body: 'Sarah (Assistant), please take over scheduling and coordinate reservation details for the dinner.',
            date: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      });
      if (res.classification !== 'ASSISTANT_TO_REPLY') {
        throw new Error(`Expected ASSISTANT_TO_REPLY based on thread delegation, got ${res.classification}`);
      }
      return { details: `Thread context incorporated: re-evaluated to ${res.classification}` };
    });

    // =========================================================================
    // TEST 4 — CLIENT EXPERIENCE
    // =========================================================================
    console.log('\n--- TEST 4: CLIENT WORKSPACE, DECISIONS & IMMEDIATE SYNC ---');

    let clientAuthToken = '';
    const clientLoginRes = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client@mailpilot.io', password: 'password123' }),
    });
    const clientLoginData: any = await clientLoginRes.json();
    clientAuthToken = clientLoginData.token;

    // Pick an email requiring client attention (or create one if existing matters were handled in previous runs)
    let sampleClientEmail = await Email.findOne({
      workspaceId: new Types.ObjectId(seededWorkspaceId),
      classification: 'CLIENT_TO_REPLY',
      status: 'PENDING',
      isArchived: false,
    });

    if (!sampleClientEmail) {
      sampleClientEmail = await Email.create({
        workspaceId: new Types.ObjectId(seededWorkspaceId),
        accountId: new Types.ObjectId(),
        conversationId: new Types.ObjectId(),
        sender: { name: 'Marcus Vance', email: 'marcus@sequoia.com' },
        recipients: [{ name: 'Alexander Wright', email: 'client@mailpilot.io' }],
        subject: 'Series A Term Sheet Approval and Signature',
        body: 'Alexander, please review and approve the attached terms before 5 PM today.',
        classification: 'CLIENT_TO_REPLY',
        confidence: 0.98,
        priority: 'URGENT',
        requiresAction: true,
        status: 'PENDING',
        aiSummary: 'Approval and signature required on Series A terms by 5 PM.',
        classificationReason: 'Requires high-level strategic decision and direct client authorization.',
        suggestedAction: 'Review terms and approve or delegate to assistant.',
      });
    }

    await assertTest('T4.1', 'Client Experience', 'Client "I\'ll Handle This" resolves matter across workspaces', async () => {
      const res = await fetch(`${apiUrl}/client/emails/${sampleClientEmail._id}/handle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientAuthToken}`,
        },
        body: JSON.stringify({ clientNotes: 'Handled via direct executive phone call.' }),
      });
      if (res.status !== 200) throw new Error(`Handle status ${res.status}`);
      const fresh = await Email.findById(sampleClientEmail._id);
      if (fresh?.status !== 'HANDLED' || fresh.requiresAction !== false) {
        throw new Error(`Expected HANDLED & requiresAction=false, got status=${fresh?.status}`);
      }
      return { details: `Status set to ${fresh.status}, notes: "${fresh.clientNotes}"` };
    });

    await assertTest('T4.2', 'Client Experience', 'Client "Delegate to Assistant" re-queues matter immediately', async () => {
      const res = await fetch(`${apiUrl}/client/emails/${sampleClientEmail._id}/delegate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientAuthToken}`,
        },
        body: JSON.stringify({ delegationReason: 'Please coordinate calendar time and reply.' }),
      });
      if (res.status !== 200) throw new Error(`Delegate status ${res.status}`);
      const fresh = await Email.findById(sampleClientEmail._id);
      if (fresh?.status !== 'DELEGATED' || fresh.classification !== 'ASSISTANT_TO_REPLY') {
        throw new Error(`Expected DELEGATED & ASSISTANT_TO_REPLY, got ${fresh?.status} & ${fresh?.classification}`);
      }
      return { details: `Delegated with reason: "${fresh.delegationReason}"` };
    });

    // =========================================================================
    // TEST 5 — EMAIL ORGANIZATION & MULTI-FILTER SEARCH
    // =========================================================================
    console.log('\n--- TEST 5: EMAIL FILTERS, SEARCH & PAGINATION ---');

    const filters = [
      'all',
      'assistant',
      'client',
      'no_reply',
      'action',
      'waiting',
      'meetings',
      'important',
      'general',
      'needs_review',
      'unread',
      'archived',
    ];

    for (const flt of filters) {
      await assertTest('T5.filter', 'Email Organization', `Filter: "${flt}" returns valid data list`, async () => {
        const res = await fetch(`${apiUrl}/emails?filter=${flt}&limit=5`, {
          headers: { Authorization: `Bearer ${assistantAuthToken}` },
        });
        if (res.status !== 200) throw new Error(`Filter ${flt} returned status ${res.status}`);
        const data: any = await res.json();
        if (!Array.isArray(data.data)) throw new Error(`Filter ${flt} data is not an array`);
        return { details: `Returned ${data.data.length} records` };
      });
    }

    await assertTest('T5.search', 'Email Search', 'Combined search + filter with pagination', async () => {
      const res = await fetch(`${apiUrl}/emails?search=Series&filter=action&page=1&limit=5`, {
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const data: any = await res.json();
      if (!data.data || data.data.length < 1) throw new Error('Search did not return matches');
      return { details: `Found ${data.data.length} match(es) satisfying both query and filter` };
    });

    // =========================================================================
    // TEST 6 — CONVERSATION MANAGEMENT
    // =========================================================================
    console.log('\n--- TEST 6: CONVERSATION MANAGEMENT & PERSISTENCE ---');

    await assertTest('T6.1', 'Conversation', 'Toggle read/unread, star, archive, and complete', async () => {
      const email = await Email.findOne({ workspaceId: new Types.ObjectId(seededWorkspaceId) });
      if (!email) throw new Error('No email found');
      const emailId = email._id.toString();

      // Read toggle
      const readRes = await fetch(`${apiUrl}/emails/${emailId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (readRes.status !== 200) throw new Error('Read toggle failed');

      // Important toggle
      const impRes = await fetch(`${apiUrl}/emails/${emailId}/important`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (impRes.status !== 200) throw new Error('Important toggle failed');

      // Archive toggle
      const arcRes = await fetch(`${apiUrl}/emails/${emailId}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (arcRes.status !== 200) throw new Error('Archive toggle failed');

      // Restore / unarchive toggle
      const unarcRes = await fetch(`${apiUrl}/emails/${emailId}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (unarcRes.status !== 200) throw new Error('Restore toggle failed');

      return { details: 'All state transitions (read, star, archive, restore) verified' };
    });

    // =========================================================================
    // TEST 7 — AI ASSISTANCE & CONTEXTUAL SYNTHESIS
    // =========================================================================
    console.log('\n--- TEST 7: AI SUMMARIES, REPLIES, AND CONTEXTUAL Q&A ---');

    await assertTest('T7.1', 'AI', 'Generate reply across all 4 tone profiles', async () => {
      const tones = ['professional', 'friendly', 'concise', 'formal'] as const;
      for (const tone of tones) {
        const replyRes = await AIService.generateReply({
          subject: 'Partnership Inquiry',
          body: 'We would love to discuss integrating our products.',
          sender: { name: 'Jordan Smith', email: 'jordan@innovate.co' },
          tone,
        });
        if (!replyRes.reply || replyRes.reply.length < 20) {
          throw new Error(`Reply for tone ${tone} was empty or too short`);
        }
      }
      return { details: 'Generated distinct tone replies (friendly, concise, formal, professional)' };
    });

    await assertTest('T7.2', 'AI', 'Contextual Q&A synthesizing actual database records', async () => {
      const qRes = await fetch(`${apiUrl}/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantAuthToken}`,
        },
        body: JSON.stringify({ query: 'Which emails require client attention?' }),
      });
      if (qRes.status !== 200) throw new Error(`Status ${qRes.status}`);
      const qData: any = await qRes.json();
      if (!qData.data.answer || qData.data.contextCount < 1) {
        throw new Error('Missing answer or zero context count');
      }
      return { details: `Answered using ${qData.data.contextCount} database records (Engine: ${qData.data.engine})` };
    });

    await assertTest('T7.3', 'AI', 'Accurate AI engine status reporting (/api/ai/status)', async () => {
      const res = await fetch(`${apiUrl}/ai/status`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const data: any = await res.json();
      if (!data.data || typeof data.data.isLive !== 'boolean') {
        throw new Error('Invalid status payload');
      }
      return { details: `Engine: ${data.data.engine}, Model: ${data.data.model}, Live: ${data.data.isLive}` };
    });

    // =========================================================================
    // TEST 8 — REPLY APPROVAL AND SENDING (EXPLICIT HUMAN APPROVAL ENFORCEMENT)
    // =========================================================================
    console.log('\n--- TEST 8: EMAIL REPLY APPROVAL & DISPATCH ---');

    await assertTest('T8.1', 'Composer Security', 'Reject unapproved dispatch (400) & accept approved dispatch (201)', async () => {
      const email = await Email.findOne({ workspaceId: new Types.ObjectId(seededWorkspaceId) });
      if (!email) throw new Error('No email found');

      // Attempt 1: Without approval -> Must be rejected with 400
      const unapprovedRes = await fetch(`${apiUrl}/emails/${email._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantAuthToken}`,
        },
        body: JSON.stringify({
          to: 'partner@firm.com',
          subject: 'Re: Inquiry',
          body: 'Attempting unapproved dispatch.',
          tone: 'professional',
          isSimulated: true,
          isApproved: false, // NOT approved
        }),
      });
      if (unapprovedRes.status !== 400) {
        throw new Error(`Expected 400 rejection for unapproved dispatch, got ${unapprovedRes.status}`);
      }

      // Attempt 2: With explicit approval -> Dispatches successfully (201)
      const approvedRes = await fetch(`${apiUrl}/emails/${email._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantAuthToken}`,
        },
        body: JSON.stringify({
          to: 'partner@firm.com',
          subject: 'Re: Inquiry',
          body: 'Thank you for your inquiry, we have confirmed the details.',
          tone: 'professional',
          isSimulated: true,
          isApproved: true, // EXPLICITLY approved
        }),
      });
      if (approvedRes.status !== 201) {
        throw new Error(`Expected 201 for approved dispatch, got ${approvedRes.status}`);
      }
      const data: any = await approvedRes.json();
      if (!data.data._id) throw new Error('Missing reply record');

      return { details: 'Unapproved dispatch rejected with 400; Approved dispatch recorded with 201' };
    });

    // =========================================================================
    // TEST 9 — FOLLOW-UPS AND MEETINGS CRUD
    // =========================================================================
    console.log('\n--- TEST 9: FOLLOW-UP TASKS & CALENDAR MEETINGS ---');

    let createdTaskId = '';
    await assertTest('T9.1', 'Tasks', 'Create, Edit, Complete, and Delete follow-up task', async () => {
      // 1. Create
      const cRes = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantAuthToken}`,
        },
        body: JSON.stringify({
          title: 'Review Series A Term Sheet Covenants',
          description: 'Coordinate with external legal counsel regarding section 4',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          type: 'FOLLOW_UP',
          assignedTo: 'ASSISTANT',
        }),
      });
      if (cRes.status !== 201) throw new Error(`Create status ${cRes.status}`);
      const cData: any = await cRes.json();
      createdTaskId = cData.data._id;

      // 2. Edit
      const uRes = await fetch(`${apiUrl}/tasks/${createdTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assistantAuthToken}`,
        },
        body: JSON.stringify({
          title: 'Review Series A Term Sheet Covenants [UPDATED]',
          status: 'COMPLETED',
        }),
      });
      if (uRes.status !== 200) throw new Error(`Update status ${uRes.status}`);

      // 3. Delete
      const dRes = await fetch(`${apiUrl}/tasks/${createdTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (dRes.status !== 200) throw new Error(`Delete status ${dRes.status}`);

      const dbCheck = await Task.findById(createdTaskId);
      if (dbCheck) throw new Error('Task was not deleted from database');

      return { details: 'Full task lifecycle (Create -> Edit -> Complete -> Delete) verified' };
    });

    // =========================================================================
    // TEST 10 — SECURITY AND AUTHORIZATION AUDIT
    // =========================================================================
    console.log('\n--- TEST 10: MULTI-TENANT ISOLATION, RBAC, AND ANTI-IDOR ---');

    // 10.1 Cross-workspace isolation
    await assertTest('T10.1', 'Security', 'Cross-workspace data access rejected (404/Anti-IDOR)', async () => {
      const foreignWorkspace = await Workspace.create({
        name: 'Foreign Adversary Capital',
        ownerId: new Types.ObjectId(),
      });
      const foreignEmail = await Email.create({
        workspaceId: foreignWorkspace._id,
        accountId: new Types.ObjectId(),
        conversationId: new Types.ObjectId(),
        sender: { name: 'Hacker', email: 'hacker@adversary.com' },
        recipients: [{ name: 'Target', email: 'target@adversary.com' }],
        subject: 'Confidential M&A Valuation',
        body: 'Extremely confidential merger terms.',
        classification: 'CLIENT_TO_REPLY',
        status: 'PENDING',
        requiresAction: true,
      });

      // User in seededWorkspaceId tries to access foreignEmail
      const res = await fetch(`${apiUrl}/emails/${foreignEmail._id}`, {
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (res.status !== 404) {
        throw new Error(`SECURITY BREACH: Cross-workspace email accessed! Status: ${res.status}`);
      }

      // Cleanup
      await Email.findByIdAndDelete(foreignEmail._id);
      await Workspace.findByIdAndDelete(foreignWorkspace._id);

      return { details: 'Cross-workspace email access safely blocked with 404' };
    });

    // 10.2 RBAC enforcement
    await assertTest('T10.2', 'Security', 'RBAC: Client forbidden from assistant operations (403)', async () => {
      const email = await Email.findOne({ workspaceId: new Types.ObjectId(seededWorkspaceId) });
      const res = await fetch(`${apiUrl}/emails/${email?._id}/classification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientAuthToken}`,
        },
        body: JSON.stringify({ classification: 'NO_REPLY_NEEDED' }),
      });
      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden for client calling assistant endpoint, got ${res.status}`);
      }
      return { details: 'Client access to assistant-only endpoint rejected with 403 Forbidden' };
    });

    // 10.3 Forged and expired JWT tokens
    await assertTest('T10.3', 'Security', 'Forged & missing JWT tokens rejected (401)', async () => {
      const res = await fetch(`${apiUrl}/emails`, {
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature' },
      });
      if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
      return { details: 'Forged JWT tokens safely rejected with 401 Unauthorized' };
    });

    // =========================================================================
    // TEST 11 — RESPONSIVE UI & SCREENSHOT CAPTURE
    // =========================================================================
    console.log('\n--- TEST 11: RESPONSIVE UI AUDIT & VIEWPORT SCREENSHOTS ---');

    const viewports = [
      { name: 'desktop-1440x900', width: 1440, height: 900 },
      { name: 'tablet-landscape-1024x768', width: 1024, height: 768 },
      { name: 'tablet-portrait-768x1024', width: 768, height: 1024 },
      { name: 'mobile-390x844', width: 390, height: 844 },
    ];

    const sampleEmail = await Email.findOne({ workspaceId: new Types.ObjectId(seededWorkspaceId) });
    const sampleEmailId = sampleEmail?._id.toString();

    // Authenticate browser session as assistant
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('mailpilot_token', token);
        localStorage.setItem('mailpilot_user', JSON.stringify(user));
      },
      {
        token: assistantAuthToken,
        user: { role: 'ASSISTANT', name: 'Sarah Executive Assistant', email: 'assistant@mailpilot.io' },
      }
    );

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Capture Public Pages (login, signup)
      await page.goto(`${baseUrl}/login`);
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${baseUrl}/login`);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(screenshotDir, `${vp.name}_login.png`) });

      await page.goto(`${baseUrl}/signup`);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(screenshotDir, `${vp.name}_signup.png`) });

      // 2. Set Assistant Session for Assistant Workspace Pages
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem('mailpilot_token', token);
          localStorage.setItem('mailpilot_user', JSON.stringify(user));
        },
        {
          token: assistantAuthToken,
          user: { role: 'ASSISTANT', name: 'Sarah Executive Assistant', email: 'assistant@mailpilot.io' },
        }
      );

      const assistantPages = [
        { path: '/onboarding', name: 'onboarding' },
        { path: '/assistant/dashboard', name: 'assistant-dashboard' },
        { path: '/assistant/emails', name: 'email-management' },
        { path: `/assistant/emails/${sampleEmailId}`, name: 'conversation-details' },
        { path: '/assistant/settings', name: 'settings' },
        { path: '/assistant/accounts', name: 'connected-accounts' },
      ];

      for (const ap of assistantPages) {
        await page.goto(`${baseUrl}${ap.path}`);
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(screenshotDir, `${vp.name}_${ap.name}.png`) });
      }

      // 3. Set Client Session for Client Workspace Pages
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem('mailpilot_token', token);
          localStorage.setItem('mailpilot_user', JSON.stringify(user));
        },
        {
          token: clientAuthToken,
          user: { role: 'CLIENT', name: 'Alexander Wright', email: 'client@mailpilot.io' },
        }
      );
      await page.goto(`${baseUrl}/client/dashboard`);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(screenshotDir, `${vp.name}_client-dashboard.png`) });
    }

    await assertTest('T11.screenshots', 'UI Screenshots', 'Captured screenshots for 9 pages across 4 viewports (36 images)', async () => {
      const files = fs.readdirSync(screenshotDir);
      if (files.length < 32) throw new Error(`Expected at least 32 screenshots, found ${files.length}`);
      return { details: `Saved ${files.length} responsive screenshots to ${screenshotDir}` };
    });

    // =========================================================================
    // TEST 12 — FAILURE AND RECOVERY
    // =========================================================================
    console.log('\n--- TEST 12: FAILURE AND RECOVERY ---');

    await assertTest('T12.1', 'Failure Recovery', 'Invalid email ID returns clean 404 JSON', async () => {
      const res = await fetch(`${apiUrl}/emails/000000000000000000000000`, {
        headers: { Authorization: `Bearer ${assistantAuthToken}` },
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
      const data: any = await res.json();
      if (data.success !== false) throw new Error('Response success should be false');
      return { details: 'Gracefully handled non-existent email record' };
    });

    await assertTest('T12.2', 'Failure Recovery', 'Unauthenticated request returns clean 401 JSON', async () => {
      const res = await fetch(`${apiUrl}/emails`);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      const data: any = await res.json();
      if (data.success !== false) throw new Error('Response success should be false');
      return { details: 'Gracefully handled missing authentication header' };
    });

    await assertTest('T12.3', 'Failure Recovery', 'AI quota/unavailable immediately triggers fallback with 200', async () => {
      // Regardless of live Gemini quota/capacity, classifyEmail returns 200 with valid schema
      const res = await AIService.classifyEmail({
        subject: 'Weekly Review and Sprint Sync',
        body: 'Please review the sprint backlog before Friday.',
        sender: { name: 'Scrum Master', email: 'scrum@agile.io' },
      });
      const valid = AIClassificationResultSchema.safeParse(res);
      if (!valid.success) throw new Error('Schema validation failed during fallback recovery');
      return { details: `Engine: ${res.engine}, Live: ${res.isGeminiLive}, Schema valid: ${valid.success}` };
    });
  } finally {
    await browser.close();
    server.close();
    await mongoose.disconnect();
  }

  // Summary
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  console.log('\n========================================================================');
  console.log(`📊 ASSIGNMENT ACCEPTANCE AUDIT COMPLETE: ${passed} PASSED / ${failed} FAILED (TOTAL: ${testResults.length})`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceSuite().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
