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

Optional but recommended for test deployment:

- `REDIS_URL`
- `APP_URL`
- `SMTP_*`
- `WECHAT_APP_ID` and `WECHAT_APP_SECRET`

Health check:

```bash
curl http://localhost:3000/api/health
```

Docker and Volcengine deployment notes live in `docs/deploy-volcengine.md`. Use `.env.production.example` as the production template; never commit `.env` or `.env.production`.
