create table if not exists user_entitlements (
  user_id text primary key references users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  pro_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists usage_daily (
  user_id text not null references users(id) on delete cascade,
  usage_date date not null,
  chat_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
