import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const isValidOrigin = (value: string, production: boolean): boolean => {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      (!production || url.protocol === 'https:') &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};

export const parseEnv = (source: NodeJS.ProcessEnv) => {
  const NODE_ENV = source.NODE_ENV?.trim() || 'development';
  const production = NODE_ENV === 'production';
  const portValue = source.PORT?.trim() || '5000';
  const PORT = Number(portValue);

  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const MONGODB_URI = source.MONGODB_URI?.trim() || (production ? '' : 'mongodb://127.0.0.1:27017/mailpilot');
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required in production.');
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(MONGODB_URI) || (production && /<[^>]+>/.test(MONGODB_URI))) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection URI.');
  }

  const JWT_SECRET = source.JWT_SECRET?.trim() || (production ? '' : randomBytes(32).toString('hex'));
  if (
    production &&
    (JWT_SECRET.length < 32 || /^(your|replace|change|example)[-_]/i.test(JWT_SECRET))
  ) {
    throw new Error('Set JWT_SECRET to a unique random value of at least 32 characters in production.');
  }

  const JWT_EXPIRES_IN = source.JWT_EXPIRES_IN?.trim() || '7d';
  if (!/^[1-9]\d*[smhd]$/.test(JWT_EXPIRES_IN)) {
    throw new Error('JWT_EXPIRES_IN must be a positive duration such as 15m, 12h, or 7d.');
  }

  const CLIENT_URL = source.CLIENT_URL?.trim() || (production ? '' : 'http://localhost:5173');
  if (!CLIENT_URL) {
    throw new Error('CLIENT_URL is required in production.');
  }

  const configuredOrigins = CLIENT_URL.split(',').map((origin) => origin.trim());
  if (configuredOrigins.some((origin) => !origin || !isValidOrigin(origin, production))) {
    throw new Error(
      production
        ? 'CLIENT_URL must contain only exact HTTPS origins (comma-separated for additional origins).'
        : 'CLIENT_URL must contain valid HTTP(S) origins without paths, queries, or fragments.'
    );
  }

  return {
    PORT,
    NODE_ENV,
    MONGODB_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    GEMINI_API_KEY: source.GEMINI_API_KEY?.trim() || '',
    GEMINI_MODEL: source.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
    OPENAI_API_KEY: source.OPENAI_API_KEY?.trim() || '',
    OPENAI_MODEL: source.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    OPENAI_ENABLED: source.OPENAI_ENABLED?.trim().toLowerCase() === 'true',
    CLIENT_URL,
  };
};

export const ENV = parseEnv(process.env);
