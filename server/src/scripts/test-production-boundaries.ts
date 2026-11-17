import assert from 'node:assert/strict';
import { once } from 'node:events';
import { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import app, { isAllowedOrigin } from '../app.js';
import { ENV, parseEnv } from '../config/env.js';

const server = app.listen(0, '127.0.0.1');
const allowedOrigin = ENV.CLIENT_URL.split(',')[0].trim();
let baseUrl: string;

before(async () => {
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('production configuration rejects missing database and signing secrets', () => {
  assert.throws(
    () => parseEnv({ NODE_ENV: 'production' }),
    /MONGODB_URI is required in production/
  );
});

test('production configuration rejects placeholder secrets and non-HTTPS origins', () => {
  const validProductionEnv = {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://user:pass@cluster.example/mailpilot',
    JWT_SECRET: 'a-unique-test-secret-that-is-long-enough-123456',
    CLIENT_URL: 'https://mailpilot.example',
  };

  assert.throws(
    () => parseEnv({ ...validProductionEnv, JWT_SECRET: 'replace_with_a_placeholder_secret_123456' }),
    /JWT_SECRET/
  );
  assert.throws(
    () => parseEnv({ ...validProductionEnv, CLIENT_URL: 'http://mailpilot.example' }),
    /exact HTTPS origins/
  );
});

test('CORS accepts the configured origin without enabling credentials', async () => {
  const response = await fetch(`${baseUrl}/api/auth/profile`, {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), allowedOrigin);
  assert.equal(response.headers.get('access-control-allow-credentials'), null);
  assert.match(response.headers.get('access-control-allow-methods') || '', /PATCH/);
});

test('CORS rejects origins outside the explicit allowlist', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://untrusted.invalid',
      'Access-Control-Request-Method': 'POST',
    },
  });

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('CORS allows only HTTPS previews within the configured Vercel project domain', () => {
  assert.equal(
    isAllowedOrigin('https://client-git-preview-branch-jatinsharma2005-projects.vercel.app'),
    true
  );
  assert.equal(isAllowedOrigin('https://client-preview-untrusted.vercel.app'), false);
  assert.equal(
    isAllowedOrigin('http://client-git-preview-branch-jatinsharma2005-projects.vercel.app'),
    false
  );
});

test('public health response omits internal configuration', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'healthy');
  assert.equal('environment' in body, false);
  assert.equal('geminiConfigured' in body, false);
  assert.equal('geminiModel' in body, false);
});

test('admin registration and unauthenticated privileged endpoints are rejected', async () => {
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: allowedOrigin },
    body: JSON.stringify({
      name: 'Test Admin',
      email: 'new-admin@example.com',
      password: 'a-secure-test-password',
      role: 'ADMIN',
    }),
  });
  assert.equal(registerResponse.status, 400);

  for (const path of ['/api/ai/status', '/api/accounts', '/api/dashboard/stats']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, `${path} should require authentication`);
  }
});
