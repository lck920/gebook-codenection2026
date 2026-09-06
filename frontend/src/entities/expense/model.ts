import type { StopCategory } from "@/entities/stop";

export interface Expense {
  id: string;
  description: string;
  payer: string;
  amount: number;
  /** ISO currency code for `amount`. Empty string means "use the trip currency". */
  currency: string;
  /** Expense type, reusing the shared stop categories. Defaults to "Plan". */
  category: StopCategory;
  participants: string[];
  whenLabel: string;
}

/** A planned cost with no itinerary stop behind it: flights, a hotel, a pass.
 * Stop costs stay on the stop; planned spend is the sum of both. */
export interface BudgetItem {
  id: string;
  label: string;
  category: StopCategory;
  amount: number;
  /** ISO currency code; empty string means "use the trip currency". */
  currency: string;
  /** Trip member who added it. */
  createdBy: string;
}

/** One traveller's commitment to the shared budget pool (planning phase). */
export interface BudgetContribution {
  memberId: string;
  amount: number;
  /** ISO currency code; empty string means "use the trip currency". */
  currency: string;
}

export interface Balance {
  memberId: string;
  paid: number;
  share: number;
  net: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface Budget {
  total: number;
  perPerson: number;
  balances: Balance[];
  settlements: Settlement[];
}
