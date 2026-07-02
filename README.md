# Hina CN

Mainland China Web/H5 edition of Hina, with local account auth, WeChat website OAuth hooks, Postgres-ready storage, Redis-ready verification/session caches, and a Volcengine Ark model adapter.

## Local Development

```bash
npm install
npm run build
npm run dev
```

Copy `.env.example` to `.env`. Without `DATABASE_URL` and `REDIS_URL`, the app uses in-memory adapters for local testing only.

## Useful Commands

- `npm run test` runs service tests.
- `npm run lint` runs TypeScript checks.
- `npm run build` builds the Vite app and Node server bundle.
- `npm run db:migrate` applies pending PostgreSQL migrations using `DATABASE_URL`.

## Test Deployment

Production requires persistent storage and real Ark configuration:

- `SESSION_SECRET`
- `DATABASE_URL`
- `ARK_API_KEY`
- `ARK_CHAT_MODEL`
- `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` for email verification

Optional but recommended for test deployment:

- `REDIS_URL`
- `APP_URL`
- `WECHAT_APP_ID` and `WECHAT_APP_SECRET`

Health check:

```bash
curl http://localhost:3000/api/health
```

### Auth readiness

Email registration, login, and password reset are the first production-ready auth path. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` before enabling production email verification.

Phone verification is intentionally unavailable until Volcengine SMS sign name and template approval are complete. WeChat login requires a public HTTPS domain and an approved WeChat Open Platform website application.

For the current low-cost single-ECS path, use `docs/production-single-ecs.md`.
Docker and managed-resource Volcengine deployment notes live in `docs/deploy-volcengine.md`.
Use `.env.staging.example` for public-IP staging and `.env.production.example` for real HTTPS production; never commit `.env`, `.env.staging`, or `.env.production`.

Important: `APP_ENV` controls Hina's product/runtime strictness, while `NODE_ENV` controls Node/browser behavior such as secure cookies. For temporary bare public-IP testing, use `APP_ENV=staging` with `NODE_ENV=development`; for real HTTPS production, use `APP_ENV=production` with `NODE_ENV=production`.
