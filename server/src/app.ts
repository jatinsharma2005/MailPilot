import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiError } from './utils/ApiError.js';

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

const normalizeOrigin = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
};

const buildAllowedOrigins = (): Set<string> => {
  const allowed = new Set<string>();
  for (const rawOrigin of ENV.CLIENT_URL.split(',')) {
    const origin = normalizeOrigin(rawOrigin);
    if (!origin) {
      throw new Error('CLIENT_URL contains an invalid origin.');
    }
    allowed.add(origin);
  }

  if (ENV.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed;
};

const allowedOriginsSet = buildAllowedOrigins();

// Origin validator for CORS requests
export const isAllowedOrigin = (origin: string): boolean => {
  const normalized = normalizeOrigin(origin);
  return normalized !== null && allowedOriginsSet.has(normalized);
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

    return callback(new ApiError(403, 'Origin is not allowed.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24-hour preflight cache
  optionsSuccessStatus: 204,
};

// 1. Mount CORS before all other middlewares and routes (handles all methods including OPTIONS)
app.use(cors(corsOptions));

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
    message: 'Resource not found.',
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
