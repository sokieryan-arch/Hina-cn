export type VerificationPurpose = "register" | "reset_password";
export type IdentifierKind = "email" | "phone";

export interface ParsedIdentifier {
  kind: IdentifierKind;
  value: string;
}

export interface UserRecord {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  passwordHash?: string | null;
  phoneVerifiedAt?: Date | null;
  emailVerifiedAt?: Date | null;
  hasWeChat?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  hasPassword: boolean;
  hasWeChat: boolean;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface VerificationRecord {
  target: string;
  purpose: VerificationPurpose;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateUserInput {
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  passwordHash?: string | null;
  phoneVerifiedAt?: Date | null;
  emailVerifiedAt?: Date | null;
}

export interface UserStore {
  findById(id: string): Promise<UserRecord | null>;
  findByIdentifier(identifier: ParsedIdentifier): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  updateProfile(userId: string, patch: { displayName?: string; avatarUrl?: string | null }): Promise<UserRecord>;
  findByExternalIdentity(provider: string, providerUserId: string): Promise<UserRecord | null>;
  linkExternalIdentity(input: {
    userId: string;
    provider: string;
    providerUserId: string;
    unionId?: string | null;
    rawProfile?: unknown;
  }): Promise<void>;
}

export interface VerificationStore {
  save(record: VerificationRecord): Promise<void>;
  consume(target: string, purpose: VerificationPurpose): Promise<VerificationRecord | null>;
}

export interface SessionStore {
  create(userId: string, expiresAt: Date): Promise<SessionRecord>;
  find(token: string): Promise<SessionRecord | null>;
  delete(token: string): Promise<void>;
}

export interface AuthStores {
  users: UserStore;
  verifications: VerificationStore;
  sessions: SessionStore;
}
