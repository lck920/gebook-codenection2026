import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

/** Keyboard resize increment, and the larger jump for PageUp/PageDown. */
const STEP = 16;
const JUMP = 64;

const STORAGE_KEY = "gebook.planner_columns";

interface Widths {
  chat: number;
  map: number;
}

function readStored(fallback: Widths): Widths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Widths>;
    return {
      chat: Number.isFinite(parsed.chat) ? Number(parsed.chat) : fallback.chat,
      map: Number.isFinite(parsed.map) ? Number(parsed.map) : fallback.map,
    };
  } catch {
    return fallback;
  }
}

/**
 * The planner's three resizable columns: chat, itinerary, map.
 *
 * Widths are pixels rather than percentages because each column has a real
 * minimum — the chat needs room for the composer, the map for its controls —
 * and those should hold at any window size. The itinerary takes the remainder,
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
    readStored({ chat: minChat, map: minMap }),
  );
  const [dragging, setDragging] = useState<"chat" | "map" | null>(null);

  /** Keep both columns within what the container can actually give them. */
  const clampWidths = useCallback(
    (next: Widths, available: number): Widths => {
      const chat = Math.max(
        minChat,
        Math.min(next.chat, available - minMap - minItinerary),
      );
      const map = Math.max(
        minMap,
        Math.min(next.map, available - chat - minItinerary),
      );
      return { chat, map };
    },
    [minChat, minItinerary, minMap],
  );

  // Re-clamp on mount and whenever the window changes size, so a narrow window
  // never squeezes the itinerary out of existence.
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

  const resize = (which: "chat" | "map", delta: number) => {
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
    which: "chat" | "map",
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widths[which];
    const available = containerRef.current?.clientWidth ?? 0;
    setDragging(which);
    event.currentTarget.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent) => {
      // The map grows leftwards, so its handle reads the drag inverted.
      const delta = which === "chat" ? e.clientX - startX : startX - e.clientX;
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
    which: "chat" | "map",
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    const towardsStart = which === "chat" ? -STEP : STEP;
    const towardsEnd = which === "chat" ? STEP : -STEP;
    switch (event.key) {
      case "ArrowLeft":
        resize(which, towardsStart);
        break;
      case "ArrowRight":
        resize(which, towardsEnd);
        break;
      case "PageUp":
        resize(which, which === "chat" ? -JUMP : JUMP);
        break;
      case "PageDown":
        resize(which, which === "chat" ? JUMP : -JUMP);
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
      style={{
        gridTemplateColumns: `${widths.chat}px 1fr ${widths.map}px`,
      }}
    >
      <section
        id="planner-chat"
        style={{ width: widths.chat }}
        className="flex min-h-0 min-w-0 flex-none flex-col overflow-hidden"
      >
        {chat}
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

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {itinerary}
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the map column"
        aria-controls="planner-map"
        aria-valuenow={Math.round(widths.map)}
        aria-valuemin={minMap}
        tabIndex={0}
        onPointerDown={(event) => handlePointerDown("map", event)}
        onKeyDown={(event) => handleKeyDown("map", event)}
        className={handleClass(dragging === "map")}
      />

      <section
        id="planner-map"
        style={{ width: widths.map }}
        className="relative min-h-0 min-w-0 flex-none overflow-hidden"
      >
        {map}
      </section>
    </div>
  );
}
