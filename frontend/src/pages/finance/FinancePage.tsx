import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, PiggyBankIcon, PlusIcon } from "lucide-react";
import { useRouter } from "@/app/router";
import {
  addBudgetItem,
  addExpense,
  fetchTrip,
  fetchTrips,
  removeBudgetItem,
  setBudgetContribution,
  updateBudgetItem,
} from "@/shared/api";
import { queryKeys } from "@/shared/config";
import type { StopCategory } from "@/entities/stop";
import type { Trip } from "@/entities/trip";
import { AppSidebar } from "@/widgets/app-sidebar";
import { UserMenu } from "@/widgets/user-menu";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { toastManager } from "@/shared/ui/toast";
import { cn } from "@/shared/lib";
import { CurrencySelect } from "@/features/set-default-currency";
import { HomeSidebar, MobileHomeNav } from "@/pages/trips";
import type { FinanceMode, FinanceScope, PlannedLine } from "./model/finance";
import { useDisplayCurrency } from "./model/useDisplayCurrency";
import { AddExpenseDialog } from "./ui/AddExpenseDialog";
import { AddToPoolDialog } from "./ui/AddToPoolDialog";
import { BudgetItemDialog } from "./ui/BudgetItemDialog";
import { BudgetView } from "./ui/BudgetView";
import { ExpensesView } from "./ui/ExpensesView";
import { FinanceRail } from "./ui/FinanceRail";
import "@/pages/dashboard/dashboard.css";

const MODES: { id: FinanceMode; label: string; icon: typeof PiggyBankIcon }[] = [
  { id: "budget", label: "Budget", icon: PiggyBankIcon },
  { id: "expenses", label: "Expenses", icon: FileTextIcon },
];

/** "PLANNING PHASE · KYOTO · 5 DAYS" — whichever parts the trip actually knows. */
function phaseLabel(trip: Trip | null, budgetMode: boolean): string {
  const parts = [budgetMode ? "Planning phase" : "On the trip"];
  if (trip?.intake?.destination) parts.push(trip.intake.destination);
  if (trip && trip.days.length > 0) {
    parts.push(`${trip.days.length} ${trip.days.length === 1 ? "day" : "days"}`);
  }
  return parts.join(" · ");
}

/**
 * Trip money, in two phases: `budget` is what the group commits while planning,
 * `expenses` is what actually got spent once the trip starts.
 */
