create table if not exists hina_moments (
  id text primary key,
  body text not null,
  occasion text,
  published_at timestamptz not null default now(),
  next_due_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists hina_moments_published_at_idx
  on hina_moments (published_at desc);

create table if not exists study_notes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  category text not null check (category in ('grammar', 'vocabulary', 'expression', 'culture')),
  title text not null,
  body text not null,
  example text,
  original text,
  suggestion text,
  source_message_id text references messages(id) on delete set null,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists study_notes_user_created_at_idx
  on study_notes (user_id, created_at desc);

create table if not exists wishlist_items (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null check (kind in ('goal', 'hook', 'place', 'note')),
  title text not null,
  details text,
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wishlist_items_user_created_at_idx
  on wishlist_items (user_id, created_at desc);

create table if not exists time_capsules (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists time_capsules_user_unlock_at_idx
  on time_capsules (user_id, unlock_at asc);
