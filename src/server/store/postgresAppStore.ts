import { nanoid } from "nanoid";
import pg from "pg";
import { buildBillingSummary, getUsageDate } from "../billing.js";
import { normalizeProactiveSettings } from "../proactive.js";
import type { ParsedIdentifier, UserRecord } from "../auth/types.js";
import type {
  AppStore,
  CreateMessageInput,
  HinaMomentRecord,
  MessageRecord,
  ProactiveSettingsRecord,
  StudyNoteRecord,
  TimeCapsuleRecord,
  WishlistItemRecord,
} from "./types.js";

const { Pool } = pg;

function rowToUser(row: any): UserRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    email: row.email,
    passwordHash: row.password_hash,
    phoneVerifiedAt: row.phone_verified_at,
    emailVerifiedAt: row.email_verified_at,
    hasWeChat: row.has_wechat === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: any): MessageRecord {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    text: row.text,
    type: row.type,
    tipKind: row.tip_kind,
    createdAt: row.created_at,
  };
}

function rowToMoment(row: any): HinaMomentRecord {
  return {
    id: row.id,
    body: row.body,
    occasion: row.occasion,
    publishedAt: row.published_at,
    nextDueAt: row.next_due_at,
  };
}

function rowToNote(row: any): StudyNoteRecord {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    title: row.title,
    body: row.body,
    example: row.example,
    original: row.original,
    suggestion: row.suggestion,
    sourceMessageId: row.source_message_id,
    dedupeKey: row.dedupe_key,
    createdAt: row.created_at,
  };
}

function rowToWishlist(row: any): WishlistItemRecord {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    details: row.details,
    targetDate: row.target_date ? String(row.target_date).slice(0, 10) : null,
    progress: row.progress,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCapsule(row: any): TimeCapsuleRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    unlockAt: row.unlock_at,
    openedAt: row.opened_at,
    createdAt: row.created_at,
  };
}

