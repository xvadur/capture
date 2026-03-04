create extension if not exists "pgcrypto";

create table if not exists public.capture_entries (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  word_count integer not null default 0,
  char_count integer not null default 0,
  char_count_no_spaces integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists capture_entries_created_at_idx on public.capture_entries (created_at desc);
