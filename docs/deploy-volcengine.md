# Hina-cn Volcengine Test Deployment

This guide deploys the Web/H5 test version to a mainland China server. Keep real secrets only on the server or in your CI/CD secret store.

## 1. Prepare Cloud Resources

- ECS: Linux server with Docker installed.
- RDS PostgreSQL: create a database for Hina and allow ECS access.
- Redis: create an instance for verification codes and short-lived cache.
- Volcengine Ark: create an API key and confirm the model or endpoint ID works with `ARK_CHAT_MODEL`.
- Domain and HTTPS: point a test domain to the ECS public IP before WeChat login testing.

## 2. Configure Environment

Copy the template on the server:

```bash
cp .env.production.example .env.production
```

Fill these before starting production:

```bash
NODE_ENV=production
SESSION_SECRET=...
DATABASE_URL=...
REDIS_URL=...
ARK_API_KEY=...
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_CHAT_MODEL=...
APP_URL=https://your-domain.example.cn
```

Never commit `.env.production`.

## 3. Build And Migrate

From the repository root:

```bash
npm ci
npm run build
npm run db:migrate
```

`npm run db:migrate` reads `DATABASE_URL`, creates `schema_migrations`, and applies pending SQL files in `migrations/`.

## 4. Docker Deployment

Build the image:

```bash
docker build -t hina-cn:latest .
```

Run migrations inside the image if you deploy only the container artifact:

```bash
docker run --rm --env-file .env.production hina-cn:latest npm run db:migrate
```

Start the app:

```bash
docker run -d \
  --name hina-cn \
  --restart unless-stopped \
  --env-file .env.production \
  -p 3000:3000 \
  hina-cn:latest
```

Check health:

```bash
curl http://127.0.0.1:3000/api/health
```

The health response reports database, Redis, and Ark model configuration status without returning secret values.

## 5. Reverse Proxy

Use Nginx or a cloud load balancer to terminate HTTPS and proxy to `127.0.0.1:3000`.

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;
}
```

## 6. Rollback

Keep the previous Docker image tag. To roll back:

```bash
docker stop hina-cn
docker rm hina-cn
docker run -d --name hina-cn --restart unless-stopped --env-file .env.production -p 3000:3000 hina-cn:previous
```

Database migrations should be additive for test deployments. Avoid destructive schema changes without a manual rollback SQL file.

## 7. Common Issues

- `Missing required production environment variables`: check `SESSION_SECRET`, `DATABASE_URL`, `ARK_API_KEY`, and `ARK_CHAT_MODEL`.
- `/api/health` returns database failure: confirm RDS whitelist/security group and `DATABASE_URL`.
- `/api/health` returns Redis failure: confirm Redis password, port, and security group.
- Chat returns `ark_chat_failed`: confirm `ARK_BASE_URL` is exactly `https://ark.cn-beijing.volces.com/api/v3` and `ARK_CHAT_MODEL` is a callable model or endpoint ID.
- WeChat login fails: configure a public HTTPS domain in WeChat Open Platform; localhost callbacks will not work for real website OAuth.
