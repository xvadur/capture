CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE pipeline_stage AS ENUM (
    'lead_opened',
    'fit_confirmed',
    'pilot_proposed',
    'pilot_active',
    'retained'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE conversation_status AS ENUM ('active', 'awaiting_reply', 'done');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE followup_status AS ENUM ('pending', 'completed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE followup_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE pilot_status AS ENUM ('proposed', 'active', 'retained', 'completed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS offers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  vertical          text,
  description       text,
  roi_note          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         text NOT NULL,
  company_name      text,
  email             text,
  phone             text,
  source            text,
  stage             pipeline_stage NOT NULL DEFAULT 'lead_opened',
  estimated_value   numeric(12,2) NOT NULL DEFAULT 0,
  notes             text,
  offer_id          uuid REFERENCES offers(id) ON DELETE SET NULL,
  last_contacted_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel           text DEFAULT 'email',
  direction         text NOT NULL DEFAULT 'outbound',
  stage             pipeline_stage NOT NULL DEFAULT 'lead_opened',
  status            conversation_status NOT NULL DEFAULT 'active',
  summary           text,
  next_step         text,
  reminder_at       timestamptz,
  replied           boolean NOT NULL DEFAULT false,
  call_booked       boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pilots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  offer_id          uuid REFERENCES offers(id) ON DELETE SET NULL,
  status            pilot_status NOT NULL DEFAULT 'proposed',
  scope             text,
  value             numeric(12,2) NOT NULL DEFAULT 0,
  started_at        timestamptz,
  ended_at          timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS followups (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  conversation_id   uuid REFERENCES conversations(id) ON DELETE SET NULL,
  title             text NOT NULL,
  due_at            timestamptz NOT NULL,
  status            followup_status NOT NULL DEFAULT 'pending',
  priority          followup_priority NOT NULL DEFAULT 'medium',
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_evidence (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date          date NOT NULL DEFAULT current_date,
  hard_lesson       text NOT NULL,
  metric_name       text,
  metric_value      text,
  artifact_link     text,
  artifact_text     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_lead_id_idx ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_stage_idx ON conversations(stage);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations(status);
CREATE INDEX IF NOT EXISTS pilots_status_idx ON pilots(status);
CREATE INDEX IF NOT EXISTS followups_due_at_idx ON followups(due_at);
CREATE INDEX IF NOT EXISTS followups_status_idx ON followups(status);
CREATE INDEX IF NOT EXISTS daily_evidence_log_date_idx ON daily_evidence(log_date DESC);

CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS conversations_set_updated_at ON conversations;
CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS pilots_set_updated_at ON pilots;
CREATE TRIGGER pilots_set_updated_at
BEFORE UPDATE ON pilots
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS followups_set_updated_at ON followups;
CREATE TRIGGER followups_set_updated_at
BEFORE UPDATE ON followups
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();
