CREATE TABLE IF NOT EXISTS prompts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text              text NOT NULL,
  word_count        int NOT NULL DEFAULT 0,
  char_count        int NOT NULL DEFAULT 0,
  avg_word_length   float NOT NULL DEFAULT 0,
  base_xp           int NOT NULL DEFAULT 0,
  length_bonus      int NOT NULL DEFAULT 0,
  speed_multiplier  float NOT NULL DEFAULT 1.0,
  total_xp          int NOT NULL DEFAULT 0,
  cpm               float NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date            date PRIMARY KEY,
  total_words     int NOT NULL DEFAULT 0,
  total_prompts   int NOT NULL DEFAULT 0,
  total_xp        int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS prompts_created_at_idx ON prompts(created_at);
CREATE INDEX IF NOT EXISTS daily_stats_date_idx ON daily_stats(date DESC);
