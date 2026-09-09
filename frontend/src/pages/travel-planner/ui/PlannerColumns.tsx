import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

/** Keyboard resize increment, and the larger jump for PageUp/PageDown. */
const STEP = 16;
const JUMP = 64;

// Bumped to v2 so stale {chat,map} values from the old layout don't conflict.
const STORAGE_KEY = "gebook.planner_columns_v2";

interface Widths {
  /** Left fixed column — the schedule / itinerary panel. */
  schedule: number;
  /** Right fixed column — the AI co-planner chat. */
  chat: number;
}

function readStored(fallback: Widths): Widths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Widths>;
    return {
      schedule: Number.isFinite(parsed.schedule)
        ? Number(parsed.schedule)
        : fallback.schedule,
      chat: Number.isFinite(parsed.chat)
        ? Number(parsed.chat)
        : fallback.chat,
    };
  } catch {
    return fallback;
  }
}

/**
 * The planner's three resizable columns: schedule (left), map (center), chat (right).
 *
 * Widths are pixels rather than percentages because each column has a real
 * minimum — the schedule needs room for day cards, the chat for the composer —
 * and those should hold at any window size. The map takes the remainder,
 * so it is the column that grows when the window does.
 */
export function PlannerColumns({
  chat,
  itinerary,
  map,
  minChat,
  minItinerary,
  minMap,
}: {
  chat: ReactNode;
  itinerary: ReactNode;
  map: ReactNode;
  minChat: number;
  minItinerary: number;
  minMap: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<Widths>(() =>
    readStored({ schedule: minItinerary, chat: minChat }),
  );
  const [dragging, setDragging] = useState<"schedule" | "chat" | null>(null);

  /** Keep both columns within what the container can actually give them. */
  const clampWidths = useCallback(
    (next: Widths, available: number): Widths => {
      const schedule = Math.max(
        minItinerary,
        Math.min(next.schedule, available - minChat - minMap),
      );
      const chat = Math.max(
        minChat,
        Math.min(next.chat, available - schedule - minMap),
      );
      return { schedule, chat };
    },
    [minChat, minItinerary, minMap],
  );

  // Re-clamp on mount and whenever the window changes size, so a narrow window
  // never squeezes the map out of existence.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setWidths((current) => clampWidths(current, el.clientWidth));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [clampWidths]);

  const persist = (next: Widths) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A blocked storage write should never break resizing.
    }
  };

  const resize = (which: "schedule" | "chat", delta: number) => {
    const available = containerRef.current?.clientWidth ?? 0;
    setWidths((current) => {
      const next = clampWidths(
        { ...current, [which]: current[which] + delta },
        available,
      );
      persist(next);
      return next;
    });
  };

  function handlePointerDown(
    which: "schedule" | "chat",
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widths[which];
    const available = containerRef.current?.clientWidth ?? 0;
    setDragging(which);
    event.currentTarget.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent) => {
      // Schedule handle (right edge of left column) grows rightward: positive delta.
      // Chat handle (left edge of right column) grows leftward: inverted delta.
      const delta =
        which === "schedule" ? e.clientX - startX : startX - e.clientX;
      setWidths((current) =>
        clampWidths({ ...current, [which]: startWidth + delta }, available),
      );
    };
    const up = () => {
      setDragging(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setWidths((current) => {
        persist(current);
        return current;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function handleKeyDown(
    which: "schedule" | "chat",
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    const towardsStart = which === "schedule" ? -STEP : STEP;
    const towardsEnd = which === "schedule" ? STEP : -STEP;
    switch (event.key) {
      case "ArrowLeft":
        resize(which, towardsStart);
        break;
      case "ArrowRight":
        resize(which, towardsEnd);
        break;
      case "PageUp":
        resize(which, which === "schedule" ? -JUMP : JUMP);
        break;
      case "PageDown":
        resize(which, which === "schedule" ? JUMP : -JUMP);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  const handleClass = (active: boolean) =>
    cn(
      "relative z-10 w-1 flex-none cursor-col-resize touch-none bg-border transition-colors",
      "after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-['']",
      "hover:bg-brand focus-visible:bg-brand focus-visible:outline-none",
      active && "bg-brand",
    );

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1"
    >
      {/* ── Left: Schedule / Itinerary ───────────────────────────────── */}
      <section
        id="planner-schedule"
        style={{ width: widths.schedule }}
        className="flex min-h-0 min-w-0 flex-none flex-col overflow-hidden"
      >
        {itinerary}
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the schedule column"
        aria-controls="planner-schedule"
        aria-valuenow={Math.round(widths.schedule)}
        aria-valuemin={minItinerary}
        tabIndex={0}
        onPointerDown={(event) => handlePointerDown("schedule", event)}
        onKeyDown={(event) => handleKeyDown("schedule", event)}
        className={handleClass(dragging === "schedule")}
      />

      {/* ── Center: Map (flexible — fills remaining space) ───────────── */}
      <section
        id="planner-map"
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        {map}
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the chat column"
        aria-controls="planner-chat"
        aria-valuenow={Math.round(widths.chat)}
        aria-valuemin={minChat}
        tabIndex={0}
        onPointerDown={(event) => handlePointerDown("chat", event)}
        onKeyDown={(event) => handleKeyDown("chat", event)}
        className={handleClass(dragging === "chat")}
      />

      {/* ── Right: AI Co-planner Chat ─────────────────────────────────── */}
      <section
        id="planner-chat"
        style={{ width: widths.chat }}
        className="flex min-h-0 min-w-0 flex-none flex-col overflow-hidden"
      >
        {chat}
      </section>
    </div>
  );
}
