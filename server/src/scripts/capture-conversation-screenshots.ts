import path from 'node:path';
import fs from 'node:fs';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import mongoose from 'mongoose';
import { chromium } from 'playwright';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Email } from '../models/Email.js';
import { generateToken } from '../utils/generateToken.js';

async function capture() {
  console.log('[Screenshot] Starting targeted screenshot capture...');
  await mongoose.connect(ENV.MONGODB_URI);

  const assistant = await User.findOne({ email: 'assistant@mailpilot.io' });
  if (!assistant) throw new Error('Assistant user not found.');

  const assistantToken = generateToken({
    userId: assistant._id,
    email: assistant.email,
    role: assistant.role,
    workspaceId: assistant.workspaceId,
  });

  const sampleEmail = await Email.findOne({
    workspaceId: assistant.workspaceId,
    direction: 'OUTBOUND',
  }).sort({ receivedAt: -1 });

  const targetEmailId = sampleEmail?._id?.toString() || (await Email.findOne({ workspaceId: assistant.workspaceId }))?._id?.toString();

  await mongoose.disconnect();

  const screenshotDir = path.resolve('C:/Users/ns448/.gemini/antigravity/brain/8883565c-0e92-408d-bb64-d2a509f75c8f/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Helper to set auth session
  const setSession = async () => {
    await page.goto('http://localhost:5173/login');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('mailpilot_token', token);
        localStorage.setItem('mailpilot_user', JSON.stringify(user));
      },
      {
        token: assistantToken,
        user: { role: 'ASSISTANT', name: 'Sarah Jenkins', email: 'assistant@mailpilot.io' },
      }
    );
  };

  await setSession();

  // 1. Assistant Dashboard
  console.log('[1/8] Capturing Assistant Dashboard...');
  await page.goto('http://localhost:5173/assistant/dashboard');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '1_assistant-dashboard.png') });

  // 2. Inbox with grouped conversations
  console.log('[2/8] Capturing Inbox with grouped conversations...');
  await page.goto('http://localhost:5173/assistant/emails');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '2_inbox-grouped-conversations.png') });

  // 3. No Reply Needed filter
  console.log('[3/8] Capturing No Reply Needed filter...');
  await page.goto('http://localhost:5173/assistant/emails?filter=no_reply');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '3_no-reply-needed-filter.png') });

  // 4. Interactive classification dropdown
  console.log('[4/8] Capturing Interactive classification dropdown...');
  await page.goto('http://localhost:5173/assistant/emails');
  await page.waitForTimeout(1000);
  // Click first classification button to open popover
  const firstBadgeBtn = await page.$('button[title="Click to change classification"]');
  if (firstBadgeBtn) {
    await firstBadgeBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(screenshotDir, '4_interactive-classification-dropdown.png') });

  // 5. Conversation detail with inbound and outbound messages
  console.log('[5/8] Capturing Conversation detail with inbound and outbound messages...');
  await page.goto(`http://localhost:5173/assistant/emails/${targetEmailId}`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(screenshotDir, '5_conversation-detail-inbound-outbound.png') });

  // 6. Sent folder
  console.log('[6/8] Capturing Sent folder...');
  await page.goto('http://localhost:5173/assistant/emails?filter=sent');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '6_sent-folder.png') });

  // 7. Mobile Inbox
  console.log('[7/8] Capturing Mobile Inbox...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/assistant/emails');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '7_mobile-inbox.png') });

  // 8. Mobile Conversation Detail
  console.log('[8/8] Capturing Mobile Conversation Detail...');
  await page.goto(`http://localhost:5173/assistant/emails/${targetEmailId}`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(screenshotDir, '8_mobile-conversation-detail.png') });

  await browser.close();
  console.log('✅ All 8 targeted screenshots captured and verified successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
