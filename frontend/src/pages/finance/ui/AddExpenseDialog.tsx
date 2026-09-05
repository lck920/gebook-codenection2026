import { useEffect, useState } from "react";
import type { StopCategory } from "@/entities/stop";
import type { Trip } from "@/entities/trip";
import { Avatar } from "@/shared/ui/avatar";
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
import { cn, formatMoney } from "@/shared/lib";

const CATEGORIES: { id: StopCategory; label: string }[] = [
  { id: "Food", label: "Food" },
  { id: "Transit", label: "Transit" },
  { id: "Stay", label: "Stay" },
  { id: "Activity", label: "Activity" },
  { id: "Shopping", label: "Shopping" },
  { id: "Plan", label: "Other" },
];

/**
 * Log money actually spent on the trip: who paid, and who it is split between.
 * The split drives the balances and settle-up plan on the Expenses tab.
 */
export function AddExpenseDialog({
  open,
  onOpenChange,
  trip,
  currentMemberId,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  currentMemberId: string | null;
  onSave: (input: {
    description: string;
    amount: number;
    category: StopCategory;
    payer: string;
    participants: string[];
  }) => void;
  pending: boolean;
}) {
  const everyone = trip.members.map((m) => m.id);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<StopCategory>("Food");
  const [payer, setPayer] = useState<string>(currentMemberId ?? everyone[0] ?? "");
  const [participants, setParticipants] = useState<string[]>(everyone);

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setAmount("");
    setCategory("Food");
    setPayer(currentMemberId ?? trip.members[0]?.id ?? "");
    setParticipants(trip.members.map((m) => m.id));
  }, [open, currentMemberId, trip.members]);

  const parsed = Number(amount);
  const valid =
    description.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    payer !== "" &&
    participants.length > 0;

  const perHead =
    valid && participants.length > 0
      ? Math.round(parsed / participants.length)
      : 0;

  function toggleParticipant(id: string) {
    setParticipants((current) =>
      current.includes(id)
        ? current.filter((p) => p !== id)
        : [...current, id],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm transition-[opacity] duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogSheetViewport>
          <DialogSheetPopup size="md" className="gb-dashboard">
            <DialogHeader className="pt-[max(1.5rem,env(safe-area-inset-top))] md:pt-6">
              <DialogTitle className="font-heading text-xl font-semibold tracking-tight">
                Add expense
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Money already spent on the trip. Everyone you tick shares it
                equally.
              </DialogDescription>
            </DialogHeader>

            <form
              id="add-expense"
              className="flex flex-col gap-4 overflow-y-auto px-6 py-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (valid) {
                  onSave({
                    description: description.trim(),
                    amount: Math.round(parsed),
                    category,
                    payer,
                    participants,
                  });
                }
              }}
            >
              <div>
                <label
                  htmlFor="expense-desc"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  What was it for
                </label>
                <Input
                  id="expense-desc"
                  autoFocus
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Dotonbori dinner"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-amount"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Amount ({trip.currency})
                </label>
                <Input
                  id="expense-amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="13500"
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

              <div>
                <span className="text-xs font-semibold text-muted-foreground">
                  Who paid
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {trip.members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setPayer(member.id)}
                      aria-pressed={payer === member.id}
                      className={cn(
                        "wf-interactive inline-flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1 text-xs font-semibold",
                        payer === member.id
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Avatar
                        name={member.name}
                        bg={member.avatarBg}
                        fg={member.avatarFg}
                        size={26}
                      />
                      {member.name}
                      {member.id === currentMemberId ? " (you)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground">
                  Split between
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {trip.members.map((member) => {
                    const on = participants.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleParticipant(member.id)}
                        aria-pressed={on}
                        className={cn(
                          "wf-interactive inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold",
                          on
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {member.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {participants.length === 0
                    ? "Pick at least one person to split this between."
                    : `${formatMoney(perHead, trip.currency)} each across ${participants.length} ${participants.length === 1 ? "person" : "people"}.`}
                </p>
              </div>
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
                form="add-expense"
                variant="brand"
                disabled={!valid || pending}
              >
                {pending ? "Saving…" : "Add expense"}
              </Button>
            </DialogFooter>
          </DialogSheetPopup>
        </DialogSheetViewport>
      </DialogPortal>
    </Dialog>
  );
}
