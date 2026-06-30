# Email Auth Readiness Design

## Summary

Hina-cn already has the core account system: identifier parsing, password login, verification codes, session cookies, PostgreSQL storage, and a WeChat OAuth skeleton. The next production-ready step is to make email registration and password reset usable with real SMTP, while keeping phone and WeChat entry points honest when their external services are not configured.

This iteration does not implement real SMS delivery or complete WeChat production login. It prepares the user-facing auth experience so Hina has a reliable email-based entry path now, and gives clear guidance for the services that still require external approval.

## Goals

- Fix the login/register/reset panel Chinese copy so users see readable text.
- Keep email registration, login, logout, and password reset working with existing backend APIs.
- In production, email code sending must fail clearly if SMTP is not configured.
- In development, email and phone codes may still be logged with `devCode`.
- Phone verification should show a clear "not available yet" message when real SMS is not connected.
- WeChat login should show a clear "not configured yet" message when AppID/credentials/domain are missing.
- Keep the current API surfaces stable.

## Non-Goals

- No real Volcengine SMS send implementation in this iteration.
- No WeChat Open Platform production callback verification in this iteration.
- No domain, ICP, HTTPS, or WeChat website application submission work in code.
- No account-linking UI for binding WeChat to an existing password account yet.

## Design

### Auth Panel Copy

`AuthPanel.tsx` should use normal UTF-8 Chinese strings. The page should clearly label:

- 登录 / 注册 / 忘记密码
- 昵称
- 手机号或邮箱
- 密码 / 新密码
- 验证码
- 发送
- 进入 Hina / 创建账号 / 重置密码
- 微信登录

Error messages should map backend error codes to user-facing Chinese:

- `invalid_credentials`: 账号或密码不对。
- `already_registered`: 这个账号已经注册过了。
- `invalid_verification_code`: 验证码不对或已过期。
- `weak_password`: 密码至少需要 8 位。
- `invalid_phone`: 请输入中国大陆手机号。
- `invalid_email`: 邮箱格式不太对。
- `email_not_configured`: 邮箱验证码还没有配置好，请稍后再试。
- `phone_verification_unavailable`: 手机验证码暂未开放，请先使用邮箱注册。
- `missing_wechat_app_id` / `missing_wechat_credentials`: 微信登录还没有配置好。

### Email Auth Behavior

The existing backend flow remains:

1. `POST /api/auth/send-code` parses email or phone.
2. The verification code is stored in Redis/Postgres/memory.
3. Email targets use SMTP when configured.
4. Production without SMTP returns `email_not_configured`.
5. `POST /api/auth/register` consumes the code, hashes the password, creates the user, and sets the session cookie.
6. `POST /api/auth/login` verifies password and sets the session cookie.
7. `POST /api/auth/password/reset` consumes a reset code and updates the password.

This iteration adds tests around the API-level email path and improves the UI messages. It does not change the data model.

### Phone and WeChat Honest States

Phone verification stays deliberately unavailable in production until real SMS credentials, sign name, and templates are approved. The UI should display that as a product state, not as a mysterious failure.

WeChat login stays behind `WECHAT_APP_ID`, `WECHAT_APP_SECRET`, and a real HTTPS `APP_URL`. The current OAuth URL builder and callback remain in place, but the UI should tell users clearly when it is not configured.

## Testing

- API test: email registration/login/reset works through `registerApiRoutes` with a fake notifier.
- API test: production email send without SMTP returns `email_not_configured`.
- UI/server-render test: auth panel contains readable Chinese labels and maps unavailable phone/WeChat errors to clear copy.
- Regression test: existing auth service tests keep passing.
- Full verification: `npm run test`, `npm run lint`, `npm run build`.

## Deployment Notes

For the current HTTP public-IP test server, keep `NODE_ENV=development` in `/opt/Hina-cn/.env` so cookies work without HTTPS. Email can still be tested with SMTP configured in development.

For formal domain deployment, set:

- `APP_URL=https://your-domain.example`
- `NODE_ENV=production`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Phone SMS and WeChat login require separate credential and approval work after the domain is ready.
