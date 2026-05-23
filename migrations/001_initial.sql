CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  raw_notes         TEXT NOT NULL,
  filename          TEXT NOT NULL,
  hook              TEXT,
  body_sections     JSONB,
  best_for          TEXT[],
  not_for           TEXT[],
  ethics_notes      TEXT,
  key_facts         JSONB,
  sources           JSONB,
  confidence        JSONB,
  llm_model         TEXT,
  llm_raw_response  TEXT,
  generation_error  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
