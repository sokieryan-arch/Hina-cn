create table if not exists user_safety_profiles (
  user_id text primary key references users(id) on delete cascade,
  birth_date date not null,
  adult_confirmed boolean not null default false,
  privacy_version text not null,
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feedback_reports (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  category text not null check (category in ('bug', 'safety', 'privacy', 'other')),
  message text not null,
  contact text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_reports_user_created_at_idx
  on feedback_reports (user_id, created_at desc);
