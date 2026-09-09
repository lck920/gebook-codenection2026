import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Trip } from "@/entities/trip";

/** Pointer handlers spread onto a small grip element to make it a drag handle
 *  for moving an itinerary stop between (or within) days. Works with mouse,
 *  touch, and pen through a single Pointer Events path. */
export interface ItineraryStopDragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void;
}

export interface ItineraryStopMoveInput {
  stopId: string;
  day: number;
  /** Zero-based slot within the target day, after the dragged stop is removed. */
  index: number;
}

interface DragState {
  stopId: string;
  sourceDay: number;
  dx: number;
  dy: number;
  target: { day: number; index: number } | null;
}

/** Pointer travel (px) before a press on the grip becomes a drag, so a tap
 *  still falls through to the card's own click. */
const DRAG_THRESHOLD = 6;
/** Distance from a scroll edge (px) where an in-progress drag auto-scrolls. */
const EDGE_ZONE = 64;
/** Peak auto-scroll speed (px per frame) at the very edge. */
const EDGE_SPEED = 16;

/** Nearest scrollable ancestor, so the hook works in any container without the
 *  caller wiring a ref to the exact scroll element. */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (
      (oy === "auto" || oy === "scroll" || oy === "overlay") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Drag-to-move for the vertical itinerary views (the narrow-column day stack
 * and the mobile sheet list). Grabbing a stop's grip lifts the card; releasing
 * over another day reparents it, releasing within the same day reorders it. The
 * target index is measured after removing the dragged card, matching the server
 * and the optimistic {@link import("@/entities/trip").moveTripStop} helper.
 */
export function useItineraryStopDrag(
  trip: Trip,
  onMoveStop: ((input: ItineraryStopMoveInput) => void) | undefined,
) {
  const dayEls = useRef(new Map<number, HTMLElement>());
  const stopEls = useRef(new Map<string, HTMLElement>());
  const scrollParent = useRef<HTMLElement | null>(null);
  const startScrollTop = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const pending = useRef<{
    stopId: string;
    sourceDay: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressClick = useRef<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const enabled = typeof onMoveStop === "function";

  const setDragState = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const registerDay = useCallback(
    (day: number) => (el: HTMLElement | null) => {
      if (el) dayEls.current.set(day, el);
      else dayEls.current.delete(day);
    },
    [],
  );

  const registerStop = useCallback(
    (stopId: string) => (el: HTMLElement | null) => {
      if (el) stopEls.current.set(stopId, el);
      else stopEls.current.delete(stopId);
    },
    [],
  );

  const computeTarget = useCallback(
    (clientY: number, stopId: string): { day: number; index: number } | null => {
      let chosenDay: number | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const d of trip.days) {
        const el = dayEls.current.get(d.number);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom) {
          chosenDay = d.number;
          break;
        }
        const distance = Math.abs((r.top + r.bottom) / 2 - clientY);
        if (distance < bestDistance) {
          bestDistance = distance;
          chosenDay = d.number;
        }
      }
      if (chosenDay == null) return null;

      let index = 0;
      for (const stop of trip.stops) {
        if (stop.day !== chosenDay || stop.id === stopId) continue;
        const el = stopEls.current.get(stop.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (clientY < (r.top + r.bottom) / 2) return { day: chosenDay, index };
        index += 1;
      }
      return { day: chosenDay, index };
    },
    [trip.days, trip.stops],
  );

  const isSamePosition = useCallback(
    (stopId: string, target: { day: number; index: number }): boolean => {
      const source = trip.stops.find((s) => s.id === stopId);
      if (!source || source.day !== target.day) return false;
      const sourceIndex = trip.stops
        .filter((s) => s.day === source.day)
        .findIndex((s) => s.id === stopId);
      return sourceIndex === target.index;
    },
    [trip.stops],
  );

  const stopAutoScroll = useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const pushDragState = useCallback(() => {
    const p = pending.current;
    const active = dragRef.current;
    if (!p || !active) return;
    const scrolled =
      (scrollParent.current?.scrollTop ?? startScrollTop.current) -
      startScrollTop.current;
    setDragState({
      stopId: p.stopId,
      sourceDay: p.sourceDay,
      dx: pointer.current.x - p.startX,
      dy: pointer.current.y - p.startY + scrolled,
      target: computeTarget(pointer.current.y, p.stopId),
    });
  }, [computeTarget, setDragState]);

  const tickAutoScroll = useCallback(() => {
    const el = scrollParent.current;
    if (!el || !dragRef.current) {
      rafId.current = null;
      return;
    }
    const r = el.getBoundingClientRect();
    const y = pointer.current.y;
    let delta = 0;
    if (y < r.top + EDGE_ZONE) {
      delta = -EDGE_SPEED * Math.min(1, (r.top + EDGE_ZONE - y) / EDGE_ZONE);
    } else if (y > r.bottom - EDGE_ZONE) {
      delta = EDGE_SPEED * Math.min(1, (y - (r.bottom - EDGE_ZONE)) / EDGE_ZONE);
    }
    if (delta !== 0) {
      const before = el.scrollTop;
      el.scrollTop += delta;
      if (el.scrollTop !== before) pushDragState();
    }
    rafId.current = requestAnimationFrame(tickAutoScroll);
  }, [pushDragState]);

  const reset = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      pending.current = null;
      scrollParent.current = null;
      stopAutoScroll();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setDragState(null);
    },
    [setDragState, stopAutoScroll],
  );

  const handleProps = useCallback(
    (stopId: string, sourceDay: number): ItineraryStopDragHandleProps => ({
      onPointerDown: (e) => {
        if (!enabled || e.button !== 0) return;
        pending.current = {
          stopId,
          sourceDay,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
        };
        pointer.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e) => {
        const p = pending.current;
        if (!p || p.pointerId !== e.pointerId) return;
        pointer.current = { x: e.clientX, y: e.clientY };
        const dx = e.clientX - p.startX;
        const dy = e.clientY - p.startY;
        if (dragRef.current == null) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          scrollParent.current = findScrollParent(stopEls.current.get(p.stopId) ?? null);
          startScrollTop.current = scrollParent.current?.scrollTop ?? 0;
          if (rafId.current == null) {
            rafId.current = requestAnimationFrame(tickAutoScroll);
          }
        }
        e.preventDefault();
        setDragState({
          stopId: p.stopId,
          sourceDay: p.sourceDay,
          dx,
          dy,
          target: computeTarget(e.clientY, p.stopId),
        });
      },
      onPointerUp: (e) => {
        const active = dragRef.current;
        if (active?.target && !isSamePosition(active.stopId, active.target)) {
          onMoveStop?.({ stopId: active.stopId, ...active.target });
        }
        if (active) suppressClick.current = active.stopId;
        reset(e);
      },
      onPointerCancel: reset,
      onClickCapture: (e) => {
        if (suppressClick.current !== stopId) return;
        suppressClick.current = null;
        e.preventDefault();
        e.stopPropagation();
      },
    }),
    [
      computeTarget,
      enabled,
      isSamePosition,
      onMoveStop,
      reset,
      setDragState,
      tickAutoScroll,
    ],
  );

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  const stopStyle = useCallback(
    (stopId: string): CSSProperties | undefined =>
      drag?.stopId === stopId
        ? {
            transform: `translate3d(${drag.dx}px, ${drag.dy}px, 0)`,
            position: "relative",
            zIndex: 30,
          }
        : undefined,
    [drag],
  );

  const target =
    drag?.target && !isSamePosition(drag.stopId, drag.target) ? drag.target : null;

  // The dragged card keeps its DOM slot while lifted, so an insertion line that
  // renders "before rendered item N" must skip past it when the drop lands
  // later in the same day.
  let dropSlot: { day: number; index: number } | null = null;
  if (target && drag) {
    let domIndex = target.index;
    const source = trip.stops.find((s) => s.id === drag.stopId);
    if (source && source.day === target.day) {
      const sourceIndex = trip.stops
        .filter((s) => s.day === target.day)
        .findIndex((s) => s.id === drag.stopId);
      if (sourceIndex >= 0 && target.index > sourceIndex) domIndex = target.index + 1;
    }
    dropSlot = { day: target.day, index: domIndex };
  }

  return {
    registerDay,
    registerStop,
    handleProps,
    stopStyle,
    draggedStopId: drag?.stopId ?? null,
    active: drag != null,
    /** Where to draw the insertion line: DOM slot within `day`'s rendered stops. */
    dropSlot,
    /** Day currently under the pointer — consumers use it to open a folded day. */
    hoverDay: drag?.target?.day ?? null,
  };
}
