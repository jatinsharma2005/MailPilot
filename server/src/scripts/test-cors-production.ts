import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/database.js';
import { ENV } from '../config/env.js';

const CLIENT_ORIGIN = ENV.CLIENT_URL.split(',')[0].trim();
const TEST_PORT = 5099;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 MailPilot Production CORS & Authentication Suite');
  console.log('====================================================\n');

  await connectDB();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, '127.0.0.1', () => resolve()));
  console.log(`[Test Server] Running on http://127.0.0.1:${TEST_PORT}\n`);

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
    // -----------------------------------------------------------------
    // TEST 1: Preflight OPTIONS from official Vercel origin
    // -----------------------------------------------------------------
    console.log('--- TEST 1: OPTIONS Preflight from Vercel Origin ---');
    const preflightRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': CLIENT_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    assert(preflightRes.status === 204 || preflightRes.status === 200, 'Preflight status is 204 or 200', `Got ${preflightRes.status}`);
    const allowOrigin = preflightRes.headers.get('access-control-allow-origin');
    assert(allowOrigin === CLIENT_ORIGIN, 'Access-Control-Allow-Origin matches configured origin exactly', `Got: ${allowOrigin}`);
    const allowCredentials = preflightRes.headers.get('access-control-allow-credentials');
    assert(!allowCredentials, 'Credentials are disabled for bearer-token authentication', `Got: ${allowCredentials}`);
    const allowMethods = preflightRes.headers.get('access-control-allow-methods');
    assert(!!allowMethods && allowMethods.includes('POST') && allowMethods.includes('OPTIONS'), 'Allowed methods include POST & OPTIONS', `Got: ${allowMethods}`);
    const allowHeaders = preflightRes.headers.get('access-control-allow-headers');
    assert(!!allowHeaders && allowHeaders.toLowerCase().includes('content-type') && allowHeaders.toLowerCase().includes('authorization'), 'Allowed headers include Content-Type and Authorization', `Got: ${allowHeaders}`);

    // -----------------------------------------------------------------
    // TEST 2: Preflight OPTIONS from unauthorized origin
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Unauthorized Origin Blocked ---');
    const badPreflightRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil-unauthorized-domain.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert(badPreflightRes.status === 403, 'Unauthorized preflight returns 403', `Got: ${badPreflightRes.status}`);
    const badAllowOrigin = badPreflightRes.headers.get('access-control-allow-origin');
    assert(!badAllowOrigin, 'No Access-Control-Allow-Origin header returned for unauthorized origin', `Got: ${badAllowOrigin}`);

    // -----------------------------------------------------------------
    // TEST 3: Login POST with Vercel Origin header
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Cross-Origin Login Request ---');
    const loginRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Origin': CLIENT_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'assistant@mailpilot.io',
        password: 'password123',
      }),
    });

    assert(loginRes.status === 200, 'Login returns HTTP 200', `Got ${loginRes.status}`);
    const loginAllowOrigin = loginRes.headers.get('access-control-allow-origin');
    assert(loginAllowOrigin === CLIENT_ORIGIN, 'Login response has the configured CORS origin', `Got: ${loginAllowOrigin}`);
    const loginCredentials = loginRes.headers.get('access-control-allow-credentials');
    assert(!loginCredentials, 'Login response does not enable cookie credentials', `Got: ${loginCredentials}`);

    const loginData = await loginRes.json();
    assert(loginData.success === true, 'Login payload success is true');
    assert(typeof loginData.token === 'string' && loginData.token.length > 20, 'JWT token received in response');
    const token = loginData.token;

    // -----------------------------------------------------------------
    // TEST 4: Authenticated Request (GET /api/auth/me) with Vercel Origin
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Authenticated API Request with Vercel Origin ---');
    const meRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Origin': CLIENT_ORIGIN,
        'Authorization': `Bearer ${token}`,
      },
    });

    assert(meRes.status === 200, 'GET /api/auth/me returns HTTP 200', `Got ${meRes.status}`);
    const meAllowOrigin = meRes.headers.get('access-control-allow-origin');
    assert(meAllowOrigin === CLIENT_ORIGIN, 'GET /api/auth/me returns configured CORS origin', `Got: ${meAllowOrigin}`);
    const meData = await meRes.json();
    assert(meData.success === true && meData.user?.email === 'assistant@mailpilot.io', 'User data returned matches authenticated assistant');

    // -----------------------------------------------------------------
    // TEST 5: Dashboard Stats API with Vercel Origin
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Protected Dashboard Endpoint ---');
    const dashRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Origin': CLIENT_ORIGIN,
        'Authorization': `Bearer ${token}`,
      },
    });
    assert(dashRes.status === 200, 'GET /api/dashboard/stats returns HTTP 200', `Got ${dashRes.status}`);
    assert(dashRes.headers.get('access-control-allow-origin') === CLIENT_ORIGIN, 'Dashboard response has CORS header');

    // -----------------------------------------------------------------
    // TEST 6: Preflight for protected PUT/DELETE endpoints
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Preflight for Complex Methods (PATCH /api/auth/profile) ---');
    const complexPreflightRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/profile`, {
      method: 'OPTIONS',
      headers: {
        'Origin': CLIENT_ORIGIN,
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });
    assert(complexPreflightRes.status === 204 || complexPreflightRes.status === 200, 'PATCH preflight succeeds');
    assert(complexPreflightRes.headers.get('access-control-allow-origin') === CLIENT_ORIGIN, 'PATCH preflight has CORS origin');
    const complexMethods = complexPreflightRes.headers.get('access-control-allow-methods') || '';
    assert(complexMethods.includes('PATCH'), 'PATCH is in allowed methods list');

    console.log('\n====================================================');
    if (allPassed) {
      console.log('🎉 ALL CORS & PRODUCTION LOGIN TESTS PASSED!');
    } else {
      console.error('⚠️ SOME TESTS FAILED!');
    }
    console.log('====================================================\n');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await mongoose.disconnect();
    process.exitCode = allPassed ? 0 : 1;
  }
}

runTests().catch((err) => {
  const errorName = err instanceof Error ? err.name : 'UnknownError';
  console.error(`Fatal test error (${errorName}).`);
  void mongoose.disconnect().finally(() => {
    process.exitCode = 1;
  });
});
