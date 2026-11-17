# MailPilot Production Deployment Report

## Summary

The supplied Render log shows that the service was started with `npm run dev`. That invokes `tsx watch src/server.ts`, but `tsx` is a development dependency and is not installed in a production-only install. Render must start the service with `npm start`, which runs the compiled JavaScript.

The backend already had the correct production entry point and TypeScript output settings. The repository deployment manifest now uses the requested Render build command. The TypeScript compiler and type packages are regular dependencies so `npm install` can build even when `NODE_ENV=production` omits development dependencies; `tsx` remains development-only.

## Files changed

- `render.yaml` — use the required Render build command; keep `rootDir: server` and `startCommand: npm start`.
- `server/package.json` — keep the production scripts, ensure compiler/type dependencies are present in production installs, and upgrade Zod to its patched major release.
- `server/package-lock.json` — refresh the npm lockfile for the dependency changes.
- `server/src/app.ts` — constrain Vercel preview CORS to the configured project domain and use Helmet defaults instead of allowing cross-origin resource embedding.
- `server/src/middleware/validate.middleware.ts` and `server/src/validators/email.schema.ts` — update validation code for Zod 4.
- `server/src/scripts/test-production-boundaries.ts` — add a regression test for project-scoped HTTPS Vercel previews.
- `PRODUCTION_DEPLOYMENT_REPORT.md` — this report.

No Yarn lockfile is present. The root, server, and client use npm lockfiles.

## Final backend scripts and output

`server/package.json`:

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

The TypeScript settings already use `rootDir: "./src"` and `outDir: "./dist"`. The verified compiled entry point is `server/dist/server.js`. The production-only install contained no `tsx`, and `npm start` still launched the compiled entry using Node.

## Render settings

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Node | `22.x` (also constrained by `server/package.json` engines) |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://client-git-main-jatinsharma2005-projects.vercel.app` |
| `MONGODB_URI` | MongoDB Atlas connection URI |
| `JWT_SECRET` | Unique random value with at least 32 characters |
| `PORT` | Leave to Render; the server listens on `process.env.PORT` and binds `0.0.0.0` |

`JWT_EXPIRES_IN` is optional and defaults to `7d`. AI provider variables are optional: set `GEMINI_API_KEY` and/or set `OPENAI_API_KEY` with `OPENAI_ENABLED=true` to enable providers. With no available provider, the deterministic response is reported as `Demo Fallback`. Do not put backend secrets in Vercel variables.

The server validates the MongoDB URI, JWT secret, and client origin in production before startup. It connects to MongoDB before listening and registers SIGTERM/SIGINT handlers for graceful shutdown.

## Vercel setting

Set only this API URL variable in the Vercel client build environment:

```text
API_URL=https://mailpilot-jewd.onrender.com
```

Set it for every Vercel deployment environment that should use the backend, then rebuild. `client/vite.config.ts` explicitly exposes only `API_URL` to the client bundle; Vite proxy behavior remains pointed at `http://localhost:5000` for development. The client API client appends `/api`, so production requests go to Render rather than a Vercel `/api` path.

## Production and security audit findings

- Express trusts one proxy hop for Render; CORS runs before rate limiting and routes, and OPTIONS requests are excluded from the limiter.
- Production CORS allows the exact configured HTTPS origin. It also permits HTTPS deployment names matching the configured `client-git-main-<project-scope>.vercel.app` project family; it does not allow arbitrary Vercel domains. Localhost origins are added only outside production. CORS does not enable credentials.
- Helmet now uses its default restrictive cross-origin resource policy. Authentication uses bearer JWTs, password hashes are excluded from normal user queries, and auth responses explicitly serialize safe user fields.
- Route/controller inspection found workspace IDs applied to data queries and role checks on privileged route groups. Assistant and client login and protected `/api/auth/me` calls were exercised against the configured database.
- Gemini is attempted before OpenAI when enabled/available, followed by deterministic fallback. Existing tests confirm quota handling, provider errors, and fallback metadata. The fallback is identified as `Demo Fallback`; it is not represented as a live model.
- Gmail/Outlook account connection is explicitly marked “Simulated OAuth”; the current repository does not implement a real mail-provider OAuth or delivery integration. Simulated replies are identified as simulated and require explicit approval.
- The production dependency audit initially found a high-severity Zod issue. Zod was upgraded to `4.6.7`, with compatibility fixes in validation code. The final production audit reports zero vulnerabilities.

