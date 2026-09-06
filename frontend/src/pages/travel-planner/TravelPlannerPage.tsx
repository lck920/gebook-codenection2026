import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTrip,
  renameTrip,
  reversePlace,
  fetchPreferences,
  updateAgentPanelPreference,
  fetchAgentStatus,
  approveAgentSuggestion,
  ApiError,
  type AgentSuggestion,
  type UpdateStopInput,  setTripStatus,
} from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { stopNumbers, upsertTripSummary, type Trip, type TripSummary } from "@/entities/trip";
import type { Stop } from "@/entities/stop";
import { CalendarCheck2, CalendarRange, Map as MapIcon, Wallet } from "lucide-react";
import { useRouter } from "@/app/router";
import { useSession } from "@/shared/auth";
import { cn, useDocumentTitle, useIsMobile } from "@/shared/lib";
import { AppSidebar } from "@/widgets/app-sidebar";
import { Spinner } from "@/shared/ui/spinner";
import { clamp } from "@/shared/ui/splitter";
import { toastManager } from "@/shared/ui/toast";
import { useTripActions } from "./model/useTripActions";
import { useTripRealtime } from "./model/useTripRealtime";
import { useAgentEvents } from "./model/useAgentEvents";
import { BackButton } from "./ui/BackButton";
import { InviteDialog } from "./ui/InviteDialog";
import { ItineraryColumn } from "./ui/ItineraryColumn";
import { PlannerColumns } from "./ui/PlannerColumns";
import { PlannerHeader } from "./ui/PlannerHeader";
import type { SidebarProps } from "./ui/Sidebar";
import { MobileAgentSheet } from "./ui/mobile/MobileAgentSheet";
import { MobileItinerarySheet } from "./ui/mobile/MobileItinerarySheet";
import { MobilePlannerHeader } from "./ui/mobile/MobilePlannerHeader";
import { MobileStopDetailSheet } from "./ui/mobile/MobileStopDetailSheet";
import { StopInspector } from "./ui/StopInspector";
import { buildPlanTripMessage } from "./lib/buildAgentSeedMessage";
import { MobileTabBar } from "./ui/mobile/MobileTabBar";
import { AgentChat } from "./ui/agent/AgentChat";
import { AgentInterventionToasts } from "./ui/agent/AgentInterventionToast";
import { NoteEditorPane } from "./ui/NoteEditorPane";
import { TripMapView } from "./ui/TripMapView";
import { ScheduleBoard, type ComposeDraft } from "./ui/ScheduleBoard";
import { BudgetBoard } from "./ui/BudgetBoard";
import { FloatingMembers } from "./ui/FloatingMembers";
import { ReservationsBoard } from "./ui/ReservationsBoard";
import { StreetViewViewerProvider } from "./ui/street-view/StreetViewViewerProvider";
import { RePlanOnFlyDialog } from "./ui/RePlanOnFlyDialog";
import { GroupPreferencesModal } from "./ui/GroupPreferencesModal";

type Tab = "map" | "schedule" | "reservations" | "budget";

/** Which surface a stop was picked on, so its panel opens there. */
type StopSelectionSource = "itinerary" | "map";

const MIN_SIDEBAR_WIDTH = 0;
const MAX_SIDEBAR_WIDTH = 55;
const DEFAULT_SIDEBAR_WIDTH = 30;

