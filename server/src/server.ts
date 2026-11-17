import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/database.js';
import { ENV } from './config/env.js';

type HttpServer = ReturnType<typeof app.listen>;

let server: HttpServer | undefined;
let shuttingDown = false;

const logErrorType = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError');

const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[MailPilot] Received ${signal}; shutting down.`);

  const forceExitTimer = setTimeout(() => {
    console.error('[MailPilot] Graceful shutdown timed out.');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  const activeServer = server;
  const closeHttpServer = activeServer
    ? new Promise<void>((resolve, reject) => {
        activeServer.close((error) => (error ? reject(error) : resolve()));
      })
    : Promise.resolve();

  void (async () => {
    let failed = false;
    try {
      await closeHttpServer;
    } catch (error) {
      failed = true;
      console.error(`[MailPilot] HTTP server close failed (${logErrorType(error)}).`);
    }

    try {
      await mongoose.disconnect();
    } catch (error) {
      failed = true;
      console.error(`[MailPilot] Database close failed (${logErrorType(error)}).`);
    }

    clearTimeout(forceExitTimer);
    if (!failed) console.info('[MailPilot] HTTP server and database connections closed.');
    process.exitCode = failed ? 1 : 0;
  })();
};

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    if (shuttingDown) {
      await mongoose.disconnect();
      return;
    }

    server = app.listen(ENV.PORT, '0.0.0.0', () => {
      console.info(`[MailPilot] API listening on port ${ENV.PORT} (${ENV.NODE_ENV}).`);
    });
    server.on('error', (error: unknown) => {
      console.error(`[MailPilot] HTTP listener failed (${logErrorType(error)}).`);
      process.exitCode = 1;
      void mongoose.disconnect();
    });
  } catch (error) {
    console.error(
      `[MailPilot] Startup failed (${logErrorType(error)}). Verify runtime configuration and database availability.`
    );
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error(`[MailPilot] Database cleanup failed (${logErrorType(disconnectError)}).`);
    }
    process.exitCode = 1;
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

void startServer();
