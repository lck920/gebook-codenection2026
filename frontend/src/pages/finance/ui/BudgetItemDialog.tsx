import { useEffect, useState } from "react";
import type { StopCategory } from "@/entities/stop";
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
import { cn } from "@/shared/lib";
import type { PlannedLine } from "../model/finance";

/** Categories a trip-wide cost realistically falls into, in planning order. */
const CATEGORIES: { id: StopCategory; label: string }[] = [
  { id: "Transit", label: "Flights & travel" },
  { id: "Stay", label: "Hotel & lodging" },
  { id: "Food", label: "Food" },
  { id: "Activity", label: "Activities" },
  { id: "Shopping", label: "Shopping" },
  { id: "Plan", label: "Other" },
];

/**
 * Add or edit a planned cost that has no itinerary stop — flights, a hotel, a
 * rail pass. Stop costs are edited in the planner, so this only ever writes
 * standalone budget lines.
 */
export function BudgetItemDialog({
  open,
  onOpenChange,
  trip,
  editing,
  onSave,
  onDelete,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  /** Existing line being edited, or null when adding. */
  editing: PlannedLine | null;
  onSave: (input: {
    label: string;
    amount: number;
    category: StopCategory;
  }) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<StopCategory>("Transit");

  useEffect(() => {
    if (!open) return;
    setLabel(editing?.label ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setCategory(editing?.category ?? "Transit");
  }, [open, editing]);

  const parsed = Number(amount);
  const valid = label.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm transition-[opacity] duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogSheetViewport>
          <DialogSheetPopup size="sm" className="gb-dashboard">
            <DialogHeader className="pt-[max(1.5rem,env(safe-area-inset-top))] md:pt-6">
              <DialogTitle className="font-heading text-xl font-semibold tracking-tight">
                {editing ? "Edit planned cost" : "Add planned cost"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                For things the itinerary does not cover — flights, hotels, rail
                passes. Costs on individual stops are set in the planner.
              </DialogDescription>
            </DialogHeader>

            <form
              id="budget-item"
              className="flex flex-col gap-4 px-6 py-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (valid) {
                  onSave({
                    label: label.trim(),
                    amount: Math.round(parsed),
                    category,
                  });
                }
              }}
            >
              <div>
                <label
                  htmlFor="item-label"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  What is it
                </label>
                <Input
                  id="item-label"
                  autoFocus
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Hotel in Asakusa · 4 nights"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label
                  htmlFor="item-amount"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Estimated cost ({trip.currency})
                </label>
                <Input
                  id="item-amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="2000"
                  className="mt-1.5 font-mono"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground">
                  Category
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCategory(option.id)}
                      aria-pressed={category === option.id}
                      className={cn(
                        "wf-interactive inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold",
                        category === option.id
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <DialogFooter>
              {editing && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onDelete}
                  disabled={pending}
                  className="mr-auto text-destructive-foreground"
                >
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="budget-item"
                variant="brand"
                disabled={!valid || pending}
              >
                {pending ? "Saving…" : editing ? "Save changes" : "Add to budget"}
              </Button>
            </DialogFooter>
          </DialogSheetPopup>
        </DialogSheetViewport>
      </DialogPortal>
    </Dialog>
  );
}
