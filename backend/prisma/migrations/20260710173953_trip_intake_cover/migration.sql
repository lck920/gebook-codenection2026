-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "agent_seed_pending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cover_url" TEXT,
ADD COLUMN     "intake" JSONB;
