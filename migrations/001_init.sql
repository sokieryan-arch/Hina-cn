create table if not exists users (
  id text primary key,
  display_name text not null,
  avatar_url text,
  phone text unique,
  email text unique,
  password_hash text,
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists external_identities (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  union_id text,
  raw_profile jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_user_id)
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  text text not null,
  type text not null default 'response',
  tip_kind text,
  created_at timestamptz not null default now()
);

create table if not exists proactive_settings (
  user_id text primary key references users(id) on delete cascade,
  enabled boolean not null default false,
  min_hours_between_nudges integer not null default 20,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '08:00',
  favorite_topics text[] not null default '{}',
  last_nudge_at timestamptz,
  updated_at timestamptz not null default now()
);
