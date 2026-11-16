import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import clientRoutes from './routes/client.routes.js';
import aiRoutes from './routes/ai.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import accountRoutes from './routes/account.routes.js';
import taskRoutes from './routes/task.routes.js';

const app = express();

// Trust reverse proxy (e.g. Render, Cloudflare) - required for express-rate-limit behind proxy
app.set('trust proxy', 1);

// Build and normalize allowed origins
const buildAllowedOrigins = (): Set<string> => {
  const allowed = new Set<string>();

  // Always allow the exact production Vercel deployment
  allowed.add('https://client-git-main-jatinsharma2005-projects.vercel.app');

  // Local development origins
  allowed.add('http://localhost:5173');
  allowed.add('http://127.0.0.1:5173');
  allowed.add('http://localhost:3000');
  allowed.add('http://127.0.0.1:3000');

  // Support single or comma-separated CLIENT_URL allowlist from environment
  if (ENV.CLIENT_URL) {
    const urls = ENV.CLIENT_URL.split(',');
    for (const rawUrl of urls) {
      const trimmed = rawUrl.trim().replace(/\/+$/, '');
      if (trimmed) {
        allowed.add(trimmed);
      }
    }
  }

  return allowed;
};

const allowedOriginsSet = buildAllowedOrigins();

// Origin validator for CORS requests
export const isAllowedOrigin = (origin: string): boolean => {
  const normalized = origin.trim().replace(/\/+$/, '');

  // Exact match in configured/default set
  if (allowedOriginsSet.has(normalized)) {
    return true;
  }

  // Support Vercel preview/branch deployments for this project
  if (/^https:\/\/client-[a-zA-Z0-9_-]+-jatinsharma2005-projects\.vercel\.app$/.test(normalized)) {
    return true;
  }

  return false;
};

// CORS configuration options
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Non-browser or direct server-to-server requests (no Origin header)
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    // Disallowed origin: reject without crashing or exposing credentials
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24-hour preflight cache
  optionsSuccessStatus: 204,
};

// 1. Mount CORS before all other middlewares and routes (handles all methods including OPTIONS)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Security headers (allowing cross-origin resource access for frontend)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Global rate limiting
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MailPilot Backend API',
    version: '1.0.0',
    environment: ENV.NODE_ENV,
    geminiConfigured: !!(ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY.trim().length > 0),
    geminiModel: ENV.GEMINI_MODEL,
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