export function FinancePage() {
  const { navigate } = useRouter();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<FinanceMode>("budget");
  const [scope, setScope] = useState<FinanceScope>("group");
  const [poolOpen, setPoolOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannedLine | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const { data: trips = [] } = useQuery({
    queryKey: queryKeys.trips,
    queryFn: fetchTrips,
  });
  const activeTripId = selectedTripId ?? trips[0]?.id;

  const { data: trip, isPending } = useQuery({
    queryKey: queryKeys.trip(activeTripId ?? ""),
    queryFn: () => (activeTripId ? fetchTrip(activeTripId) : null),
    enabled: Boolean(activeTripId),
  });

  /** Trip member for the signed-in user; null for a trip they only observe. */
  const currentMemberId = useMemo(
    () => trip?.members.find((m) => m.isCurrentUser)?.id ?? null,
    [trip],
  );

  const contribute = useMutation({
    mutationFn: (amount: number) =>
      setBudgetContribution(activeTripId!, {
        memberId: currentMemberId!,
        amount,
        currency: trip?.currency,
      }),
    onSuccess: (updated: Trip) => {
      queryClient.setQueryData(queryKeys.trip(updated.id), updated);
      setPoolOpen(false);
      toastManager.add({ title: "Budget pool updated", type: "success" });
    },
    onError: () =>
      toastManager.add({ title: "Could not update the pool", type: "error" }),
  });

  /** Every finance mutation returns the whole trip, so they share one success. */
  const applyTrip = (updated: Trip) => {
    queryClient.setQueryData(queryKeys.trip(updated.id), updated);
  };

  const budgetItem = useMutation({
    mutationFn: (input: {
      label: string;
      amount: number;
      category: StopCategory;
      itemId?: string;
    }) =>
      input.itemId
        ? updateBudgetItem(activeTripId!, input.itemId, input)
        : addBudgetItem(activeTripId!, input),
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
    mutationFn: (itemId: string) => removeBudgetItem(activeTripId!, itemId),
    onSuccess: (updated: Trip) => {
      applyTrip(updated);
      setItemOpen(false);
      setEditingItem(null);
      toastManager.add({ title: "Planned cost removed", type: "success" });
    },
    onError: () =>
      toastManager.add({ title: "Could not remove that cost", type: "error" }),
  });

  const expense = useMutation({
    mutationFn: (input: {
      description: string;
      amount: number;
      category: StopCategory;
      payer: string;
      participants: string[];
    }) => addExpense(activeTripId!, input),
    onSuccess: (updated: Trip) => {
      applyTrip(updated);
      setExpenseOpen(false);
      toastManager.add({ title: "Expense added", type: "success" });
    },
    onError: () =>
      toastManager.add({ title: "Could not add the expense", type: "error" }),
  });

  const memberName = useMemo(() => {
    const names = new Map(trip?.members.map((m) => [m.id, m.name]) ?? []);
    return (id: string) => names.get(id) ?? "Someone";
  }, [trip]);

  const money = useDisplayCurrency(trip?.currency ?? "JPY");
  const budgetMode = mode === "budget";
  const canEdit = Boolean(trip?.permissions.canEdit && currentMemberId);

  return (
    <div className="gb-dashboard h-dvh bg-[var(--dashboard-ground)] p-4 max-md:p-0">
      <div className="flex h-full overflow-hidden rounded-3xl bg-background shadow-[0_8px_32px_-16px_rgba(2,13,51,0.14)] max-md:rounded-none max-md:shadow-none">
        <AppSidebar className="h-full max-md:hidden">
          <HomeSidebar
            surface="finance"
            recentTrips={trips.slice(0, 4)}
            recentEntries={[]}
            onNavigate={navigate}
            onRecord={() => navigate("/journal?compose=stop")}
            onOpenEntry={(entryId) => navigate(`/journal/${entryId}`)}
          />
        </AppSidebar>

        <main className="flex min-w-0 flex-1 overflow-hidden bg-background">
          <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5 max-md:p-4 max-md:pb-28">
            <div className="flex shrink-0 justify-center">
              <div className="inline-flex h-10.5 items-center gap-0.5 rounded-2xl bg-card p-1 shadow-[0_10px_26px_-12px_rgba(2,13,51,0.34)] ring-1 ring-border">
                {MODES.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMode(option.id)}
                      aria-pressed={mode === option.id}
                      className={cn(
                        "wf-interactive inline-flex h-8.5 items-center gap-1.5 rounded-[10px] px-4 text-[12.5px] font-semibold",
                        mode === option.id
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <header className="flex flex-wrap items-end gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-muted-foreground">
                  {phaseLabel(trip ?? null, budgetMode)}
                </p>
                <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">
                  {trip
                    ? `${trip.title} — ${budgetMode ? "Budget" : "Expenses"}`
                    : "Trip finances"}
                </h1>
                {trip && money.converted ? (
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    {money.unavailable
                      ? `Exchange rates unavailable — showing ${trip.currency}`
                      : money.loading
                        ? `Converting from ${trip.currency}…`
                        : `Converted from ${trip.currency} at today\u2019s rate`}
                  </p>
                ) : null}
              </div>

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
                {trips.length > 1 ? (
                  <Select
                    items={trips.map((t) => ({ value: t.id, label: t.title }))}
                    value={activeTripId ?? ""}
                    onValueChange={(value) => setSelectedTripId(String(value))}
                  >
                    <SelectTrigger
                      aria-label="Trip"
                      className="h-10 max-w-52 rounded-xl bg-muted"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {trips.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                ) : null}
                {trip ? <CurrencySelect /> : null}
                {budgetMode ? (
                  <button
                    type="button"
                    onClick={() => setPoolOpen(true)}
                    disabled={!canEdit}
                    className="wf-interactive wf-pressable inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-[12.5px] font-semibold whitespace-nowrap text-brand-foreground disabled:opacity-50"
                  >
                    <PlusIcon className="size-3.5" aria-hidden="true" />
                    Add to pool
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpenseOpen(true)}
                    disabled={!canEdit}
                    className="wf-interactive wf-pressable inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-[12.5px] font-semibold text-brand-foreground disabled:opacity-50"
                  >
                    <PlusIcon className="size-3.5" aria-hidden="true" />
                    Add expense
                  </button>
                )}
                <div className="md:hidden">
                  <UserMenu compact direction="down" />
                </div>
              </div>
            </header>

            {isPending ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner className="size-5" />
              </div>
            ) : !trip ? (
              <div className="flex flex-1 items-center justify-center rounded-[20px] bg-muted text-sm text-muted-foreground">
                Create a trip to start planning its budget.
              </div>
            ) : budgetMode ? (
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
                canEdit={canEdit}
              />
            ) : (
              <ExpensesView
                trip={trip}
                currentMemberId={currentMemberId}
                memberName={memberName}
                money={money}
              />
            )}
          </div>

          {trip ? (
            <FinanceRail
              trip={trip}
              mode={mode}
              scope={scope}
              currentMemberId={currentMemberId}
              memberName={memberName}
              onAddToPool={() => setPoolOpen(true)}
              money={money}
              canEdit={canEdit}
            />
          ) : null}
        </main>
      </div>

      <MobileHomeNav surface="finance" onNavigate={navigate} />

      {trip ? (
        <AddToPoolDialog
          open={poolOpen}
          onOpenChange={setPoolOpen}
          trip={trip}
          memberId={currentMemberId}
          onSave={(amount) => contribute.mutate(amount)}
          pending={contribute.isPending}
        />
      ) : null}

      {trip ? (
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
      ) : null}

      {trip ? (
        <AddExpenseDialog
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          trip={trip}
          currentMemberId={currentMemberId}
          onSave={(input) => expense.mutate(input)}
          pending={expense.isPending}
        />
      ) : null}
    </div>
  );
}
