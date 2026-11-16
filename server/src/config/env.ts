import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mailpilot',
  JWT_SECRET: process.env.JWT_SECRET || 'mailpilot_default_secure_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AI_PRIMARY_PROVIDER: process.env.AI_PRIMARY_PROVIDER || 'gemini',
  AI_SECONDARY_PROVIDER: process.env.AI_SECONDARY_PROVIDER || 'openai',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_ENABLED: process.env.OPENAI_ENABLED === 'true',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:5000',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'demo_google_client_id',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'demo_google_client_secret',
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || 'demo_microsoft_client_id',
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || 'demo_microsoft_client_secret',
};
