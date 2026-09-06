-- Budget pool: what each traveller commits to the shared trip budget during
-- planning. Kept separate from `expenses` (money actually spent on the trip) so
-- the planning and on-trip phases can be reported independently.
-- CreateTable
CREATE TABLE "public"."trip_budget_contributions" (
    "trip_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_budget_contributions_pkey" PRIMARY KEY ("trip_id","member_id")
);

-- CreateIndex
CREATE INDEX "trip_budget_contributions_trip_idx" ON "public"."trip_budget_contributions"("trip_id");

-- AddForeignKey
ALTER TABLE "public"."trip_budget_contributions" ADD CONSTRAINT "trip_budget_contributions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trip_budget_contributions" ADD CONSTRAINT "trip_budget_contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."trip_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
