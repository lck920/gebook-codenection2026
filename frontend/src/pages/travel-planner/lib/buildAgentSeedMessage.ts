import type { TFunction } from "i18next";
import type { TripIntake } from "@/entities/trip";

/** Build the one-shot suggested @agent draft from wizard intake. Returns null when
 * there is nothing useful to ask (all fields TBD / empty intake). */
export function buildAgentSeedMessage(
  t: TFunction<"agent">,
  intake: TripIntake | null | undefined,
): string | null {
  if (!intake) return null;

  const parts: string[] = [];
  if (intake.destination) {
    parts.push(
      t("seed.part.destination", { destination: intake.destination }),
    );
  }
  if (intake.dayCount != null) {
    parts.push(t("seed.part.days", { count: intake.dayCount }));
  }
  if (intake.startDate && intake.endDate) {
    parts.push(
      t("seed.part.dates", { start: intake.startDate, end: intake.endDate }),
    );
  } else if (intake.startDate) {
    parts.push(t("seed.part.start", { start: intake.startDate }));
  }
  if (intake.budgetAmount != null) {
    const currency = intake.budgetCurrency?.trim();
    parts.push(
      currency
        ? t("seed.part.budgetWithCurrency", {
            amount: intake.budgetAmount,
            currency,
          })
        : t("seed.part.budget", { amount: intake.budgetAmount }),
    );
  }
  if (intake.partySize != null) {
    parts.push(t("seed.part.party", { count: intake.partySize }));
  }

  if (parts.length === 0) return null;
  return t("seed.message", { details: parts.join(t("seed.joiner")) });
}

/**
 * The "Plan with AI" draft for a trip with no stops yet.
 *
 * Unlike the wizard seed this never returns null: the button only exists on a
 * real trip, and the title alone is enough for the agent to start from.
 */
export function buildPlanTripMessage(
  t: TFunction<"agent">,
  trip: {
    title: string;
    startDate: string;
    days: unknown[];
    intake: TripIntake | null;
  },
): string {
  const destination = trip.intake?.destination?.trim() || trip.title.trim();
  return t("seed.planTrip", {
    destination,
    count: trip.days.length,
    start: trip.startDate || undefined,
  });
}
