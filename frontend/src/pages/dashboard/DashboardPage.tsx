import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BellIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "@/app/router";
import { useSession } from "@/shared/auth";
import { fetchTrips } from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { POPULAR_DESTINATIONS } from "@/entities/destination";
import type { TripStatus } from "@/entities/trip";
import { AppSidebar } from "@/widgets/app-sidebar";
import { UserMenu } from "@/widgets/user-menu";
import { Spinner } from "@/shared/ui/spinner";
import { cn } from "@/shared/lib";
import {
  CreateTripWizardDialog,
  HomeSidebar,
  MobileHomeNav,
  useLocalJournal,
} from "@/pages/trips";
import { DestinationDetail, DiscoverTiles } from "./ui/DiscoverPanel";
import { DashboardRail } from "./ui/DashboardRail";
import { ItineraryRow } from "./ui/ItineraryRow";
import "./dashboard.css";

type StatusFilter = "all" | TripStatus;

const FILTERS: StatusFilter[] = ["all", "active", "planning", "settled"];

/** Tiles across the top; the rail lists the full catalog. */
const TILE_COUNT = 3;

/** The signed-in home: who you are, what you are planning, and where next. */
export function DashboardPage() {
  const { t } = useTranslation("trips");
  const { t: tc } = useTranslation("common");
  const { navigate } = useRouter();
  const { data: session } = useSession();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedDestination, setSelectedDestination] = useState<string | null>(
    null,
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSeed, setWizardSeed] = useState<string | null>(null);

  const {
    data: trips = [],
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: queryKeys.trips, queryFn: fetchTrips });
  const { entries } = useLocalJournal(session?.user.id);

  const userName =
    session?.user.name?.trim() ||
    session?.user.email?.split("@")[0] ||
    tc("appName");

  const planningCount = trips.filter(
    (trip) => trip.status === "planning" || trip.status === "active",
  ).length;

  const visible = useMemo(
    () => (filter === "all" ? trips : trips.filter((t) => t.status === filter)),
    [trips, filter],
  );
  const totalStops = trips.reduce((sum, trip) => sum + trip.stopCount, 0);

  const selected =
    POPULAR_DESTINATIONS.find((d) => d.id === selectedDestination) ?? null;

  function planDestination(name: string) {
    setWizardSeed(name);
    setWizardOpen(true);
  }

  return (
    <div className="gb-dashboard h-dvh bg-[var(--dashboard-ground)] p-4 max-md:p-0">
      <div className="flex h-full overflow-hidden rounded-3xl bg-background shadow-[0_8px_32px_-16px_rgba(2,13,51,0.14)] max-md:rounded-none max-md:shadow-none">
      <AppSidebar className="h-full max-md:hidden">
        <HomeSidebar
          surface="trips"
          recentTrips={trips.slice(0, 4)}
          recentEntries={entries}
          onNavigate={navigate}
          onRecord={() => navigate("/journal?compose=stop")}
          onOpenEntry={(entryId) => navigate(`/journal/${entryId}`)}
        />
      </AppSidebar>

      <main className="flex min-w-0 flex-1 overflow-hidden bg-background">
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5 max-md:p-4 max-md:pb-28">
          <header className="flex items-center gap-4">
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {t("dashboard.greeting", { name: userName })}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("dashboard.subtitle", { count: planningCount })}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="wf-interactive wf-pressable flex h-10 w-60 items-center gap-2 rounded-xl bg-muted px-3.5 text-left text-xs text-muted-foreground hover:bg-accent max-lg:hidden"
              >
                <SearchIcon className="size-3.5" aria-hidden="true" />
                {t("dashboard.search")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/today")}
                aria-label={t("dashboard.notifications")}
                className="wf-interactive wf-pressable flex size-10 items-center justify-center rounded-xl bg-muted hover:bg-accent"
              >
                <BellIcon className="size-4" aria-hidden="true" />
              </button>
              <div className="md:hidden">
                <UserMenu compact direction="down" />
              </div>
            </div>
          </header>

          <section className="flex shrink-0 flex-col gap-2.5">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-heading text-base font-bold tracking-tight">
                {t("dashboard.popular.title")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.popular.subtitle")}
              </p>
            </div>
            <DiscoverTiles
              destinations={POPULAR_DESTINATIONS.slice(0, TILE_COUNT)}
              selectedId={selectedDestination}
              onSelect={(id) =>
                setSelectedDestination((current) => (current === id ? null : id))
              }
            />
          </section>

          <div
            className={cn(
              "grid min-h-0 flex-1 gap-3.5",
              selected ? "xl:grid-cols-[minmax(0,1fr)_312px]" : "grid-cols-1",
            )}
          >
            <section className="flex min-h-0 flex-col rounded-2xl bg-muted p-4.5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h2 className="font-heading text-base font-bold tracking-tight">
                    {t("dashboard.itineraries.title")}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("dashboard.itineraries.summary", {
                      trips: t("dashboard.itineraries.trips", {
                        count: trips.length,
                      }),
                      stops: t("card.stops", { count: totalStops }),
                    })}
                  </p>
                </div>
                <div className="ml-auto inline-flex h-8 items-center gap-0.5 rounded-xl bg-card p-0.5">
                  {FILTERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFilter(option)}
                      aria-pressed={filter === option}
                      className={cn(
                        "wf-interactive inline-flex h-7 items-center rounded-[9px] px-2.5 text-xs",
                        filter === option
                          ? "bg-foreground font-semibold text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t(`filters.${option}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="scrollbar-reveal mt-3.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
                {isPending ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner className="size-5" />
                  </div>
                ) : isError ? (
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="wf-interactive m-auto rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
                  >
                    {tc("state.retry")}
                  </button>
                ) : visible.length === 0 ? (
                  <p className="m-auto text-sm text-muted-foreground">
                    {trips.length === 0
                      ? t("empty.subtitle")
                      : t("dashboard.itineraries.empty")}
                  </p>
                ) : (
                  visible.map((trip) => (
                    <ItineraryRow
                      key={trip.id}
                      trip={trip}
                      onOpen={() => navigate(`/trips/${trip.id}`)}
                    />
                  ))
                )}

                <button
                  type="button"
                  onClick={() => {
                    setWizardSeed(null);
                    setWizardOpen(true);
                  }}
                  className="wf-interactive wf-pressable flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-card text-xs font-semibold text-brand hover:bg-card/80"
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                  {t("dashboard.itineraries.new")}
                </button>
              </div>
            </section>

            {selected ? (
              <DestinationDetail
                destination={selected}
                onClose={() => setSelectedDestination(null)}
                onPlan={() => planDestination(selected.name)}
              />
            ) : null}
          </div>
        </div>

        <DashboardRail
          userName={userName}
          userImage={session?.user.image}
          trips={trips}
          destinations={POPULAR_DESTINATIONS}
          selectedId={selectedDestination}
          onSelect={(id) =>
            setSelectedDestination((current) => (current === id ? null : id))
          }
        />
      </main>
      </div>

      <MobileHomeNav surface="trips" onNavigate={navigate} />

      <CreateTripWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initialDestination={wizardSeed}
      />
    </div>
  );
}
