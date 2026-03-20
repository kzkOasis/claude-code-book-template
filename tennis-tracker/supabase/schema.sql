-- ========================================
-- Tennis Tracker — Supabase Schema
-- Supabaseダッシュボード → SQL Editor で実行
-- ========================================

-- プロフィールテーブル
create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null default '',
  dominant_hand text not null default 'right' check (dominant_hand in ('right','left')),
  play_style    text not null default 'baseliner' check (play_style in ('baseliner','serve_volley','allcourt','aggressive')),
  racket        text,
  created_at    timestamptz not null default now()
);

-- 試合テーブル
create table if not exists matches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  opponent_name    text not null,
  match_date       date not null,
  tournament_name  text,
  match_type       text not null default 'practice' check (match_type in ('tournament','practice','league')),
  surface          text not null check (surface in ('omni','hard','clay','carpet','grass')),
  sets             jsonb not null default '[]',
  won              boolean not null,
  -- オプション統計
  aces             int,
  double_faults    int,
  unforced_errors  int,
  winners          int,
  notes            text,
  created_at       timestamptz not null default now()
);

-- RLS (Row Level Security) — 自分のデータのみアクセス可
alter table profiles enable row level security;
alter table matches  enable row level security;

create policy "profiles: own" on profiles
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "matches: own" on matches
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 新規ユーザー登録時に自動でプロフィール作成
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- インデックス
create index if not exists matches_user_date on matches (user_id, match_date desc);
create index if not exists matches_surface    on matches (user_id, surface);
create index if not exists matches_opponent   on matches (user_id, opponent_name);
