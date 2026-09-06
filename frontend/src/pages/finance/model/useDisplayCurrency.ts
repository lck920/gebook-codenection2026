import { useCallback, useMemo } from "react";
import { useSession } from "@/shared/auth";
import { useFxRates } from "@/features/fx-rates";
import { convertMinorAmount, formatMoney } from "@/shared/lib";

/**
 * The currency this traveller reads the trip in.
 *
 * Amounts stay stored in whatever currency they were entered in — usually the
 * trip's — and are converted for display only, so two people on the same trip
 * can each read it in their own money without the stored figures drifting.
 * The choice comes from the account's `defaultCurrency`, which the shared
 * `CurrencySelect` writes, so it follows the traveller across devices.
 *
 * Conversion needs live rates. Until they arrive, or if the FX request fails,
 * amounts render in their original currency rather than showing a wrong number.
 */
export function useDisplayCurrency(tripCurrency: string) {
  const { data: session } = useSession();

  const base = tripCurrency.trim().toUpperCase();
  const display = (session?.user?.defaultCurrency?.trim() || base).toUpperCase();
  const needsRates = display !== base;

  const { data: fx, isPending } = useFxRates(base, needsRates);
  const ratesPending = needsRates && isPending;

  /** Convert a stored amount into the display currency, or null when unknown. */
  const convert = useCallback(
    (amount: number, from?: string): number | null => {
      const source = (from || base).toUpperCase();
      if (source === display) return Math.round(amount);
      if (!fx?.rates) return null;
      return convertMinorAmount(amount, source, display, fx.rates, fx.base);
    },
    [base, display, fx],
  );

  /** Format in the display currency, falling back to the stored currency. */
  const format = useCallback(
    (amount: number, from?: string): string => {
      const converted = convert(amount, from);
      return converted == null
        ? formatMoney(amount, (from || base).toUpperCase())
        : formatMoney(converted, display);
    },
    [convert, display, base],
  );

  return useMemo(
    () => ({
      /** Currency amounts are shown in. */
      display,
      /** Whether anything is being converted at all. */
      converted: needsRates,
      /** Rates for a non-trip currency are still loading. */
      loading: ratesPending,
      /** A different currency is selected but no rates arrived. */
      unavailable: needsRates && !ratesPending && !fx?.rates,
      format,
      convert,
    }),
    [display, needsRates, ratesPending, fx, format, convert],
  );
}