export function createPostgresAppStore(databaseUrl: string): AppStore {
  const pool = new Pool({ connectionString: databaseUrl });

  async function getBillingSummary(userId: string, now = new Date()) {
    const usageDate = getUsageDate(now);
    const [entitlementResult, usageResult] = await Promise.all([
      pool.query("select * from user_entitlements where user_id = $1", [userId]),
      pool.query("select chat_count from usage_daily where user_id = $1 and usage_date = $2", [userId, usageDate]),
    ]);
    const entitlement = entitlementResult.rows[0];
    return buildBillingSummary({
      plan: entitlement?.plan ?? "free",
      proExpiresAt: entitlement?.pro_expires_at ?? null,
      chatCount: usageResult.rows[0]?.chat_count ?? 0,
      now,
    });
  }

  async function getProactiveSettings(userId: string): Promise<ProactiveSettingsRecord> {
    const result = await pool.query("select * from proactive_settings where user_id = $1", [userId]);
    if (!result.rows[0]) {
      const settings = normalizeProactiveSettings({});
      await pool.query(
        `insert into proactive_settings (
          user_id, enabled, min_hours_between_nudges, quiet_hours_start, quiet_hours_end, favorite_topics
        ) values ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          settings.enabled,
          settings.minHoursBetweenNudges,
          settings.quietHoursStart,
          settings.quietHoursEnd,
          settings.favoriteTopics,
        ],
      );
      return getProactiveSettings(userId);
    }

    const row = result.rows[0];
    return {
      enabled: row.enabled,
      minHoursBetweenNudges: row.min_hours_between_nudges,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      favoriteTopics: row.favorite_topics ?? [],
      lastNudgeAt: row.last_nudge_at,
    };
  }

  return {
    auth: {
      users: {
        async findById(id) {
          const result = await pool.query(
            `select u.*, exists(
              select 1 from external_identities e where e.user_id = u.id and e.provider = 'wechat'
            ) as has_wechat from users u where u.id = $1`,
            [id],
          );
          return result.rows[0] ? rowToUser(result.rows[0]) : null;
        },
        async findByIdentifier(identifier: ParsedIdentifier) {
          const column = identifier.kind === "email" ? "email" : "phone";
          const result = await pool.query(
            `select u.*, exists(
              select 1 from external_identities e where e.user_id = u.id and e.provider = 'wechat'
            ) as has_wechat from users u where ${column} = $1`,
            [identifier.value],
          );
          return result.rows[0] ? rowToUser(result.rows[0]) : null;
        },
        async create(input) {
          const result = await pool.query(
            `insert into users (
              id, display_name, avatar_url, phone, email, password_hash,
              phone_verified_at, email_verified_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning *, false as has_wechat`,
            [
              nanoid(),
              input.displayName,
              input.avatarUrl ?? null,
              input.phone ?? null,
              input.email ?? null,
              input.passwordHash ?? null,
              input.phoneVerifiedAt ?? null,
              input.emailVerifiedAt ?? null,
            ],
          );
          return rowToUser(result.rows[0]);
        },
        async updatePassword(userId, passwordHash) {
          await pool.query(
            "update users set password_hash = $2, updated_at = now() where id = $1",
            [userId, passwordHash],
          );
        },
        async updateProfile(userId, patch) {
          const hasAvatarPatch = Object.prototype.hasOwnProperty.call(patch, "avatarUrl");
          const result = await pool.query(
            `update users
             set display_name = coalesce($2, display_name),
                 avatar_url = case when $3 then $4 else avatar_url end,
                 updated_at = now()
             where id = $1
             returning *, exists(
               select 1 from external_identities e where e.user_id = users.id and e.provider = 'wechat'
             ) as has_wechat`,
            [userId, patch.displayName ?? null, hasAvatarPatch, patch.avatarUrl ?? null],
          );
          return rowToUser(result.rows[0]);
        },
        async findByExternalIdentity(provider, providerUserId) {
          const result = await pool.query(
            `select u.*, true as has_wechat
             from users u
             join external_identities e on e.user_id = u.id
             where e.provider = $1 and e.provider_user_id = $2`,
            [provider, providerUserId],
          );
          return result.rows[0] ? rowToUser(result.rows[0]) : null;
        },
        async linkExternalIdentity(input) {
          await pool.query(
            `insert into external_identities (id, user_id, provider, provider_user_id, union_id, raw_profile)
             values ($1, $2, $3, $4, $5, $6)
             on conflict (provider, provider_user_id)
             do update set union_id = excluded.union_id, raw_profile = excluded.raw_profile`,
            [
              nanoid(),
              input.userId,
              input.provider,
              input.providerUserId,
              input.unionId ?? null,
              JSON.stringify(input.rawProfile ?? {}),
            ],
          );
        },
      },
      verifications: {
        async save(record) {
          await pool.query(
            `create table if not exists verification_codes (
              target text not null,
              purpose text not null,
              code text not null,
              expires_at timestamptz not null,
              created_at timestamptz not null,
              primary key (target, purpose)
            )`,
          );
          await pool.query(
            `insert into verification_codes (target, purpose, code, expires_at, created_at)
             values ($1, $2, $3, $4, $5)
             on conflict (target, purpose)
             do update set code = excluded.code, expires_at = excluded.expires_at, created_at = excluded.created_at`,
            [record.target, record.purpose, record.code, record.expiresAt, record.createdAt],
          );
        },
        async consume(target, purpose) {
          await pool.query(
            `create table if not exists verification_codes (
              target text not null,
              purpose text not null,
              code text not null,
              expires_at timestamptz not null,
              created_at timestamptz not null,
              primary key (target, purpose)
            )`,
          );
          const result = await pool.query(
            "delete from verification_codes where target = $1 and purpose = $2 returning *",
            [target, purpose],
          );
          const row = result.rows[0];
          return row
            ? {
              target: row.target,
              purpose: row.purpose,
              code: row.code,
              expiresAt: row.expires_at,
              createdAt: row.created_at,
            }
            : null;
        },
      },
      sessions: {
        async create(userId, expiresAt) {
          const token = nanoid(40);
          const result = await pool.query(
            `insert into sessions (id, user_id, expires_at) values ($1, $2, $3) returning *`,
            [token, userId, expiresAt],
          );
          return {
            token: result.rows[0].id,
            userId: result.rows[0].user_id,
            expiresAt: result.rows[0].expires_at,
            createdAt: result.rows[0].created_at,
          };
        },
        async find(token) {
          const result = await pool.query("select * from sessions where id = $1 and expires_at > now()", [token]);
          const row = result.rows[0];
          return row
            ? {
              token: row.id,
              userId: row.user_id,
              expiresAt: row.expires_at,
              createdAt: row.created_at,
            }
            : null;
        },
        async delete(token) {
          await pool.query("delete from sessions where id = $1", [token]);
        },
      },
    },
    messages: {
      async listMessages(userId) {
        const result = await pool.query("select * from messages where user_id = $1 order by created_at asc", [userId]);
        return result.rows.map(rowToMessage);
      },
      async addMessage(input: CreateMessageInput) {
        const result = await pool.query(
          `insert into messages (id, user_id, role, text, type, tip_kind)
           values ($1, $2, $3, $4, $5, $6)
           returning *`,
          [
            input.id ?? nanoid(),
            input.userId,
            input.role,
            input.text,
            input.type ?? "response",
            input.tipKind ?? null,
          ],
        );
        return rowToMessage(result.rows[0]);
      },
      async clearMessages(userId) {
        await pool.query("delete from messages where user_id = $1", [userId]);
      },
    },
    proactive: {
      getProactiveSettings,
      async saveProactiveSettings(userId, settings) {
        const normalized = normalizeProactiveSettings(settings);
        const result = await pool.query(
          `insert into proactive_settings (
            user_id, enabled, min_hours_between_nudges, quiet_hours_start, quiet_hours_end, favorite_topics
          ) values ($1, $2, $3, $4, $5, $6)
          on conflict (user_id) do update set
            enabled = excluded.enabled,
            min_hours_between_nudges = excluded.min_hours_between_nudges,
            quiet_hours_start = excluded.quiet_hours_start,
            quiet_hours_end = excluded.quiet_hours_end,
            favorite_topics = excluded.favorite_topics,
            updated_at = now()
          returning *`,
          [
            userId,
            normalized.enabled,
            normalized.minHoursBetweenNudges,
            normalized.quietHoursStart,
            normalized.quietHoursEnd,
            normalized.favoriteTopics,
          ],
        );
        const row = result.rows[0];
        return {
          enabled: row.enabled,
          minHoursBetweenNudges: row.min_hours_between_nudges,
          quietHoursStart: row.quiet_hours_start,
          quietHoursEnd: row.quiet_hours_end,
          favoriteTopics: row.favorite_topics ?? [],
          lastNudgeAt: row.last_nudge_at,
        };
      },
      async markProactiveNudge(userId, at) {
        await pool.query(
          `update proactive_settings set last_nudge_at = $2, updated_at = now() where user_id = $1`,
          [userId, at],
        );
      },
    },
    billing: {
      getBillingSummary,
      async incrementChatUsage(userId, now = new Date()) {
        await pool.query(
          `insert into usage_daily (user_id, usage_date, chat_count)
           values ($1, $2, 1)
           on conflict (user_id, usage_date)
           do update set chat_count = usage_daily.chat_count + 1, updated_at = now()`,
          [userId, getUsageDate(now)],
        );
        return getBillingSummary(userId, now);
      },
      async setPlan(userId, plan, proExpiresAt = null, now = new Date()) {
        await pool.query(
          `insert into user_entitlements (user_id, plan, pro_expires_at)
           values ($1, $2, $3)
           on conflict (user_id)
           do update set plan = excluded.plan, pro_expires_at = excluded.pro_expires_at, updated_at = now()`,
          [userId, plan, proExpiresAt],
        );
        return getBillingSummary(userId, now);
      },
    },
    space: {
      async listMoments(limit = 40) {
        const result = await pool.query(
          "select * from hina_moments order by published_at desc limit $1",
          [Math.min(100, Math.max(1, limit))],
        );
        return result.rows.map(rowToMoment);
      },
      async latestMoment() {
        const result = await pool.query("select * from hina_moments order by published_at desc limit 1");
        return result.rows[0] ? rowToMoment(result.rows[0]) : null;
      },
      async addMomentIfDue(input) {
        const client = await pool.connect();
        try {
          await client.query("begin");
          await client.query("select pg_advisory_xact_lock(hashtext('hina_moments_generation'))");
          const latest = await client.query("select next_due_at from hina_moments order by published_at desc limit 1");
          if (latest.rows[0]?.next_due_at && new Date(latest.rows[0].next_due_at).getTime() > input.now.getTime()) {
            await client.query("rollback");
            return null;
          }
          const result = await client.query(
            `insert into hina_moments (id, body, occasion, published_at, next_due_at)
             values ($1, $2, $3, $4, $5) returning *`,
            [nanoid(), input.body, input.occasion ?? null, input.now, input.nextDueAt],
          );
          await client.query("commit");
          return rowToMoment(result.rows[0]);
        } catch (error) {
          await client.query("rollback").catch(() => undefined);
          throw error;
        } finally {
          client.release();
        }
      },
      async listNotes(userId, category) {
        const result = category
          ? await pool.query("select * from study_notes where user_id = $1 and category = $2 order by created_at desc", [userId, category])
          : await pool.query("select * from study_notes where user_id = $1 order by created_at desc", [userId]);
        return result.rows.map(rowToNote);
      },
      async saveNote(input) {
        const result = await pool.query(
          `insert into study_notes (
             id, user_id, category, title, body, example, original, suggestion, source_message_id, dedupe_key
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           on conflict (user_id, dedupe_key) do nothing returning *`,
          [
            nanoid(), input.userId, input.category, input.title, input.body, input.example ?? null,
            input.original ?? null, input.suggestion ?? null, input.sourceMessageId ?? null, input.dedupeKey,
          ],
        );
        return result.rows[0] ? rowToNote(result.rows[0]) : null;
      },
      async deleteNote(userId, noteId) {
        const result = await pool.query("delete from study_notes where id = $1 and user_id = $2", [noteId, userId]);
        return (result.rowCount ?? 0) > 0;
      },
      async clearNotes(userId) {
        await pool.query("delete from study_notes where user_id = $1", [userId]);
      },
      async listWishlist(userId) {
        const result = await pool.query("select * from wishlist_items where user_id = $1 order by created_at desc", [userId]);
        return result.rows.map(rowToWishlist);
      },
      async createWishlist(input) {
        const result = await pool.query(
          `insert into wishlist_items (id, user_id, kind, title, details, target_date, progress, completed)
           values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
          [nanoid(), input.userId, input.kind, input.title, input.details ?? null, input.targetDate ?? null, input.progress, input.completed],
        );
        return rowToWishlist(result.rows[0]);
      },
      async updateWishlist(userId, itemId, patch) {
        const hasDetails = Object.prototype.hasOwnProperty.call(patch, "details");
        const hasTargetDate = Object.prototype.hasOwnProperty.call(patch, "targetDate");
        const result = await pool.query(
          `update wishlist_items set
             kind = coalesce($3, kind),
             title = coalesce($4, title),
             details = case when $5 then $6 else details end,
             target_date = case when $7 then $8::date else target_date end,
             progress = coalesce($9, progress),
             completed = coalesce($10, completed),
             updated_at = now()
           where id = $1 and user_id = $2 returning *`,
          [
            itemId, userId, patch.kind ?? null, patch.title ?? null, hasDetails, patch.details ?? null,
            hasTargetDate, patch.targetDate ?? null, patch.progress ?? null, patch.completed ?? null,
          ],
        );
        return result.rows[0] ? rowToWishlist(result.rows[0]) : null;
      },
      async deleteWishlist(userId, itemId) {
        const result = await pool.query("delete from wishlist_items where id = $1 and user_id = $2", [itemId, userId]);
        return (result.rowCount ?? 0) > 0;
      },
      async listCapsules(userId) {
        const result = await pool.query("select * from time_capsules where user_id = $1 order by unlock_at asc", [userId]);
        return result.rows.map(rowToCapsule);
      },
      async createCapsule(input) {
        const result = await pool.query(
          `insert into time_capsules (id, user_id, title, body, unlock_at)
           values ($1, $2, $3, $4, $5) returning *`,
          [nanoid(), input.userId, input.title, input.body, input.unlockAt],
        );
        return rowToCapsule(result.rows[0]);
      },
      async openCapsule(userId, capsuleId, now) {
        const result = await pool.query(
          `update time_capsules set opened_at = coalesce(opened_at, $3)
           where id = $1 and user_id = $2 and unlock_at <= $3 returning *`,
          [capsuleId, userId, now],
        );
        return result.rows[0] ? rowToCapsule(result.rows[0]) : null;
      },
      async getRelationshipCounts(userId) {
        const [messagesResult, datesResult, notesResult, goalsResult] = await Promise.all([
          pool.query("select count(*)::int as count from messages where user_id = $1 and type <> 'tip'", [userId]),
          pool.query(
            `select distinct to_char(created_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD') as day
             from messages where user_id = $1 and role = 'user' and type = 'response' order by day`,
            [userId],
          ),
          pool.query("select count(*)::int as count from study_notes where user_id = $1", [userId]),
          pool.query("select count(*)::int as count from wishlist_items where user_id = $1 and completed = true", [userId]),
        ]);
        return {
          messageCount: messagesResult.rows[0]?.count ?? 0,
          conversationDates: datesResult.rows.map((row) => row.day),
          notesCount: notesResult.rows[0]?.count ?? 0,
          completedGoals: goalsResult.rows[0]?.count ?? 0,
        };
      },
    },
  };
}
