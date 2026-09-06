-- Standalone budget lines: planned costs that do not belong to an itinerary
-- stop — flights, hotels, rail passes, travel insurance. Stop costs stay on
-- `stops.cost`; planned spend is the sum of both.
-- CreateTable
CREATE TABLE "public"."trip_budget_items" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Plan',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_budget_items_trip_idx" ON "public"."trip_budget_items"("trip_id");

-- AddForeignKey
ALTER TABLE "public"."trip_budget_items" ADD CONSTRAINT "trip_budget_items_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
