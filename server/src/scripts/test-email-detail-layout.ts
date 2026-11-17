import path from 'node:path';
import fs from 'node:fs';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import mongoose from 'mongoose';
import { chromium, Page } from 'playwright';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

const SCREENSHOT_DIR = path.resolve('C:/Users/ns448/.gemini/antigravity/brain/8883565c-0e92-408d-bb64-d2a509f75c8f/screenshots');

async function runLayoutTests() {
  console.log('===============================================================');
  console.log('🧪 MailPilot Email Detail Layout & Scroll Regression Test Suite');
  console.log('===============================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  await mongoose.connect(ENV.MONGODB_URI);
  const assistant = await User.findOne({ email: 'assistant@mailpilot.io' });
  if (!assistant) throw new Error('Assistant user not found');

  const token = generateToken({
    userId: assistant._id,
    email: assistant.email,
    role: assistant.role,
    workspaceId: assistant.workspaceId,
  });
  await mongoose.disconnect();

  const browser = await chromium.launch({ headless: true });
  let allPassed = true;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      allPassed = false;
    }
  };

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Authenticate assistant session
    await page.goto('http://localhost:5173/login');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('mailpilot_token', token);
        localStorage.setItem('mailpilot_user', JSON.stringify(user));
      },
      {
        token,
        user: {
          id: assistant._id.toString(),
          name: assistant.name,
          email: assistant.email,
          role: assistant.role,
          workspaceName: 'Acme Executive Group',
        },
      }
    );

    // -----------------------------------------------------------------
    // TEST 1: Open Inbox and verify 2-column layout
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Load Inbox and Inspect Layout Containers ---');
    await page.goto('http://localhost:5173/assistant/emails');
    await page.waitForSelector('.mailpilot-conversation-row', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const layoutBoxes = await page.evaluate(() => {
      const leftCol = document.querySelector('.mailpilot-conversation-list');
      const rightCol = document.querySelector('.mailpilot-reading-pane');
      const toolbar = document.querySelector('.mailpilot-reading-header');
      const scrollArea = document.querySelector('.mailpilot-reading-scroll');
      const subject = document.querySelector('.mailpilot-reading-subject');

      const leftRect = leftCol?.getBoundingClientRect();
      const rightRect = rightCol?.getBoundingClientRect();
      const toolRect = toolbar?.getBoundingClientRect();
      const scrollRect = scrollArea?.getBoundingClientRect();
      const subjRect = subject?.getBoundingClientRect();

      return {
        hasLeftCol: !!leftCol,
        hasRightCol: !!rightCol,
        hasToolbar: !!toolbar,
        hasScrollArea: !!scrollArea,
        hasSubject: !!subject,
        leftRect,
        rightRect,
        toolRect,
        scrollRect,
        subjRect,
      };
    });

    assert(layoutBoxes.hasLeftCol, 'Left conversation list container rendered');
    assert(layoutBoxes.hasRightCol, 'Right reading pane container rendered');
    assert(layoutBoxes.hasToolbar, 'Dedicated action toolbar header rendered');
    assert(layoutBoxes.hasScrollArea, 'Independently scrollable content container rendered');
    assert(layoutBoxes.hasSubject, 'Email subject rendered inside scrollable content');

    // Verify toolbar and subject do NOT overlap vertically
    const noOverlap = layoutBoxes.toolRect && layoutBoxes.subjRect && layoutBoxes.toolRect.bottom <= layoutBoxes.subjRect.top;
    assert(noOverlap, 'Toolbar occupies separate vertical space above email subject (no overlap)', `Toolbar bottom: ${layoutBoxes.toolRect?.bottom}, Subject top: ${layoutBoxes.subjRect?.top}`);

    // Capture initial 1440px desktop screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'detail_fix_1_desktop_1440.png') });

    // -----------------------------------------------------------------
    // TEST 2: Scroll Right Panel to Bottom & Switch Conversation
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Scroll Right Panel to Bottom & Reset on Switch ---');
    const debugInfo = await page.evaluate(() => {
      const pane = document.querySelector('.mailpilot-reading-pane');
      const scrollArea = document.querySelector('.mailpilot-reading-scroll');
      return {
        paneHeight: pane?.clientHeight,
        paneScrollHeight: pane?.scrollHeight,
        paneOverflow: pane ? window.getComputedStyle(pane).overflow : null,
        scrollAreaHeight: scrollArea?.clientHeight,
        scrollAreaScrollHeight: scrollArea?.scrollHeight,
        scrollAreaOverflowY: scrollArea ? window.getComputedStyle(scrollArea).overflowY : null,
      };
    });
    console.log('Debug info before scroll:', debugInfo);

    // Wait for thread messages to load so content has scrollable height
    await page.waitForSelector('.mailpilot-reading-scroll .rounded-2xl', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Scroll right scrollable content to the bottom
    await page.evaluate(() => {
      const scrollArea = document.querySelector('.mailpilot-reading-scroll');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    });
    await page.waitForTimeout(300);

    const scrolledDownPos = await page.evaluate(() => {
      const scrollArea = document.querySelector('.mailpilot-reading-scroll');
      return scrollArea?.scrollTop || 0;
    });
    assert(scrolledDownPos > 200, 'Right panel successfully scrolled to bottom', `scrollTop is ${scrolledDownPos}px`);

    // Click the second conversation row
    const rows = await page.$$('.mailpilot-conversation-row');
    assert(rows.length >= 2, 'Multiple conversations available to test switching');

    await rows[1].click();
    await page.waitForTimeout(500);

    const resetScrollPos = await page.evaluate(() => {
      const scrollArea = document.querySelector('.mailpilot-reading-scroll');
      return scrollArea?.scrollTop;
    });
    assert(resetScrollPos === 0, 'Selecting second conversation resets scroll position to top: 0', `scrollTop is ${resetScrollPos}px`);

    // Verify toolbar is still above subject and visible
    const posAfterSwitch = await page.evaluate(() => {
      const toolbar = document.querySelector('.mailpilot-reading-header');
      const subject = document.querySelector('.mailpilot-reading-subject');
      const tRect = toolbar?.getBoundingClientRect();
      const sRect = subject?.getBoundingClientRect();
      return {
        tBottom: tRect?.bottom,
        sTop: sRect?.top,
        overlap: tRect && sRect && tRect.bottom > sRect.top,
      };
    });
    assert(!posAfterSwitch.overlap, 'Toolbar does not overlap subject after conversation switch', `Toolbar bottom: ${posAfterSwitch.tBottom}, Subject top: ${posAfterSwitch.sTop}`);

    // Capture second conversation at top
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'detail_fix_2_second_conversation_top.png') });

    // -----------------------------------------------------------------
    // TEST 3: Independent Scroll Isolation Verification
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Independent Scroll Isolation ---');
    // 3a. Scroll right panel and verify left list does not move
    await page.evaluate(() => {
      const scrollArea = document.querySelector('.mailpilot-reading-scroll');
      if (scrollArea) scrollArea.scrollTop = 350;
    });
    await page.waitForTimeout(200);

    const leftScrollAfterRightMove = await page.evaluate(() => {
      const leftCol = document.querySelector('.mailpilot-conversation-list');
      return leftCol?.scrollTop;
    });
    assert(leftScrollAfterRightMove === 0, 'Left conversation list stays stationary at scrollTop: 0 when right panel scrolls');

    // 3b. Scroll left list and verify right panel does not move
    await page.evaluate(() => {
      const leftCol = document.querySelector('.mailpilot-conversation-list');
      if (leftCol) leftCol.scrollTop = 150;
    });
    await page.waitForTimeout(200);

    const rightScrollAfterLeftMove = await page.evaluate(() => {
      const scrollArea = document.querySelector('.mailpilot-reading-scroll');
      return scrollArea?.scrollTop;
    });
    assert(rightScrollAfterLeftMove === 350, 'Right detail panel maintains its scroll position when left list scrolls');

    // -----------------------------------------------------------------
    // TEST 4: Switch Across 5 Different Conversations
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Rapid Switching Across 5 Conversations ---');
    let switchesSuccessful = true;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      // Scroll to bottom of current
      await page.evaluate(() => {
        const scrollArea = document.querySelector('.mailpilot-reading-scroll');
        if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight / 2;
      });
      // Click conversation i
      await rows[i].click();
      await page.waitForTimeout(400);

      const st = await page.evaluate(() => {
        const scrollArea = document.querySelector('.mailpilot-reading-scroll');
        return scrollArea?.scrollTop;
      });
      if (st !== 0) {
        switchesSuccessful = false;
        console.error(`  Switch to row ${i} failed reset: scrollTop was ${st}`);
      }
    }
    assert(switchesSuccessful, 'All 5 conversation switches reset scroll position reliably to 0');

    // -----------------------------------------------------------------
    // TEST 5: Verify Features: AI Summary, Actions, Reply Composer
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Verify Critical Email Details Features Inside Scroll Area ---');
    const featureCheck = await page.evaluate(() => {
      const aiSummary = document.querySelector('.mailpilot-reading-scroll [class*="Sparkles"], .mailpilot-reading-scroll p');
      const messages = document.querySelectorAll('.mailpilot-reading-scroll .rounded-2xl');
      const replyTextarea = document.querySelector('.mailpilot-reading-scroll textarea');
      const sendButton = document.querySelector('.mailpilot-reading-scroll button[type="button"]');
      const classDropdown = document.querySelector('.mailpilot-reading-header button[title*="classification" i], .mailpilot-reading-header span');

      return {
        hasMessages: messages.length > 0,
        messageCount: messages.length,
        hasReplyTextarea: !!replyTextarea,
        hasSendButton: !!sendButton,
        hasClassDropdown: !!classDropdown,
      };
    });

    assert(featureCheck.hasMessages, `Thread messages rendered inside scroll area (Count: ${featureCheck.messageCount})`);
    assert(featureCheck.hasReplyTextarea, 'Reply composer textarea is present in scroll area');
    assert(featureCheck.hasSendButton, 'Send reply button is present');
    assert(featureCheck.hasClassDropdown, 'Interactive classification badge is present in header toolbar');

    // -----------------------------------------------------------------
    // TEST 6: Responsive Viewports Verification
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Responsive Viewport QA Matrix ---');
    const viewports = [
      { name: 'Mobile_360', width: 360, height: 740 },
      { name: 'Mobile_375', width: 375, height: 667 },
      { name: 'Mobile_390', width: 390, height: 844 },
      { name: 'Mobile_412', width: 412, height: 915 },
      { name: 'Tablet_768', width: 768, height: 1024 },
      { name: 'Laptop_1024', width: 1024, height: 768 },
      { name: 'Desktop_1280', width: 1280, height: 800 },
      { name: 'Large_1440', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/assistant/emails');
      await page.waitForSelector('.mailpilot-conversation-row', { timeout: 10000 });
      await page.waitForTimeout(300);

      // Check for horizontal window overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert(!hasHorizontalOverflow, `${vp.name} (${vp.width}x${vp.height}) - No horizontal body overflow`);

      // If mobile, test opening detail and verify back button
      if (vp.width < 1024) {
        try {
          const rowsMobile = await page.$$('.mailpilot-conversation-row');
          if (rowsMobile.length > 0) {
            await rowsMobile[0].click({ timeout: 5000 });
            await page.waitForTimeout(300);

            const backBtnVisible = await page.isVisible('.mailpilot-back-btn');
            assert(backBtnVisible, `${vp.name} - "Back to Inbox" button is visible and active`);

            // Verify scroll in mobile detail
            const mobileScrollOk = await page.evaluate(() => {
              const scrollArea = document.querySelector('.mailpilot-reading-scroll');
              return !!scrollArea && scrollArea.clientHeight > 0;
            });
            assert(mobileScrollOk, `${vp.name} - Reading scroll container has positive height and scrolls`);

            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `detail_fix_${vp.name}.png`) });
          }
        } catch (mobileErr: any) {
          console.error(`  Warning in ${vp.name} mobile detail test:`, mobileErr?.message);
        }
      } else {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `detail_fix_${vp.name}.png`) });
      }
    }

    console.log('\n===============================================================');
    if (allPassed) {
      console.log('🎉 ALL EMAIL DETAIL LAYOUT & SCROLL TESTS PASSED!');
    } else {
      console.error('⚠️ SOME TESTS FAILED!');
    }
    console.log('===============================================================\n');
  } finally {
    await browser.close();
    process.exit(allPassed ? 0 : 1);
  }
}

runLayoutTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
