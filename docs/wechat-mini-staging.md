# Hina WeChat staging

This deployment is an isolated API for the WeChat experience build. It uses the
same code and providers as Hina CN but a separate PostgreSQL database, uploads
directory, process, port, and Redis key prefix.

## Required user-side setup

1. Add an `A` record for `wx-dev.hina-cn.cn` to the ECS public IP.
2. Create the Mini Program AppSecret in WeChat MP and write it directly to
   `/etc/hina/wechat-staging.env`. Never paste it into source control.
3. Add `https://wx-dev.hina-cn.cn` to the Mini Program request, uploadFile, and
   downloadFile legal domains before real-device testing.
4. Keep DevTools request-domain validation disabled only for localhost work.

## Server preparation

```bash
sudo useradd --system --home /opt/Hina-cn-wechat-staging --shell /usr/sbin/nologin hina
sudo install -d -o hina -g hina /opt/Hina-cn-wechat-staging/uploads
sudo install -d -m 700 /etc/hina

sudo -u postgres psql -c "create role hina_wechat_staging login password 'REPLACE_ME';"
sudo -u postgres createdb -O hina_wechat_staging hina_wechat_staging
```

Copy `.env.wechat-staging.example` to `/etc/hina/wechat-staging.env`, fill every
secret on the server, then:

```bash
sudo chmod 600 /etc/hina/wechat-staging.env
set -a
. /etc/hina/wechat-staging.env
set +a
cd /opt/Hina-cn-wechat-staging
npm ci
npm run build
npm run db:migrate
```

Install the service and Nginx examples:

```bash
sudo cp ops/hina-wechat-staging.service.example /etc/systemd/system/hina-wechat-staging.service
sudo systemctl daemon-reload
sudo systemctl enable --now hina-wechat-staging

sudo cp ops/nginx-wechat-staging.conf.example /etc/nginx/sites-available/hina-wechat-staging
sudo ln -s /etc/nginx/sites-available/hina-wechat-staging /etc/nginx/sites-enabled/hina-wechat-staging
sudo nginx -t
sudo systemctl reload nginx
```

Issue the HTTPS certificate before enabling the 443 server block:

```bash
sudo certbot --nginx -d wx-dev.hina-cn.cn
```

## Verification

```bash
systemctl status hina-wechat-staging --no-pager
journalctl -u hina-wechat-staging -n 100 --no-pager
curl -s https://wx-dev.hina-cn.cn/api/health
```

The health response must report database, Redis, Ark, email, and `wechatMini`
as configured. It must never contain credentials.

Experience accounts are intentionally separate from production. To test email
merging in staging, register a staging web account in the staging database.
Production Mini Program accounts will merge against the production Hina
database after the release environment is enabled.
