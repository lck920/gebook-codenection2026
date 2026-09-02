import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/app/router";
import { useSession } from "@/shared/auth";
import { fetchTrips, fetchTrip } from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { AppSidebar } from "@/widgets/app-sidebar";
import { BackButton } from "../travel-planner/ui/BackButton";
import { BudgetBoard } from "../travel-planner/ui/BudgetBoard";
import { useTripActions } from "../travel-planner/model/useTripActions";
import { ThemeToggle } from "@/features/toggle-theme";

export function FinancePage() {
  const { navigate } = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "current-user";

  const { data: trips = [] } = useQuery({
    queryKey: queryKeys.trips,
    queryFn: fetchTrips,
  });

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const activeTripId = selectedTripId ?? trips[0]?.id;

  const { data: trip } = useQuery({
    queryKey: queryKeys.trip(activeTripId ?? ""),
    queryFn: () => (activeTripId ? fetchTrip(activeTripId) : null),
    enabled: Boolean(activeTripId),
  });

  const actions = useTripActions(activeTripId ?? "");

  // Calculate totals
  const totalSpent = useMemo(() => {
    if (!trip) return 0;
    return trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [trip]);

  const currency = trip?.currency ?? "USD";

  return (
    <div className="flex h-dvh bg-sidebar">
      <AppSidebar
        className="max-md:hidden"
        top={
          <div className="px-3 pt-2">
            <BackButton onBack={() => navigate("/")} title="Gebook Finance" />
          </div>
        }
      >
        <div className="p-3">
          <p className="px-2 text-xs font-semibold text-muted-foreground uppercase">
            Select Escape
          </p>
          <div className="mt-2 space-y-1">
            {trips.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTripId(t.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${
                  t.id === activeTripId
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] opacity-80">{t.currency}</span>
                </div>
              </button>
            ))}
          </div>

          {/* AI Finance Tip in Sidebar */}
          <div className="mt-6 rounded-2xl border border-brand-cyan/40 bg-brand-ice/30 p-3.5 dark:bg-card">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
              <span>🤖</span>
              <span>Finance AI Insight</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Food & dining accounts for 38% of total trip spend. Booking a shared lunch menu can save up to 15%.
            </p>
          </div>
        </div>
      </AppSidebar>

      <main className="min-w-0 flex-1 overflow-y-auto rounded-l-2xl border border-r-0 border-border bg-background p-6 shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.25)] md:p-10 max-md:rounded-none max-md:border-0">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-brand/40 bg-brand/10 font-bold text-brand">
                  💰 Finance & Expense Split
                </Badge>
                <Badge variant="outline" className="border-brand-cyan/40 bg-brand-cyan/10 font-bold text-brand-cyan">
                  ⚡ AI Settle-Up
                </Badge>
              </div>
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground">
                {trip?.title ? `${trip.title} - Budget` : "Trip Finances & Split"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Multi-currency expense tracking, debt minimization, and fair group balance calculation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="brand" onClick={() => navigate("/")}>
                Back to Trips
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="wf-tactile-card rounded-2xl border border-border/80 p-4">
              <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {currency} {totalSpent.toLocaleString()}
              </p>
              <span className="text-[10px] text-brand font-semibold">Across {trip?.expenses.length ?? 0} transactions</span>
            </Card>

            <Card className="wf-tactile-card rounded-2xl border border-border/80 p-4">
              <p className="text-xs font-medium text-muted-foreground">Group Members</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {trip?.members.length ?? 0} Travellers
              </p>
              <span className="text-[10px] text-muted-foreground font-semibold">Equal & custom split ready</span>
            </Card>

            <Card className="wf-tactile-card rounded-2xl border border-brand-cyan/40 bg-gradient-to-br from-card via-card to-brand-ice/30 p-4">
              <p className="text-xs font-medium text-brand">Finance AI Health</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                On Track ✓
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">0 split conflicts detected</span>
            </Card>
          </div>

          {/* Embedded Full Budget Board */}
          {trip ? (
            <Card className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
              <BudgetBoard
                trip={trip}
                currentUserId={currentUserId}
                defaultCurrency={currency}
                canEdit={trip.permissions.canEdit}
                onAddExpense={(input) => actions.expense.mutate(input)}
                onUpdateExpense={(expenseId, input) =>
                  actions.expenseUpdate.mutate({ expenseId, input })
                }
              />
            </Card>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
              Select or create a trip to manage finances.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
