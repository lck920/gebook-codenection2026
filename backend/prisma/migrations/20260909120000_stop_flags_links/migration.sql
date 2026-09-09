-- Per-stop status flags and saved links.
-- `links` holds a JSON array of {label,url} as text, so the postgres and mysql
-- drivers round-trip it the same way.
ALTER TABLE "stops" ADD COLUMN "must_see" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stops" ADD COLUMN "done" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stops" ADD COLUMN "links" TEXT NOT NULL DEFAULT '[]';
