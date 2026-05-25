-- Add CHECK constraint on status column
ALTER TABLE articles
  ADD CONSTRAINT chk_articles_status
  CHECK (status IN ('draft', 'generating', 'error', 'published'));

-- Add auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index on updated_at for conflict-check queries
CREATE INDEX idx_articles_updated_at ON articles(updated_at DESC);