export function TravelPlannerPage({ tripId }: { tripId: string }) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const { t: ta } = useTranslation("agent");
  const { navigate } = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "lynn";
  const preferredCurrency = session?.user?.defaultCurrency;

  const { i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("map");
  const [day, setDay] = useState(0);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  // Where the stop was clicked decides where its panel opens: picking a stop in
  // the itinerary should not send the reader's eye across to the map column,
  // and picking a pin on the map should not cover the list they were reading.
  const [selectionSource, setSelectionSource] =
    useState<StopSelectionSource>("map");
  // "Plan with AI" fills the composer rather than sending: the member gets to
  // edit the ask before the agent starts drafting days. The counter re-offers
  // the same text after they clear it.
  const [agentDraft, setAgentDraft] = useState<{
    text: string;
    key: string;
  } | null>(null);
  const [noteEditingStopId, setNoteEditingStopId] = useState<string | null>(
    null,
  );
  const [compose, setCompose] = useState<ComposeDraft | null>(null);
  const [picking, setPicking] = useState(false);
  const [locateSignal, setLocateSignal] = useState(0);
  const [rePlanOpen, setRePlanOpen] = useState(false);
  const [groupPrefsOpen, setGroupPrefsOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: trip, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.trip(tripId),
    queryFn: () => fetchTrip(tripId),
  });
  const actions = useTripActions(tripId);
  const realtime = useTripRealtime(tripId, Boolean(trip));

  useDocumentTitle(trip?.title);

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const previousSidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  const { data: preferences } = useQuery({
    queryKey: queryKeys.preferences,
    queryFn: fetchPreferences,
    staleTime: 5 * 60 * 1000,
  });


  useEffect(() => {
    if (!preferences) return;
    const width = clamp(
      preferences.plannerSidebar?.width ?? DEFAULT_SIDEBAR_WIDTH,
      MIN_SIDEBAR_WIDTH,
      MAX_SIDEBAR_WIDTH,
    );
    setSidebarWidth(width);
    if (width > MIN_SIDEBAR_WIDTH) {
      previousSidebarWidthRef.current = width;
    }
  }, [preferences]);

  useEffect(() => {
    if (sidebarWidth > MIN_SIDEBAR_WIDTH) {
      previousSidebarWidthRef.current = sidebarWidth;
    }
  }, [sidebarWidth]);

  // ----- Trip agent (only active when the deployment has AI configured) -----
  const { data: agentStatus } = useQuery({
    queryKey: queryKeys.agentStatus,
    queryFn: fetchAgentStatus,
    staleTime: Infinity,
  });
  const agentEnabled = agentStatus?.enabled ?? false;

  // Prefer React Query cache as the single source of truth. A separate
  // useState + useEffect(preferences) race: open → optimistic false → late
  // GET /preferences with stale true re-collapses the panel immediately.
  const agentCollapsed = preferences?.agentPanelCollapsed ?? true;
  const status = useMutation({
    mutationFn: (next: Trip["status"]) => setTripStatus(tripId, next),
    onSuccess: (updated: Trip) => {
      queryClient.setQueryData(queryKeys.trip(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips });
    },
    onError: () =>
      toastManager.add({ title: "Could not change the status", type: "error" }),
  });

  const agentPanelMutation = useMutation({
    mutationFn: updateAgentPanelPreference,
    onMutate: async (collapsed) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.preferences });
      const previous = queryClient.getQueryData<
        Awaited<ReturnType<typeof fetchPreferences>>
      >(queryKeys.preferences);
      if (previous) {
        queryClient.setQueryData(queryKeys.preferences, {
          ...previous,
          agentPanelCollapsed: collapsed,
        });
      }
      return { previous };
    },
    onError: (_err, _collapsed, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.preferences, context.previous);
      }
    },
    onSuccess: (data) => queryClient.setQueryData(queryKeys.preferences, data),
  });
  const setAgentPanel = useCallback(
    (collapsed: boolean) => {
      agentPanelMutation.mutate(collapsed);
    },
    [agentPanelMutation],
  );

  // Open the agent panel once when a create-wizard prompt draft is waiting.
  useEffect(() => {
    if (!agentEnabled || !trip?.agentSeedPending) return;
    if (!agentCollapsed) return;
    setAgentPanel(false);
  }, [agentEnabled, trip?.agentSeedPending, trip?.id, agentCollapsed, setAgentPanel]);

  // Only poll when the trip is readable; non-members get 404 and should not
  // hammer /agent/events (same existence-hiding 404 as getTrip).
  const { suggestions: agentSuggestions, newMessages } = useAgentEvents(
    tripId,
    agentEnabled && Boolean(trip),
  );
  const pendingSuggestions = useMemo(
    () => agentSuggestions.filter((s) => s.status === "pending"),
    [agentSuggestions],
  );

  // Retire toasts and refresh the trip when someone else applies a suggestion.
  const seenPendingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const s of agentSuggestions) {
      if (s.status === "pending") {
        seenPendingRef.current.add(s.id);
      } else if (seenPendingRef.current.delete(s.id) && s.status === "applied") {
        if (s.appliedBy && s.appliedBy !== currentUserId) {
          const name =
            trip?.members.find((m) => m.userId === s.appliedBy)?.name ?? "";
          toastManager.add({
            title: name
              ? ta("toast.appliedByOther", { name })
              : ta("toast.applied"),
            type: "info",
          });
          // Do not invalidate trip here — Hyperdrive may return a stale trip
          // and erase concurrent local edits. Collaborators pick up the change
          // on the next write-echo or full navigation.
        }
      }
    }
  }, [agentSuggestions, currentUserId, trip, ta]);

  const seenMentionToastRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!agentEnabled) return;
    for (const message of newMessages) {
      if (message.actorUserId === currentUserId) continue;
      if (!(message.mentionedUserIds ?? []).includes(currentUserId)) continue;
      if (seenMentionToastRef.current.has(message.id)) continue;
      seenMentionToastRef.current.add(message.id);

      const preview = message.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join("\n")
        .trim()
        .slice(0, 140);

      toastManager.add({
        title: ta("mention.toastTitle", {
          name: message.actorName ?? ta("panel.systemName"),
        }),
        description: preview || undefined,
        type: "info",
        actionProps: {
          onClick: () => setAgentPanel(false),
          children: ta("mention.view"),
        },
      });
    }
  }, [newMessages, currentUserId, agentEnabled, ta, setAgentPanel]);

  /** Proactive suggestions use the same approval DTO as AI SDK tools. */
  const approveSuggestionMutation = useMutation({
    mutationFn: (input: { id: string; approved: boolean }) =>
      approveAgentSuggestion(tripId, input),
    onSuccess: (result, variables) => {
      if (variables.approved && result && "id" in result) {
        void queryClient.cancelQueries({ queryKey: queryKeys.trip(tripId) });
        queryClient.setQueryData(queryKeys.trip(tripId), result);
        toastManager.add({ title: ta("toast.applied"), type: "success" });
      }
    },
    onError: (err) => {
      const stale =
        err instanceof ApiError &&
        (err.status === 409 || err.code === "suggestion_stale");
      toastManager.add({
        title: stale ? ta("toast.stale") : ta("toast.applyError"),
        type: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentEvents(tripId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentMessages(tripId) });
    },
  });

  const handleApproveSuggestion = useCallback(
    (s: AgentSuggestion) =>
      approveSuggestionMutation.mutate({ id: s.id, approved: true }),
    [approveSuggestionMutation],
  );
  const handleDenySuggestion = useCallback(
    (s: AgentSuggestion) =>
      approveSuggestionMutation.mutate({ id: s.id, approved: false }),
    [approveSuggestionMutation],
  );
  const handleDiscussSuggestion = useCallback(
    () => setAgentPanel(false),
    [setAgentPanel],
  );
  const applyingSuggestionId =
    approveSuggestionMutation.isPending &&
    approveSuggestionMutation.variables?.approved
      ? approveSuggestionMutation.variables.id
      : null;

  const rename = useMutation({
    mutationFn: (title: string) => renameTrip(tripId, title),
    onSuccess: (trip) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.trip(tripId) });
      queryClient.setQueryData(queryKeys.trip(tripId), trip);
      queryClient.setQueryData(
        queryKeys.trips,
        (old: TripSummary[] | undefined) => upsertTripSummary(old, trip),
      );
    },
  });

  const numbers = useMemo(
    () => (trip ? stopNumbers(trip.stops) : new Map<string, number>()),
    [trip],
  );

  // Bias place search toward the trip's existing footprint for local relevance.
  const bias = useMemo(() => {
    const first = trip?.stops?.[0];
    return first ? { lat: first.lat, lng: first.lng } : undefined;
  }, [trip]);

  const openCompose = (d: number, index: number) =>
    setCompose({
      day: d,
      index,
      name: "",
      time: "",
      costCurrency: preferredCurrency || trip?.currency,
    });
  const patchCompose = (patch: Partial<ComposeDraft>) =>
    setCompose((c) => (c ? { ...c, ...patch } : c));
  const cancelCompose = () => {
    setCompose(null);
    setPicking(false);
  };
  const confirmCompose = () => {
    setCompose((c) => {
      const name = c?.name.trim();
      if (c && name) {
        actions.stop.mutate({
          day: c.day,
          index: c.index,
          name,
          time: c.time.trim(),
          duration: c.duration?.trim() || undefined,
          lat: c.lat,
          lng: c.lng,
          area: c.area,
          category: c.category,
          cost: c.cost,
          costCurrency: c.costCurrency,
          note: c.note?.trim() || undefined,
        });
      }
      return null;
    });
    setPicking(false);
  };
  const startPickOnMap = () => {
    if (!compose) return;
    setPicking(true);
    setTab("map");
  };
  const handleMapPick = async (lng: number, lat: number) => {
    setPicking(false);
    setTab("schedule");
    let name: string | undefined;
    let area: string | undefined;
    try {
      const place = await reversePlace(lat, lng, i18n.resolvedLanguage ?? "en");
      if (place) {
        name = place.label;
        area = place.secondary || undefined;
      }
    } catch {
      // Reverse geocoding is best-effort; keep any name the user already typed.
    }
    setCompose((c) =>
      c ? { ...c, lat, lng, name: c.name.trim() || name || c.name, area } : c,
    );
  };
  // Right-click "Add a stop here": open the composer pre-filled at the clicked point.
  const addStopAt = async (lng: number, lat: number) => {
    if (!trip) return;
    const targetDay = day > 0 ? day : (trip.days[0]?.number ?? 1);
    const index = trip.stops.filter((s) => s.day === targetDay).length;
    setCompose({
      day: targetDay,
      index,
      name: "",
      time: "",
      lat,
      lng,
      costCurrency: preferredCurrency || trip.currency,
    });
    setPicking(false);
    setTab("schedule");
    try {
      const place = await reversePlace(lat, lng, i18n.resolvedLanguage ?? "en");
      if (place) {
        setCompose((c) =>
          c
            ? {
                ...c,
                name: c.name.trim() || place.label,
                area: place.secondary || undefined,
              }
            : c,
        );
      }
    } catch {
      // Reverse geocoding is best-effort; the user can still type a name.
    }
  };

  // Must stay above pending/error early returns — otherwise trip load adds a
  // hook and React throws #310 ("Rendered more hooks than during the previous render").
  useEffect(() => {
    if (!trip || !noteEditingStopId) return;
    if (!trip.stops.some((s) => s.id === noteEditingStopId)) {
      setNoteEditingStopId(null);
    }
  }, [noteEditingStopId, trip]);

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !trip) {
    // Non-members get the same 404 as missing trips (no existence leak).
    // Direct /trips/:id links without joining via /invite/:token hit this.
    return (
      <div className="flex h-dvh bg-sidebar">
        <AppSidebar
          className="max-md:hidden"
          top={<BackButton onBack={() => navigate("/")} />}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-l-2xl border border-r-0 border-border bg-background px-6 text-center max-md:rounded-none max-md:border-0">
          <p className="text-sm font-medium text-pretty text-foreground">
            {tc("state.tripUnavailable")}
          </p>
          <p className="max-w-sm text-sm text-pretty text-muted-foreground">
            {tc("state.tripUnavailableHint")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex h-10 items-center justify-center px-2 text-sm text-corn-600 transition-[color,scale] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:underline active:scale-[var(--press-scale)]"
            >
              {tc("actions.back")}
            </button>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex h-10 items-center justify-center px-2 text-sm text-muted-foreground transition-[color,scale] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:underline active:scale-[var(--press-scale)]"
            >
              {tc("state.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabItems = [
    { value: "map", label: t("tabs.map"), icon: MapIcon },
    { value: "schedule", label: t("tabs.schedule"), icon: CalendarRange },
    { value: "reservations", label: t("tabs.reservations"), icon: CalendarCheck2 },
    { value: "budget", label: t("tabs.budget"), icon: Wallet },
  ];

  const selectStop = (id: string, from: StopSelectionSource = "map") => {
    setSelectedStopId(id);
    setSelectionSource(from);
    setNoteEditingStopId((current) => (current && current !== id ? null : current));
  };

  const focusGeneratedDay = (dayNumber: number) => {
    if (!trip.days.some((candidate) => candidate.number === dayNumber)) {
      toastManager.add({ title: ta("generated.staleDay"), type: "error" });
      return;
    }
    setDay(dayNumber);
    setSelectedStopId(null);
    setNoteEditingStopId(null);
    setTab("schedule");
    setAgentPanel(true);
  };

  const removeStop = (stopId: string) => {
    // Clear the selection first: the panel would otherwise linger on a stop
    // that no longer exists while the mutation settles.
    setSelectedStopId(null);
    actions.stopDelete.mutate(stopId);
  };

  const planWithAgent = () => {
    setAgentPanel(false);
    setAgentDraft((current) => ({
      text: buildPlanTripMessage(ta, trip),
      key: `plan-${(current ? Number(current.key.split("-")[1]) : 0) + 1}`,
    }));
  };

  const focusGeneratedStop = (stopId: string) => {
    const stop = trip.stops.find((candidate) => candidate.id === stopId);
    if (!stop) {
      toastManager.add({ title: ta("generated.staleStop"), type: "error" });
      return;
    }
    setDay(stop.day);
    setNoteEditingStopId(null);
    setTab("map");
    selectStop(stop.id);
    setAgentPanel(true);
  };

  const noteEditingStop = noteEditingStopId
    ? trip.stops.find((s) => s.id === noteEditingStopId)
    : undefined;

  const openNoteEditor = (stopId: string) => {
    setSelectedStopId(stopId);
    setNoteEditingStopId(stopId);
  };

  const closeNoteEditor = () => {
    setNoteEditingStopId(null);
  };

  const writeStopTravelogue = (stop: Stop) => {
    const search = new URLSearchParams({
      compose: "stop",
      tripId: trip.id,
      title: stop.name,
    });
    navigate(`/journal?${search.toString()}`);
  };

  const headerSubtitle = formatTripSubtitle(trip, i18n.language, t);

  const sidebarProps: SidebarProps = {
    trip,
    day,
    onDayChange: (d) => {
      setDay(d);
      setSelectedStopId(null);
      setNoteEditingStopId(null);
    },
    selectedStopId,
    onSelectStop: selectStop,
    onCloseDetail: () => setSelectedStopId(null),
    currentUserId,
    canEdit: trip.permissions.canEdit,
    onToggleVote: (stopId) => actions.vote.mutate(stopId),
    onComment: (stopId, text) => actions.comment.mutate({ stopId, text }),
    commentPending: actions.comment.isPending,
    onUpdateStop: (stopId, patch: UpdateStopInput) =>
      actions.stopUpdate.mutate({ stopId, patch }),
    onChangeStopDay: (stopId, targetDay) => {
      const index = trip.stops.filter((s) => s.day === targetDay).length;
      actions.stopMove.mutate({ stopId, day: targetDay, index });
    },
    onExpandNote: openNoteEditor,
    onWriteTravelogue: (stopId) => {
      const stop = trip.stops.find((candidate) => candidate.id === stopId);
      if (stop) writeStopTravelogue(stop);
    },
  };

  const selectedStop = selectedStopId
    ? trip.stops.find((s) => s.id === selectedStopId)
    : undefined;

  // All four mode panes stay mounted so switching modes preserves each pane's
  // scroll position and keeps the MapLibre canvas alive; only the active pane
  // is visible. The note editor overlays them all while open.
  const renderPanes = (activeTab: Tab, withMap: boolean) => (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <PlannerPane active={withMap && !noteEditingStop && activeTab === "map"}>
        <TripMapView
          trip={trip}
          numbers={numbers}
          day={day}
          activeStopId={selectedStopId}
          onSelectStop={selectStop}
          picking={picking}
          onPick={handleMapPick}
          onAddStopHere={addStopAt}
          locateSignal={locateSignal}
          onCancelPick={() => {
            setPicking(false);
            setTab("schedule");
          }}
        />
      </PlannerPane>
      <PlannerPane active={!noteEditingStop && activeTab === "schedule"}>
        <ScheduleBoard
          trip={trip}
          compose={compose}
          defaultCurrency={preferredCurrency || trip.currency}
          biasLat={bias?.lat}
          biasLng={bias?.lng}
          onOpen={openCompose}
          onChange={patchCompose}
          onConfirm={confirmCompose}
          onCancel={cancelCompose}
          onPickOnMap={startPickOnMap}
          onSelectStop={(id) => {
            setTab("map");
            setDay(0);
            selectStop(id);
          }}
          onAddDay={() => actions.day.mutate()}
          onUpdateDay={(dayNumber, patch) =>
            actions.dayUpdate.mutate({ dayNumber, patch })
          }
          onDeleteDay={(dayNumber) => actions.dayDelete.mutate(dayNumber)}
          onReorderDays={(order) => actions.dayReorder.mutate(order)}
          onMoveStop={(input) => actions.stopMove.mutate(input)}
          addingDay={actions.day.isPending}
          deletingDayNumber={
            actions.dayDelete.isPending
              ? actions.dayDelete.variables
              : undefined
          }
          updatingDayNumber={
            actions.dayUpdate.isPending
              ? actions.dayUpdate.variables?.dayNumber
              : undefined
          }
        />
      </PlannerPane>
      <PlannerPane active={!noteEditingStop && activeTab === "reservations"} scroll>
        <ReservationsBoard trip={trip} canEdit={trip.permissions.canEdit} />
      </PlannerPane>
      <PlannerPane active={!noteEditingStop && activeTab === "budget"} scroll>
        <BudgetBoard
          trip={trip}
          currentUserId={currentUserId}
          defaultCurrency={preferredCurrency || trip.currency}
          canEdit={trip.permissions.canEdit}
          onAddExpense={(input) => actions.expense.mutate(input)}
          onUpdateExpense={(expenseId, input) =>
            actions.expenseUpdate.mutate({ expenseId, input })
          }
        />
      </PlannerPane>
      {noteEditingStop ? (
        <div className="absolute inset-0 z-10 overflow-hidden bg-background">
          <NoteEditorPane
            tripId={trip.id}
            editorKey={noteEditingStop.id}
            value={noteEditingStop.note}
            placeholder={t("detail.notePlaceholder")}
            onCommit={(note) =>
              actions.stopUpdate.mutate({
                stopId: noteEditingStop.id,
                patch: { note },
              })
            }
            onClose={closeNoteEditor}
          />
        </div>
      ) : null}
    </div>
  );

  const floatingMembers = noteEditingStop ? null : (
    <FloatingMembers
      tripId={trip.id}
      members={trip.members}
      canInvite={trip.permissions.canInvite}
      onlineUserIds={realtime.presence.map((member) => member.userId)}
      onLocateMe={() => {
        if (tab !== "map") setTab("map");
        setLocateSignal((n) => n + 1);
      }}
    />
  );

  if (isMobile) {
    return (
      <StreetViewViewerProvider tripId={trip.id}>
        <div className="flex h-dvh flex-col bg-background">
        <MobilePlannerHeader
          title={trip.title}
          subtitle={headerSubtitle}
          onBack={() => navigate("/")}
          onRename={(title) => rename.mutate(title)}
          onOpenAgent={agentEnabled ? () => setAgentPanel(false) : undefined}
        />
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {renderPanes(tab, true)}
          {!noteEditingStop && tab === "map" ? (
            <MobileItinerarySheet {...sidebarProps} />
          ) : null}
          {floatingMembers}
        </main>
        <MobileTabBar
          items={tabItems}
          value={tab}
          onValueChange={(v) => {
            setNoteEditingStopId(null);
            setTab(v as Tab);
          }}
        />
        <MobileStopDetailSheet
          trip={trip}
          stop={!noteEditingStop && tab === "map" ? selectedStop : undefined}
          currentUserId={currentUserId}
          canEdit={trip.permissions.canEdit}
          onClose={() => setSelectedStopId(null)}
          onToggleVote={sidebarProps.onToggleVote}
          onComment={sidebarProps.onComment}
          commentPending={actions.comment.isPending}
          onUpdateStop={sidebarProps.onUpdateStop}
          onChangeStopDay={sidebarProps.onChangeStopDay}
          onExpandNote={openNoteEditor}
          onWriteTravelogue={(stopId) => {
            const stop = trip.stops.find((candidate) => candidate.id === stopId);
            if (stop) writeStopTravelogue(stop);
          }}
        />
        {agentEnabled ? (
          <MobileAgentSheet
            open={!agentCollapsed}
            tripId={trip.id}
            trip={trip}
            canEdit={trip.permissions.canEdit}
            applyingId={applyingSuggestionId}
            onApproveSuggestion={handleApproveSuggestion}
            onDenySuggestion={handleDenySuggestion}
            onFocusDay={focusGeneratedDay}
            onFocusStop={focusGeneratedStop}
            onClose={() => setAgentPanel(true)}
          />
        ) : null}
        {agentEnabled ? (
          <AgentInterventionToasts
            suggestions={pendingSuggestions}
            canEdit={trip.permissions.canEdit}
            applyingId={applyingSuggestionId}
            onApprove={handleApproveSuggestion}
            onDiscuss={handleDiscussSuggestion}
            onDeny={handleDenySuggestion}
          />
        ) : null}
        </div>
      </StreetViewViewerProvider>
    );
  }

  // Desktop planner: chat, itinerary and map side by side, so a change made in
  // one is visible in the others without switching views.
  const middleTab: Tab = tab === "map" ? "schedule" : tab;
  const boardTabs: { value: Tab; label: string }[] = [
    { value: "schedule", label: t("tabs.schedule") },
    { value: "budget", label: t("tabs.budget") },
    { value: "reservations", label: t("tabs.reservations") },
  ];

  return (
    <StreetViewViewerProvider tripId={trip.id}>
      <div className="gb-dashboard h-dvh bg-[var(--dashboard-ground)] p-4">
        <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-background shadow-[0_8px_32px_-16px_rgba(2,13,51,0.14)]">
          <PlannerHeader
            trip={trip}
            subtitle={headerSubtitle}
            onBack={() => navigate("/")}
            inviteSlot={<InviteDialog tripId={trip.id} />}
            onToggleStatus={() =>
              status.mutate(trip.status === "planning" ? "active" : "planning")
            }
            statusPending={status.isPending}
          />

          <PlannerColumns
            minChat={390}
            minItinerary={360}
            minMap={420}
            chat={
              <div className="flex min-h-0 flex-1 flex-col border-r border-border">
                {agentEnabled ? (
                <AgentChat
                  tripId={trip.id}
                  trip={trip}
                  canEdit={trip.permissions.canEdit}
                  applyingId={applyingSuggestionId}
                  onApproveSuggestion={handleApproveSuggestion}
                  onDenySuggestion={handleDenySuggestion}
                  onFocusDay={focusGeneratedDay}
                  onFocusStop={focusGeneratedStop}
                  draftSuggestion={agentDraft?.text ?? null}
                  draftSuggestionKey={agentDraft?.key}
                />
              ) : (
                <div className="m-auto max-w-60 px-6 text-center">
                  <p className="text-[13px] font-semibold">
                    {t("agentOff.title")}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {t("agentOff.body")}
                  </p>
                </div>
              )}
              </div>
            }
            itinerary={
              <div className="relative flex min-h-0 flex-1 flex-col border-r border-border">
                <div className="flex h-12 flex-none items-center gap-2 border-b border-border px-4.5">
                <span className="text-[13px] font-bold tracking-tight">
                  {t("tabs.schedule")}
                </span>
                <div className="ml-auto inline-flex h-7.5 items-center gap-0.5 rounded-[10px] bg-muted p-0.5">
                  {boardTabs.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setNoteEditingStopId(null);
                        setTab(item.value);
                      }}
                      aria-pressed={middleTab === item.value}
                      className={cn(
                        "wf-interactive inline-flex h-6 items-center rounded-[7px] px-2.5 text-[11.5px] font-semibold",
                        middleTab === item.value
                          ? "bg-card text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {middleTab === "schedule" ? (
                <ItineraryColumn
                  trip={trip}
                  day={day}
                  onDayChange={(d) => {
                    setDay(d);
                    setSelectedStopId(null);
                    setNoteEditingStopId(null);
                  }}
                  selectedStopId={selectedStopId}
                  onSelectStop={(id) => selectStop(id, "itinerary")}
                  compose={compose}
                  onOpenCompose={openCompose}
                  onChangeCompose={patchCompose}
                  onConfirmCompose={confirmCompose}
                  onCancelCompose={cancelCompose}
                  canEdit={trip.permissions.canEdit}
                  onPlanWithAI={agentEnabled ? planWithAgent : undefined}
                  onPickOnMap={startPickOnMap}
                  biasLat={bias?.lat}
                  biasLng={bias?.lng}
                />
              ) : (
                <div className="relative min-h-0 flex-1">
                  {renderPanes(middleTab, false)}
                </div>
              )}
              {selectedStop &&
              !noteEditingStop &&
              selectionSource === "itinerary" ? (
                <StopInspector
                  trip={trip}
                  stop={selectedStop}
                  currentUserId={currentUserId}
                  canEdit={trip.permissions.canEdit}
                  onClose={() => setSelectedStopId(null)}
                  onToggleVote={sidebarProps.onToggleVote}
                  onComment={sidebarProps.onComment}
                  commentPending={actions.comment.isPending}
                  onUpdateStop={sidebarProps.onUpdateStop}
                  onChangeStopDay={sidebarProps.onChangeStopDay}
                  onExpandNote={openNoteEditor}
                  onWriteTravelogue={sidebarProps.onWriteTravelogue}
                  onDeleteStop={removeStop}
                />
              ) : null}
              </div>
            }
            map={
              <>
                <TripMapView
                trip={trip}
                numbers={numbers}
                day={day}
                activeStopId={selectedStopId}
                onSelectStop={selectStop}
                picking={picking}
                onPick={handleMapPick}
                onAddStopHere={addStopAt}
                locateSignal={locateSignal}
                onCancelPick={() => setPicking(false)}
              />
                {selectedStop && !noteEditingStop && selectionSource === "map" ? (
                  <StopInspector
                    trip={trip}
                    stop={selectedStop}
                    currentUserId={currentUserId}
                    canEdit={trip.permissions.canEdit}
                    onClose={() => setSelectedStopId(null)}
                    onToggleVote={sidebarProps.onToggleVote}
                    onComment={sidebarProps.onComment}
                    commentPending={actions.comment.isPending}
                    onUpdateStop={sidebarProps.onUpdateStop}
                    onChangeStopDay={sidebarProps.onChangeStopDay}
                    onExpandNote={openNoteEditor}
                    onWriteTravelogue={sidebarProps.onWriteTravelogue}
                    onDeleteStop={removeStop}
                  />
                ) : null}
                {floatingMembers}
              </>
            }
          />
        </div>
      </div>
      {agentEnabled ? (
        <AgentInterventionToasts
          suggestions={pendingSuggestions}
          canEdit={trip.permissions.canEdit}
          applyingId={applyingSuggestionId}
          onApprove={handleApproveSuggestion}
          onDiscuss={handleDiscussSuggestion}
          onDeny={handleDenySuggestion}
        />
      ) : null}
      <RePlanOnFlyDialog
        open={rePlanOpen}
        onOpenChange={setRePlanOpen}
        tripTitle={trip.title}
        onTriggerAgentPrompt={() => {
          setAgentPanel(false);
        }}
      />
      <GroupPreferencesModal
        open={groupPrefsOpen}
        onOpenChange={setGroupPrefsOpen}
        tripTitle={trip.title}
        memberCount={trip.members.length}
      />
    </StreetViewViewerProvider>
  );
}

/** Absolutely stacked mode pane; inactive panes keep layout (and scroll
 * position) but are hidden from view, pointer events, and the a11y tree. */
function PlannerPane({
  active,
  scroll = false,
  children,
}: {
  active: boolean;
  /** Boards without their own scroll container scroll within the pane. */
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        "absolute inset-0",
        scroll && "overflow-auto",
        !active && "invisible",
      )}
    >
      {children}
    </div>
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatTripSubtitle(
  trip: Trip,
  locale: string,
  t: TFunction<"planner">,
): string {
  const dayCount = trip.days.length;
  const stopCount = trip.stops.length;

  let startLabel = "";
  let endLabel = "";

  if (ISO_DATE.test(trip.startDate) && dayCount > 0) {
    const [y, m, d] = trip.startDate.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(Date.UTC(y, m - 1, d + dayCount - 1));
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    const fmt = (date: Date, withYear: boolean) =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: withYear ? "numeric" : undefined,
        timeZone: "UTC",
      }).format(date);
    startLabel = fmt(start, !sameYear);
    endLabel = fmt(end, true);
  }

  return t("header.subtitle", {
    start: startLabel,
    end: endLabel,
    days: dayCount,
    stops: stopCount,
  });
}
