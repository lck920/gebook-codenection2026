import { useEffect, useState } from "react";
import type { Trip } from "@/entities/trip";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogSheetPopup,
  DialogSheetViewport,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { formatMoney } from "@/shared/lib";

/**
 * Set the signed-in traveller's stake in the shared budget pool.
 *
 * Editing rather than adding: the field is seeded with the current figure, so
 * saving replaces it. Zero withdraws from the pool entirely.
 */
export function AddToPoolDialog({
  open,
  onOpenChange,
  trip,
  memberId,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  memberId: string | null;
  onSave: (amount: number) => void;
  pending: boolean;
}) {
  const current =
    (trip.contributions ?? []).find((c) => c.memberId === memberId)?.amount ?? 0;
  const [value, setValue] = useState(String(current || ""));

  // Reseed whenever the dialog reopens or the stored figure changes under it.
  useEffect(() => {
    if (open) setValue(String(current || ""));
  }, [open, current]);

  const amount = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(amount) && amount >= 0;
  const others = (trip.contributions ?? [])
    .filter((c) => c.memberId !== memberId)
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm transition-[opacity] duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogSheetViewport>
          {/* The popup is portalled out of the page, so it carries the
              dashboard palette class itself to keep the neutral ramp. */}
          <DialogSheetPopup size="sm" className="gb-dashboard">
            <DialogHeader className="pt-[max(1.5rem,env(safe-area-inset-top))] md:pt-6">
              <DialogTitle className="font-heading text-xl font-semibold tracking-tight">
                Your budget contribution
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                What you put into the shared pool for this trip. Planned stop
                costs are drawn from the pool as the group plans.
              </DialogDescription>
            </DialogHeader>

            <form
              id="add-to-pool"
              className="px-6 py-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (valid) onSave(Math.round(amount));
              }}
            >
              <label
                htmlFor="pool-amount"
                className="text-xs font-semibold text-muted-foreground"
              >
                Amount ({trip.currency})
              </label>
              <Input
                id="pool-amount"
                inputMode="numeric"
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="0"
                className="mt-1.5 font-mono"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {others > 0
                  ? `Others have put in ${formatMoney(others, trip.currency)}. The pool becomes ${formatMoney(others + (valid ? Math.round(amount) : 0), trip.currency)}.`
                  : "You are the first to contribute to this pool."}
              </p>
            </form>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-to-pool"
                variant="brand"
                disabled={!valid || pending}
              >
                {pending ? "Saving…" : "Save contribution"}
              </Button>
            </DialogFooter>
          </DialogSheetPopup>
        </DialogSheetViewport>
      </DialogPortal>
    </Dialog>
  );
}