## Actual test results

| Check | Result |
|---|---|
| `cd server && npm install` | Passed; final install reports zero vulnerabilities. |
| `cd server && npm run build` | Passed; emits `server/dist/server.js`. |
| Production-only install (`npm install --omit=dev`) and build | Passed; `tsx` absent and TypeScript build still succeeds. |
| `npm start` with `NODE_ENV=production` | Passed; executed `node dist/server.js`, connected to MongoDB Atlas, and listened on the configured port. |
| Local `/api/health` | Passed: HTTP 200, `healthy`. |
| MongoDB connection | Passed during production startup and the successful integrated CORS suite. One earlier attempt to connect from the standalone test suite failed with a MongoDB server-selection/IP-whitelist error; retry in production mode connected and passed. |
| Assistant login and protected `/api/auth/me` | Passed: HTTP 200, role `ASSISTANT`. |
| Client login and protected `/api/auth/me` | Passed: HTTP 200, role `CLIENT`. |
| Production CORS boundary suite | Passed: 7/7 tests, including exact origin, project preview, no credentials, and rejected unauthorized origin. |
| Integrated cross-origin login/CORS suite | Passed: all six test sections after the MongoDB retry. |
| Local production Vercel preflight | Passed: HTTP 204 with the exact configured allow-origin and no credentials. |
| Local unauthorized-origin preflight | Passed: HTTP 403 with no allow-origin header. |
| Proxy rate-limit test | Passed: request 301 from one forwarded IP returned 429; a different forwarded IP returned 200. |
| AI quota/fallback suite | Passed: 8/8. |
| Gemini/OpenAI failover suite | Passed: 18/18. |
| Client production build | Passed: Vite built successfully. The bundle contains the Render hostname and no `VITE_API_URL` reference. |
| Production dependency audit | Passed: zero vulnerabilities after the Zod upgrade. |

During the Zod major-version update, an initial build exposed three Zod 3 API usages; these were corrected and the final build and suites above passed.

### Current deployed Render observation

The live backend health endpoint returned HTTP 200. However, the currently deployed service did **not** match the updated local CORS behavior when probed: both allowed and unauthorized OPTIONS requests returned HTTP 204, no `Access-Control-Allow-Origin` header was present, and `Access-Control-Allow-Credentials: true` was present. This indicates the Render service needs the updated code/settings deployed and then rechecked. The local code returns the required origin for the configured frontend, omits credential access, and returns 403 for an unauthorized origin.

## Remaining limitations and actions

1. Update the Render Dashboard start command to `npm start` if it is manually overridden; the provided crash log indicates it is currently `npm run dev`. Apply the Render settings above and deploy the changed branch.
2. After deployment, retest the live CORS headers. Do not consider the deployment complete until the configured Vercel origin receives `Access-Control-Allow-Origin` without `Access-Control-Allow-Credentials`, and an unauthorized origin is rejected.
3. Configure `API_URL` in Vercel and trigger a new frontend deployment.
4. The repository has an unauthenticated one-click demo-login endpoint and seeded demo accounts. Keep those accounts limited to non-sensitive demo data; decide whether to disable/gate demo access and rotate any shared demo credentials before storing real customer data.
5. Gmail/Outlook OAuth and actual email delivery remain simulated; configure genuine provider integrations before representing those operations as live.

## Deployment checklist

- [ ] Render root directory is `server`.
- [ ] Render build command is `npm install && npm run build`.
- [ ] Render start command is `npm start` (not `npm run dev`).
- [ ] Render uses Node 22.x and `NODE_ENV=production`.
- [ ] Render has valid `MONGODB_URI`, unique `JWT_SECRET`, and the exact `CLIENT_URL`.
- [ ] Vercel has `API_URL=https://mailpilot-jewd.onrender.com` for the required deployment environments.
- [ ] Both deployments have been rebuilt/redeployed.
- [ ] Live health, login, allowed/unauthorized CORS, and rate-limit behavior have been rechecked after deployment.
- [ ] Demo credentials are rotated/disabled or confined to a public demo dataset.
