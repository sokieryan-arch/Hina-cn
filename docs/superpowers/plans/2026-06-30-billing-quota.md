# Billing Quota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a low-risk membership foundation where free users get 30 successful chats per day, Pro users are unlimited, and real checkout is explicitly unavailable.

**Architecture:** Add a billing store to the existing `AppStore` abstraction, backed by memory maps in development and PostgreSQL tables in production. `POST /api/chat` checks quota before calling the model provider and increments usage only after a successful Hina response.

**Tech Stack:** Node test runner, Express, React/Vite/TypeScript, PostgreSQL migrations, existing `AppStore` memory/postgres pattern.

---

## File Structure

- Create `src/server/billing.ts`: shared billing types, env parsing, date helpers, summary formatting, quota policy.
- Create `src/server/billing.test.ts`: unit tests for defaults, free limits, Pro behavior, and reset dates.
- Create `src/server/api.billing.test.ts`: API tests for `/api/billing/me`, `/api/billing/checkout`, and `/api/chat` quota behavior.
- Create `migrations/002_billing_usage.sql`: entitlement and daily usage tables.
- Modify `src/server/store/types.ts`: add `BillingStore` and `BillingSummary` interfaces.
- Modify `src/server/store/memoryAppStore.ts`: add memory billing store.
- Modify `src/server/store/postgresAppStore.ts`: add PostgreSQL billing store.
- Modify `src/server/api.ts`: register billing routes and enforce quota before model calls.
- Modify `src/api/client.ts`: add billing API calls and carry quota metadata from chat errors.
- Modify `src/shared/types.ts`: add `BillingSummary`.
- Modify `src/App.tsx`: display billing state and handle `quota_exceeded` without pretending Hina replied.
- Modify `.env.example` and `.env.production.example`: document quota defaults.
- Update README/deploy docs only if verification reveals the env additions need operator guidance.

## Task 1: Billing Policy and Tests

**Files:**
- Create: `src/server/billing.test.ts`
- Create: `src/server/billing.ts`

- [ ] **Step 1: Write failing billing policy tests**

Create `src/server/billing.test.ts` with tests for default free limit `30`, unlimited Pro when `PRO_DAILY_CHAT_LIMIT=0`, date key/reset calculations, and quota allowed/blocked behavior.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test -- src/server/billing.test.ts`

Expected: FAIL because `src/server/billing.ts` does not exist.

- [ ] **Step 3: Implement minimal billing helpers**

Create `src/server/billing.ts` with:

- `BillingPlan = "free" | "pro"`
- `BillingSummary`
- `readBillingLimits(env)`
- `getUsageDate(now)`
- `getResetAt(now)`
- `buildBillingSummary(input)`
- `canUseChat(summary)`

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm run test -- src/server/billing.test.ts`

Expected: PASS.

## Task 2: Store Interfaces, Migration, and Store Implementations

**Files:**
- Modify: `src/server/store/types.ts`
- Modify: `src/server/store/memoryAppStore.ts`
- Modify: `src/server/store/postgresAppStore.ts`
- Create: `migrations/002_billing_usage.sql`
- Test: `src/server/billing.test.ts`

- [ ] **Step 1: Write failing memory store tests**

Extend `src/server/billing.test.ts` to create `createMemoryAppStore()`, assert default billing summary is free `0/30`, incrementing usage returns `1/30`, Pro bypasses limits, and a new date resets usage.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test -- src/server/billing.test.ts`

Expected: FAIL because `store.billing` is missing.

- [ ] **Step 3: Add store types and migration**

Add `BillingStore` to `src/server/store/types.ts` and create `migrations/002_billing_usage.sql` with `user_entitlements` and `usage_daily`.

- [ ] **Step 4: Implement memory billing store**

In `src/server/store/memoryAppStore.ts`, add `entitlements` and `usageDaily` maps and implement `getBillingSummary`, `incrementChatUsage`, and `setPlan`.

- [ ] **Step 5: Implement postgres billing store**

In `src/server/store/postgresAppStore.ts`, add SQL-backed billing methods using `insert ... on conflict` for usage increments and entitlement upserts.

- [ ] **Step 6: Run tests to verify GREEN**

Run: `npm run test -- src/server/billing.test.ts`

Expected: PASS.

## Task 3: Billing API and Chat Quota Enforcement

**Files:**
- Create: `src/server/api.billing.test.ts`
- Modify: `src/server/api.ts`

- [ ] **Step 1: Write failing API tests**

Create `src/server/api.billing.test.ts` with an Express app, memory store, fake auth returning one user for `Authorization: Bearer test-token`, fake provider counting calls, and permissive rate limiters. Test:

- `GET /api/billing/me` returns free plan and 30 limit.
- `POST /api/billing/checkout` returns HTTP 503 `billing_not_ready`.
- Free user with 30 existing uses gets HTTP 402 `quota_exceeded`.
- Quota failure does not call provider.
- Successful chat increments usage once.
- Provider failure does not increment usage.
- Pro user bypasses usage limit.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test -- src/server/api.billing.test.ts`

Expected: FAIL because billing routes and quota checks are missing.

- [ ] **Step 3: Add billing routes**

In `src/server/api.ts`, add `GET /api/billing/me` and `POST /api/billing/checkout` after auth routes.

- [ ] **Step 4: Enforce quota in `/api/chat`**

In `src/server/api.ts`, after auth/rate-limit but before `sanitizeChatMessages` and `provider.chat`, call `store.billing.getBillingSummary`. If `remainingToday === 0` for free users, return HTTP 402 with `{ error: "quota_exceeded", billing }`. After a successful provider response and message persistence, call `store.billing.incrementChatUsage`.

- [ ] **Step 5: Run tests to verify GREEN**

Run: `npm run test -- src/server/api.billing.test.ts`

Expected: PASS.

## Task 4: Frontend Billing State and Upgrade Copy

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/api/client.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add shared/client types**

Add `BillingSummary` to `src/shared/types.ts`. In `src/api/client.ts`, add `billingMe`, `billingCheckout`, and an `ApiError` class that preserves parsed JSON response data for `quota_exceeded`.

- [ ] **Step 2: Add App billing state**

In `src/App.tsx`, fetch billing state with messages/settings after login, refresh it after successful chat, and update `chatError` to special-case `quota_exceeded`.

- [ ] **Step 3: Add refined UI**

Add a compact quota pill above the composer, using existing Hina colors and restrained utility styling:

- Free: `Free - 12/30 chats today`
- Pro: `Pro - unlimited chats`
- Exhausted: `Free chats used today. Pro is coming soon.`

Keep the interface quiet and not payment-heavy.

- [ ] **Step 4: Type-check**

Run: `npm run lint`

Expected: PASS.

## Task 5: Env Docs, Full Verification, and Commit

**Files:**
- Modify: `.env.example`
- Modify: `.env.production.example`
- Optionally modify: `README.md`, `docs/production-single-ecs.md`

- [ ] **Step 1: Add env defaults**

Add `FREE_DAILY_CHAT_LIMIT="30"` and `PRO_DAILY_CHAT_LIMIT="0"` to both env example files.

- [ ] **Step 2: Run all verification**

Run:

- `npm run test`
- `npm run lint`
- `npm run build`

Expected: all exit 0.

- [ ] **Step 3: Commit implementation**

Run:

- `git status --short`
- `git add ...`
- `git commit -m "feat: add billing quota foundation"`

Expected: commit succeeds on `codex/billing-quota`.
