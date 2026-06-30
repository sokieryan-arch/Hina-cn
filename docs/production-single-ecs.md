# Hina-cn Single-ECS Production Runbook

This runbook is for the low-cost test deployment: one ECS runs Node, PostgreSQL, Redis, and Nginx. It is cheaper than RDS/managed Redis, but database backups become your responsibility.

## 1. Deployment Modes

- Temporary public-IP testing: use `.env` with `NODE_ENV=development`. This keeps non-secure cookies working on plain `http://PUBLIC_IP:3000`.
- Real production: use `.env.production` with `NODE_ENV=production`, a real domain, and HTTPS. Do not use production mode on a bare HTTP public IP because secure cookies will not be sent by the browser.

## 2. Prepare The Server

```bash
apt update
apt install -y git curl openssl nginx postgresql redis-server
systemctl enable --now postgresql redis-server nginx
```

Install Node 22 if it is not already present:

```bash
node -v
npm -v
```

## 3. Deploy Code

```bash
cd /opt/Hina-cn
git fetch origin
git switch main
git pull --ff-only origin main
npm ci
npm run build
npm run db:migrate
```

## 4. Configure Environments

Keep temporary IP testing in `.env`:

```bash
NODE_ENV=development
APP_URL=http://PUBLIC_IP:3000
PORT=3000
```

Create production config only after a domain and HTTPS are ready:

```bash
cp .env.production.example .env.production
openssl rand -hex 32
```

Fill `.env.production` with:

```bash
NODE_ENV=production
APP_URL=https://hina.example.cn
SESSION_SECRET=...
DATABASE_URL=postgres://hina_app:DB_PASS@127.0.0.1:5432/hina_cn
REDIS_URL=redis://:REDIS_PASS@127.0.0.1:6379
ARK_API_KEY=...
ARK_CHAT_MODEL=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Hina <no-reply@hina.example.cn>
```

Production email verification requires SMTP. Phone verification returns `phone_verification_unavailable` until real SMS delivery is implemented.

### Auth readiness

Email registration, login, and password reset are the first production-ready auth path. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` before enabling production email verification.

Phone verification is intentionally unavailable until Volcengine SMS sign name and template approval are complete. WeChat login requires a public HTTPS domain and an approved WeChat Open Platform website application.

## 5. Install systemd Service

```bash
cp ops/hina-cn.service.example /etc/systemd/system/hina-cn.service
# For temporary public-IP HTTP testing, edit the service file and use:
# EnvironmentFile=/opt/Hina-cn/.env
systemctl daemon-reload
systemctl enable --now hina-cn
systemctl status hina-cn --no-pager
```

Common commands:

```bash
systemctl restart hina-cn
systemctl stop hina-cn
journalctl -u hina-cn -n 100 --no-pager
curl -s http://127.0.0.1:3000/api/health
```

## 6. Enable Nginx And HTTPS

After buying a domain, completing ICP filing, and pointing DNS to the ECS public IP:

```bash
cp ops/nginx-hina.conf.example /etc/nginx/sites-available/hina-cn
ln -sf /etc/nginx/sites-available/hina-cn /etc/nginx/sites-enabled/hina-cn
nginx -t
systemctl reload nginx
```

Install certificates with your preferred ACME tool, then update the `server_name` and certificate paths in the Nginx config. After HTTPS works, switch systemd to `.env.production` and restart:

```bash
systemctl restart hina-cn
curl -s https://hina.example.cn/api/health
```

## 7. Backups And Rollback

Create a database backup before upgrades:

```bash
mkdir -p /opt/hina-backups
set -a && . /opt/Hina-cn/.env.production && set +a
pg_dump "$DATABASE_URL" > "/opt/hina-backups/hina-cn-$(date +%F-%H%M%S).sql"
```

Restore a backup:

```bash
set -a && . /opt/Hina-cn/.env.production && set +a
psql "$DATABASE_URL" < /opt/hina-backups/hina-cn-BACKUP.sql
```

Rollback code:

```bash
cd /opt/Hina-cn
git log --oneline -5
git checkout PREVIOUS_COMMIT
npm ci
npm run build
npm run db:migrate
systemctl restart hina-cn
```

## 8. Cost Controls

- Stop ECS when you are not testing for long periods.
- Disk and public IP may still bill after stopping; release resources only after backing up data.
- Keep the balance warning enabled in the Volcengine billing center.
- For longer testing, compare pay-as-you-go versus a smaller reserved instance.
