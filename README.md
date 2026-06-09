# Hina CN

Mainland China Web/H5 edition of Hina, with local account auth, WeChat website OAuth hooks, Postgres-ready storage, Redis-ready verification/session caches, and a Volcengine Ark model adapter.

## Local Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` or `.env`. Without `DATABASE_URL` and `REDIS_URL`, the app uses in-memory adapters for local testing only.

## Useful Commands

- `npm run test` runs service tests.
- `npm run lint` runs TypeScript checks.
- `npm run build` builds the Vite app and Node server bundle.
