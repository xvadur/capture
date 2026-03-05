alter table if exists public.capture_entries
  add column if not exists unique_word_count integer not null default 0,
  add column if not exists lexical_richness_pct numeric(5,2) not null default 0,
  add column if not exists avg_word_length numeric(5,2) not null default 0,
  add column if not exists sentences_count integer not null default 0,
  add column if not exists paragraphs_count integer not null default 0;

create table if not exists public.capture_daily_metrics (
  day date primary key,
  total_words integer not null default 0,
  total_chars_no_spaces integer not null default 0,
  total_unique_words integer not null default 0,
  total_sentences integer not null default 0,
  total_paragraphs integer not null default 0,
  captures_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists capture_daily_metrics_updated_at_idx
  on public.capture_daily_metrics (updated_at desc);
