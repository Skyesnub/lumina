-- =============================================================================
-- LUMEN RPG — SUPABASE SCHEMA (Phase 2)
--
-- Not required to use the app today — Phase 1 runs entirely on localStorage.
-- Run this in the Supabase SQL editor when you're ready to add real
-- accounts + cross-device sync (see js/database/supabase-client.js).
--
-- Pattern matches Lumen: every table is scoped to auth.uid() via row-level
-- security, with `on delete cascade` so deleting a user cleans up all of
-- their data automatically.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles — one row per user, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Adventurer',
  total_xp integer not null default 0,
  current_level integer not null default 1,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  theme_hue integer not null default 226,
  dark_mode boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are self-readable" on profiles
  for select using (auth.uid() = id);
create policy "profiles are self-updatable" on profiles
  for update using (auth.uid() = id);
create policy "profiles are self-insertable" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'Adventurer'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  category text not null default 'Other',
  difficulty text not null default 'medium'
    check (difficulty in ('very-easy','easy','medium','hard','very-hard')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high')),
  due_date date,
  estimated_minutes integer,
  status text not null default 'pending' check (status in ('pending','completed')),
  xp_reward integer not null default 35,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table tasks enable row level security;

create policy "tasks are owner-scoped select" on tasks
  for select using (auth.uid() = user_id);
create policy "tasks are owner-scoped insert" on tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks are owner-scoped update" on tasks
  for update using (auth.uid() = user_id);
create policy "tasks are owner-scoped delete" on tasks
  for delete using (auth.uid() = user_id);

create index if not exists tasks_user_id_idx on tasks(user_id);

-- ---------------------------------------------------------------------------
-- achievements — unlock records, one row per user per unlocked achievement
-- ---------------------------------------------------------------------------
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

alter table achievements enable row level security;

create policy "achievements are owner-scoped select" on achievements
  for select using (auth.uid() = user_id);
create policy "achievements are owner-scoped insert" on achievements
  for insert with check (auth.uid() = user_id);

create index if not exists achievements_user_id_idx on achievements(user_id);

-- ---------------------------------------------------------------------------
-- activity_history — append-only feed: XP gains, completions, level-ups
-- ---------------------------------------------------------------------------
create table if not exists activity_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('task_complete','xp_gain','level_up','streak_update','achievement_unlock')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table activity_history enable row level security;

create policy "activity is owner-scoped select" on activity_history
  for select using (auth.uid() = user_id);
create policy "activity is owner-scoped insert" on activity_history
  for insert with check (auth.uid() = user_id);

create index if not exists activity_history_user_id_idx on activity_history(user_id);
