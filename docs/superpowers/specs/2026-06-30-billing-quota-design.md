# Hina-cn Billing Quota Design

## Summary

Hina-cn needs a low-risk paid-membership foundation before real WeChat Pay or Alipay integration. The first version will add daily chat quotas and Pro entitlement state without collecting money yet. Free users get 30 successful chat replies per day. Pro users are treated as unlimited. The actual checkout endpoint will exist, but it will clearly return that payment is not ready.

This keeps the product testable on the current single-ECS setup, avoids wasting Ark tokens after a user is over quota, and leaves a clean place for future payment callbacks to grant Pro access.

## Goals

- Show each logged-in user their current plan and daily chat usage.
- Limit free users to 30 model-backed chat replies per local app day.
- Do not call Ark when a free user is already out of quota.
- Allow Pro users to bypass the daily limit.
- Add a checkout stub API that returns a clear `billing_not_ready` error.
- Keep the implementation compatible with memory mode, PostgreSQL mode, and the existing migration runner.

## Non-Goals

- No real WeChat Pay, Alipay, Stripe, Apple, or card payment in this iteration.
- No invoices, refunds, renewal jobs, coupons, or order reconciliation yet.
- No admin console for manually granting Pro in the UI. Manual database updates are acceptable for early testing.
- No quota for TTS or proactive messages in this iteration.

## Product Behavior

Free users see a small usage indicator such as `Free - 12/30 today`. After the 30th successful Hina reply, the 31st chat request returns `quota_exceeded`; the UI shows a friendly upgrade prompt and does not add a fake Hina reply. The user can still read old messages, change settings, clear history, and log out.

Pro users see `Pro - unlimited` and are not blocked by the daily chat quota. The first Pro state can be granted by directly inserting or updating a row in the entitlement table.

## Data Model

Add migration `002_billing_usage.sql`.

`user_entitlements`

- `user_id text primary key references users(id) on delete cascade`
- `plan text not null default 'free' check (plan in ('free', 'pro'))`
- `pro_expires_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

`usage_daily`

- `user_id text not null references users(id) on delete cascade`
- `usage_date date not null`
- `chat_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- primary key `(user_id, usage_date)`

The backend will compute "today" from server time for this first version. This is simple and predictable for a mainland deployment. A later version can accept a user timezone setting if needed.

## Server Interfaces

`GET /api/billing/me`

Returns:

```json
{
  "plan": "free",
  "isPro": false,
  "dailyLimit": 30,
  "usedToday": 12,
  "remainingToday": 18,
  "resetAt": "2026-07-01T00:00:00.000+08:00"
}
```

For Pro users, `dailyLimit` and `remainingToday` return `null`.

`POST /api/billing/checkout`

Always returns HTTP 503 with:

```json
{ "error": "billing_not_ready" }
```

`POST /api/chat`

Before sanitizing and calling Ark, the API checks daily quota for the current user:

- If Pro: continue.
- If free and remaining quota is 0: return HTTP 402 with `{ "error": "quota_exceeded", "billing": ... }`.
- If free and quota remains: call Ark, persist the user/model/tip messages, then increment usage exactly once after a successful model response.

Usage increments only after Hina produces a response. Auth failures, rate limits, malformed requests, Ark errors, and quota failures do not consume daily quota.

## Store Interfaces

Extend `AppStore` with a `billing` store:

- `getBillingSummary(userId, now): Promise<BillingSummary>`
- `incrementChatUsage(userId, usageDate): Promise<BillingSummary>`
- `setPlan(userId, plan, proExpiresAt): Promise<BillingSummary>` for tests and future payment callbacks

The PostgreSQL implementation uses `insert ... on conflict ... do update` for daily usage increments. The memory implementation uses maps keyed by `userId` and ISO date.

## Configuration

Add:

- `FREE_DAILY_CHAT_LIMIT=30`
- `PRO_DAILY_CHAT_LIMIT=0`

`0` means unlimited. The production example env should include these defaults. If values are absent, runtime defaults are `30` for free and unlimited for Pro.

## Frontend

The API client gains `billing.me()` and `billing.checkout()`. App startup fetches billing state after auth. After a successful chat, the UI refreshes or updates the billing summary. If `/api/chat` returns `quota_exceeded`, the chat composer remains visible but shows an upgrade-oriented Hina message or inline banner.

The UI copy should stay warm and product-like, not financial-console-like:

- `Free - 12/30 chats today`
- `Pro - unlimited chats`
- `You used today's free chats. Pro is coming soon.`

The checkout button can open a disabled modal or toast saying payment is not open yet. It should not imply money was collected.

## Error Handling

- `quota_exceeded` uses HTTP 402 because it is an entitlement/payment-adjacent failure.
- `billing_not_ready` uses HTTP 503 because checkout is intentionally unavailable.
- Billing API responses never expose database details, payment secrets, or provider keys.
- If billing storage fails during `/api/chat`, the request fails before calling Ark so the app does not spend model tokens without knowing whether quota is available.

## Testing

Add focused tests before implementation:

- Billing summary defaults to free with 30 daily chats.
- Free users can chat while usage is below 30.
- The 31st free chat returns `quota_exceeded` and does not call the provider.
- Successful free chat increments usage once after the model response.
- Ark/provider failure does not increment usage.
- Pro users bypass the daily limit.
- Usage resets on a new date.
- `GET /api/billing/me` returns a redacted, stable shape.
- `POST /api/billing/checkout` returns `billing_not_ready`.

Full verification remains:

- `npm run test`
- `npm run lint`
- `npm run build`

## Rollout

This work can ship while the app is still on public-IP HTTP testing. It does not require domain, HTTPS, ICP, merchant credentials, or real payment callbacks. When real payments are ready, the payment provider callback only needs to validate the paid order and update `user_entitlements` to `plan = 'pro'` with an optional expiry.
