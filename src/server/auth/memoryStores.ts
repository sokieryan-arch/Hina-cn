import { nanoid } from "nanoid";
import type {
  AuthStores,
  CreateUserInput,
  ParsedIdentifier,
  SessionRecord,
  UserRecord,
  VerificationPurpose,
  VerificationRecord,
} from "./types.js";

export function createMemoryAuthStores(): AuthStores {
  const users = new Map<string, UserRecord>();
  const external = new Map<string, string>();
  const verifications = new Map<string, VerificationRecord>();
  const sessions = new Map<string, SessionRecord>();

  const verificationKey = (target: string, purpose: VerificationPurpose) => `${purpose}:${target}`;

  return {
    users: {
      async findById(id) {
        return users.get(id) ?? null;
      },
      async findByIdentifier(identifier: ParsedIdentifier) {
        for (const user of users.values()) {
          if (identifier.kind === "email" && user.email === identifier.value) return user;
          if (identifier.kind === "phone" && user.phone === identifier.value) return user;
        }
        return null;
      },
      async create(input: CreateUserInput) {
        for (const user of users.values()) {
          if (input.email && user.email === input.email) throw new Error("already_registered");
          if (input.phone && user.phone === input.phone) throw new Error("already_registered");
        }

        const now = new Date();
        const user: UserRecord = {
          id: nanoid(),
          displayName: input.displayName,
          avatarUrl: input.avatarUrl ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          passwordHash: input.passwordHash ?? null,
          phoneVerifiedAt: input.phoneVerifiedAt ?? null,
          emailVerifiedAt: input.emailVerifiedAt ?? null,
          hasWeChat: false,
          createdAt: now,
          updatedAt: now,
        };
        users.set(user.id, user);
        return user;
      },
      async delete(userId) {
        users.delete(userId);
        for (const [key, linkedUserId] of external.entries()) {
          if (linkedUserId === userId) external.delete(key);
        }
        for (const [token, session] of sessions.entries()) {
          if (session.userId === userId) sessions.delete(token);
        }
      },
      async updatePassword(userId, passwordHash) {
        const user = users.get(userId);
        if (!user) throw new Error("user_not_found");
        user.passwordHash = passwordHash;
        user.updatedAt = new Date();
      },
      async updateProfile(userId, patch) {
        const user = users.get(userId);
        if (!user) throw new Error("user_not_found");
        if (typeof patch.displayName === "string") user.displayName = patch.displayName.trim() || user.displayName;
        if ("avatarUrl" in patch) user.avatarUrl = patch.avatarUrl;
        user.updatedAt = new Date();
        return user;
      },
      async findByExternalIdentity(provider, providerUserId) {
        const userId = external.get(`${provider}:${providerUserId}`);
        return userId ? users.get(userId) ?? null : null;
      },
      async findExternalIdentityByUser(userId, provider) {
        const prefix = `${provider}:`;
        for (const [key, linkedUserId] of external.entries()) {
          if (linkedUserId === userId && key.startsWith(prefix)) {
            return { providerUserId: key.slice(prefix.length), unionId: null };
          }
        }
        return null;
      },
      async reassignExternalIdentities(sourceUserId, targetUserId) {
        for (const [key, linkedUserId] of external.entries()) {
          if (linkedUserId === sourceUserId) external.set(key, targetUserId);
        }
        const target = users.get(targetUserId);
        if (target) {
          target.hasWeChat = Array.from(external.entries()).some(
            ([key, userId]) => userId === targetUserId && (key.startsWith("wechat:") || key.startsWith("wechat_mini:")),
          );
        }
      },
      async linkExternalIdentity(input) {
        const user = users.get(input.userId);
        if (!user) throw new Error("user_not_found");
        external.set(`${input.provider}:${input.providerUserId}`, input.userId);
        user.hasWeChat = input.provider === "wechat" || input.provider === "wechat_mini" || user.hasWeChat;
      },
    },
    verifications: {
      async save(record) {
        verifications.set(verificationKey(record.target, record.purpose), record);
      },
      async consume(target, purpose) {
        const key = verificationKey(target, purpose);
        const record = verifications.get(key) ?? null;
        verifications.delete(key);
        return record;
      },
    },
    sessions: {
      async create(userId, expiresAt) {
        const session: SessionRecord = {
          token: nanoid(40),
          userId,
          expiresAt,
          createdAt: new Date(),
        };
        sessions.set(session.token, session);
        return session;
      },
      async find(token) {
        const session = sessions.get(token) ?? null;
        if (session && session.expiresAt.getTime() <= Date.now()) {
          sessions.delete(token);
          return null;
        }
        return session;
      },
      async delete(token) {
        sessions.delete(token);
      },
    },
  };
}
