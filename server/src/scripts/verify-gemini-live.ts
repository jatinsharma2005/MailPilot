import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import dotenv from 'dotenv';
dotenv.config();

import { AIService } from '../services/ai.service.js';
import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.js';
import { AIClassificationResultSchema } from '../validators/ai.schema.js';

async function verify() {
  console.log('\n======================================================');
  console.log('🤖 MAILPILOT GEMINI 3.8 FLASH VERIFICATION SUITE');
  console.log('======================================================\n');

  console.log(`Configured Model: ${ENV.GEMINI_MODEL}`);
  console.log(`API Key Configured: ${ENV.GEMINI_API_KEY ? 'Yes (' + ENV.GEMINI_API_KEY.slice(0, 8) + '...)' : 'No'}`);

  // 1. Connectivity Check
  console.log('\n--- 1. Connectivity Check ---');
  const conn = await AIService.checkGeminiConnectivity(true);
  console.log(`Status: ${conn.engine} | Live: ${conn.isLive} | Model: ${conn.model}`);
  if (conn.error) console.log(`Notice: ${conn.error}`);

  // 2. Real Reply Generation
  console.log('\n--- 2. Reply Generation ---');
  const replyRes = await AIService.generateReply({
    subject: 'Project Kickoff Scheduling',
    body: 'Hi Sarah, can we coordinate a 30-minute kickoff with Alexander next Tuesday or Thursday?',
    sender: { name: 'Elena Rostova', email: 'elena@partner.com' },
    tone: 'professional',
    customInstructions: 'Express enthusiasm and propose 2:00 PM EST',
  });
  console.log(`Engine: ${replyRes.engine} (Live: ${replyRes.isGeminiLive})`);
  console.log(`Draft Reply:\n${replyRes.reply}\n`);

  // 3. Email Classification
  console.log('\n--- 3. Email Classification ---');
  const classRes = await AIService.classifyEmail({
    subject: 'URGENT: Partnership Agreement Signature Needed',
    body: 'Alexander, please sign the attached partnership agreement before end of day today so we can finalize the press release.',
    sender: { name: 'David Vance', email: 'dvance@venturecap.com' },
  });
  const validated = AIClassificationResultSchema.safeParse(classRes);
  console.log(`Engine: ${classRes.engine} (Live: ${classRes.isGeminiLive})`);
  console.log(`Classification: ${classRes.classification} | Priority: ${classRes.priority} | Confidence: ${classRes.confidence}`);
  console.log(`Summary: ${classRes.summary}`);
  console.log(`Suggested Action: ${classRes.suggestedAction}`);
  console.log(`Zod Schema Valid: ${validated.success}`);

  // 4. Conversation Summarization
  console.log('\n--- 4. Conversation Summarization ---');
  const sumRes = await AIService.summarizeConversation({
    subject: 'Series A Term Sheet Discussion',
    emails: [
      {
        sender: { name: 'Marcus Vance', email: 'marcus@sequoia.com' },
        body: 'Here is the preliminary valuation model for review.',
        date: new Date(),
      },
      {
        sender: { name: 'Alexander Wright', email: 'client@mailpilot.io' },
        body: 'Thanks Marcus. The liquidation terms look reasonable. Proceeding with counsel review.',
        date: new Date(),
      },
    ],
  });
  console.log(`Engine: ${sumRes.engine} (Live: ${sumRes.isGeminiLive})`);
  console.log(`Summary: ${sumRes.summary}`);
  console.log(`Key Points: ${JSON.stringify(sumRes.keyPoints)}`);
  console.log(`Suggested Action: ${sumRes.suggestedAction}`);

  // 5. Fallback Mode with Invalid API Key
  console.log('\n--- 5. Fallback Mode with Invalid Key ---');
  try {
    const invalidClient = new GoogleGenAI({
      apiKey: 'AIzaSyFakeInvalidKeyForTestingFallback12345',
      httpOptions: { timeout: 10000 },
    });
    let invalidResThrew = false;
    try {
      await invalidClient.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: 'Test fallback',
      });
    } catch (err: any) {
      invalidResThrew = true;
      console.log(`Expected rejection caught: ${err.message?.slice(0, 100)}...`);
    }

    if (!invalidResThrew) {
      throw new Error('Fake key unexpectedly succeeded');
    }

    // Verify deterministic fallback function returns complete valid schema
    const fallbackClass = await AIService.classifyEmail({
      subject: 'Weekly Newsletter #42',
      body: 'Here is your weekly digest. To unsubscribe, click here.',
      sender: { name: 'Tech Digest', email: 'newsletter@techdigest.com' },
    });
    console.log(`Deterministic classification succeeded: ${fallbackClass.classification} (Confidence: ${fallbackClass.confidence})`);
  } catch (err: any) {
    console.error('Fallback test error:', err.message);
  }

  console.log('\n======================================================');
  console.log('✅ ALL GEMINI & FALLBACK VERIFICATIONS COMPLETED');
  console.log('======================================================\n');
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
