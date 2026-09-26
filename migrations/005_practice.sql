create table if not exists practice_attempts (
  user_id text not null references users(id) on delete cascade,
  skill text not null check (skill in ('listening', 'reading', 'writing', 'speaking')),
  attempt_id text not null,
  created_at timestamptz not null,
  record jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill, attempt_id)
);

create index if not exists practice_attempts_user_created_at_idx
  on practice_attempts (user_id, created_at desc);
