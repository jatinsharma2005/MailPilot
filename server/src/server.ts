import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import app from './app.js';
import { connectDB } from './config/database.js';
import { ENV } from './config/env.js';
import { User } from './models/User.js';
import { seedDatabase } from './scripts/seed.js';
import { AIService } from './services/ai.service.js';
import { syncConversations } from './utils/conversationSync.js';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if auto-seed is needed
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[MailPilot] Database is empty. Running initial seed data...');
      await seedDatabase();
    }

    // Synchronize and repair conversation grouping
    await syncConversations();

    const server = app.listen(ENV.PORT, async () => {
      console.log(`===============================================`);
      console.log(`🚀 MailPilot Server running on http://localhost:${ENV.PORT}`);
      console.log(`🛡️ Environment: ${ENV.NODE_ENV}`);
      
      const aiStatus = await AIService.checkGeminiConnectivity();
      console.log(`🤖 AI Engine: ${aiStatus.engine} (${aiStatus.model}) - ${aiStatus.isLive ? 'Online & Verified' : `Standby (${aiStatus.reason || 'Deterministic Fallback'})`}`);
      console.log(`===============================================`);
    });

    const shutdown = () => {
      console.log('[MailPilot] Shutting down gracefully...');
      server.close(() => {
        console.log('[MailPilot] Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[MailPilot] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();
