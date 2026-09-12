import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StopCategory } from "@/entities/stop";
import type { Trip } from "@/entities/trip";
import {
  AddToPoolDialog,
  BudgetItemDialog,
  BudgetView,
  useDisplayCurrency,
  type FinanceScope,
  type PlannedLine,
} from "@/pages/finance";
import {
  addBudgetItem,
  removeBudgetItem,
  setBudgetContribution,
  updateBudgetItem,
} from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { toastManager } from "@/shared/ui/toast";

/**
 * The trip's Budget tab: the planning-phase money only.
 *
 * What the group has committed to the pool, what the itinerary and standalone
 * lines (flights, a hotel) are expected to cost, and what that leaves. Nothing
 * about who paid for lunch — that is the expenses ledger, which lives on the
 * Finance page and belongs to the trip once it is underway, not while it is
 * being planned.
 *
 * Same view and dialogs as the Finance page's Budget mode, so a number entered
 * here and a number entered there are the same number.
 */
export function TripBudgetPanel({
  trip,
  currentMemberId,
  canEdit,
}: {
  trip: Trip;
  currentMemberId: string | null;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<FinanceScope>("group");
  const [poolOpen, setPoolOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannedLine | null>(null);

  const memberName = useMemo(() => {
    const names = new Map(trip.members.map((m) => [m.id, m.name]));
    return (id: string) => names.get(id) ?? "Someone";
  }, [trip]);

  const money = useDisplayCurrency(trip.currency);

  /** Every budget mutation returns the whole trip, so they share one success. */
  const applyTrip = (updated: Trip) => {
    queryClient.setQueryData(queryKeys.trip(updated.id), updated);
  };

  const contribute = useMutation({
    mutationFn: (amount: number) =>
      setBudgetContribution(trip.id, {
        memberId: currentMemberId!,
        amount,
        currency: trip.currency,
      }),
    onSuccess: (updated: Trip) => {
      applyTrip(updated);
      setPoolOpen(false);
      toastManager.add({ title: "Budget pool updated", type: "success" });
    },
    onError: () =>
      toastManager.add({ title: "Could not update the pool", type: "error" }),
  });

  const budgetItem = useMutation({
    mutationFn: (input: {
      label: string;
      amount: number;
      category: StopCategory;
      itemId?: string;
    }) =>
      input.itemId
        ? updateBudgetItem(trip.id, input.itemId, input)
        : addBudgetItem(trip.id, input),
    onSuccess: (updated: Trip) => {
      applyTrip(updated);
      setItemOpen(false);
      setEditingItem(null);
      toastManager.add({ title: "Budget updated", type: "success" });
    },
    onError: () =>
      toastManager.add({ title: "Could not save that cost", type: "error" }),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => removeBudgetItem(trip.id, itemId),
    onSuccess: (updated: Trip) => {
      applyTrip(updated);
      setItemOpen(false);
      setEditingItem(null);
      toastManager.add({ title: "Planned cost removed", type: "success" });
    },
    onError: () =>
      toastManager.add({ title: "Could not remove that cost", type: "error" }),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4.5">
      <BudgetView
        trip={trip}
        scope={scope}
        onScopeChange={setScope}
        currentMemberId={currentMemberId}
        memberName={memberName}
        onAddToPool={() => setPoolOpen(true)}
        onAddItem={() => {
          setEditingItem(null);
          setItemOpen(true);
        }}
        onEditItem={(line) => {
          setEditingItem(line);
          setItemOpen(true);
        }}
        money={money}
        canEdit={canEdit && currentMemberId !== null}
      />

      <AddToPoolDialog
        open={poolOpen}
        onOpenChange={setPoolOpen}
        trip={trip}
        memberId={currentMemberId}
        onSave={(amount) => contribute.mutate(amount)}
        pending={contribute.isPending}
      />

      <BudgetItemDialog
        open={itemOpen}
        onOpenChange={(open) => {
          setItemOpen(open);
          if (!open) setEditingItem(null);
        }}
        trip={trip}
        editing={editingItem}
        onSave={(input) =>
          budgetItem.mutate({ ...input, itemId: editingItem?.id })
        }
        onDelete={
          editingItem ? () => deleteItem.mutate(editingItem.id) : undefined
        }
        pending={budgetItem.isPending || deleteItem.isPending}
      />
    </div>
  );
}
