-- Add the optional stop note (Markdown, may embed image URLs) to existing
-- databases. Idempotent so it is safe to re-run.

ALTER TABLE stops ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
