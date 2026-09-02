import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";

/** Matches `--ease-out` in tokens/spacing.css — cubic-bezier(0.2, 0, 0, 1). */
const EASE_OUT_X1 = 0.2;
const EASE_OUT_Y1 = 0;
const EASE_OUT_X2 = 0;
const EASE_OUT_Y2 = 1;

/** Default matches DayPills height (`h-7` = 28px). */
const DEFAULT_CONTROL_SIZE = 28;
const DEFAULT_FADE_SIZE = 28;
const DEFAULT_DURATION_MS = 200;
const EDGE_EPSILON = 1;

export interface ScrollEdgeFadeProps {
  children: ReactNode;
  className?: string;
  /** Classes applied to the scrollable element (fills the root). */
  scrollerClassName?: string;
  /** Classes applied to the inner content wrapper (e.g. flex row). */
  contentClassName?: string;
  orientation?: "horizontal" | "vertical";
  /** Diameter of the circular page control (px). */
  controlSize?: number;
  /** Soft mask width at each overflowing edge (px). */
  fadeSize?: number;
  /** Page-scroll animation duration (ms). Defaults to `--dur-slow` (200). */
  durationMs?: number;
  /**
   * Circular chevron page controls on overflowing ends.
   * Disable for long free-scroll lists that only need edge fades.
   */
  showControls?: boolean;
}

type EdgeState = {
  canStart: boolean;
  canEnd: boolean;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Unit cubic-bezier solver for the shared ease-out curve. */
function easeOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let guess = t;
  for (let i = 0; i < 5; i++) {
    const x = cubic(EASE_OUT_X1, EASE_OUT_X2, guess) - t;
    const dx = cubicDerivative(EASE_OUT_X1, EASE_OUT_X2, guess);
    if (Math.abs(dx) < 1e-6) break;
    guess -= x / dx;
  }
  return cubic(EASE_OUT_Y1, EASE_OUT_Y2, guess);
}

function cubic(p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

function cubicDerivative(p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * p1 + 6 * mt * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

function animateScroll(
  el: HTMLElement,
  axis: "horizontal" | "vertical",
  to: number,
  durationMs: number,
): () => void {
  const prop = axis === "horizontal" ? "scrollLeft" : "scrollTop";
  const from = el[prop];
  const delta = to - from;
  if (delta === 0 || durationMs <= 0 || prefersReducedMotion()) {
    el[prop] = to;
    return () => {};
  }

  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    el[prop] = from + delta * easeOut(t);
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

function readEdges(
  el: HTMLElement,
  orientation: "horizontal" | "vertical",
): EdgeState {
  if (orientation === "horizontal") {
    const max = el.scrollWidth - el.clientWidth;
    return {
      canStart: el.scrollLeft > EDGE_EPSILON,
      canEnd: el.scrollLeft < max - EDGE_EPSILON,
    };
  }
  const max = el.scrollHeight - el.clientHeight;
  return {
    canStart: el.scrollTop > EDGE_EPSILON,
    canEnd: el.scrollTop < max - EDGE_EPSILON,
  };
}

/**
 * Scroll container with CSS mask-image edge fades and circular page controls.
 *
 * Soft masks appear only on overflowing edges (animated via registered
 * `--scroll-fade-start/end`). A pill-sized circular chevron fades in
 * (ease-out) on each overflowing end; clicking pages by roughly one viewport
 * with the shared ease-out curve.
 */
export function ScrollEdgeFade({
  children,
  className,
  scrollerClassName,
  contentClassName,
  orientation = "horizontal",
  controlSize = DEFAULT_CONTROL_SIZE,
  fadeSize = DEFAULT_FADE_SIZE,
  durationMs = DEFAULT_DURATION_MS,
  showControls = true,
}: ScrollEdgeFadeProps) {
  const { t } = useTranslation("common");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cancelScrollRef = useRef<(() => void) | null>(null);
  const [edges, setEdges] = useState<EdgeState>({
    canStart: false,
    canEnd: false,
  });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges(readEdges(el, orientation));
  }, [orientation]);

  useEffect(() => {
    const el = scrollerRef.current;
    const content = contentRef.current;
    if (!el) return;

    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    if (content) ro.observe(content);

    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
      cancelScrollRef.current?.();
    };
  }, [updateEdges]);

  const page = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const viewport =
      orientation === "horizontal" ? el.clientWidth : el.clientHeight;
    const step = Math.max(viewport - controlSize, controlSize);
    const current =
      orientation === "horizontal" ? el.scrollLeft : el.scrollTop;
    const max =
      orientation === "horizontal"
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight;
    const next = Math.min(max, Math.max(0, current + direction * step));

    cancelScrollRef.current?.();
    cancelScrollRef.current = animateScroll(
      el,
      orientation,
      next,
      durationMs,
    );
  };

  const isHorizontal = orientation === "horizontal";
  const StartIcon = isHorizontal ? ChevronLeft : ChevronUp;
  const EndIcon = isHorizontal ? ChevronRight : ChevronDown;

  const controlClass = cn(
    "absolute z-[2] flex items-center justify-center rounded-full",
    "bg-card text-muted-foreground shadow-[0_0_0_1px_var(--border)]",
    "transition-[opacity,scale,color,background-color] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
    "hover:text-foreground active:scale-[var(--press-scale)]",
    "focus-visible:outline-none",
  );

  const controlStyle = {
    width: controlSize,
    height: controlSize,
  } satisfies CSSProperties;

  const scrollerStyle = {
    "--scroll-fade-start": edges.canStart ? `${fadeSize}px` : "0px",
    "--scroll-fade-end": edges.canEnd ? `${fadeSize}px` : "0px",
  } as CSSProperties;

  return (
    <div
      data-slot="scroll-edge-fade"
      className={cn(
        "relative min-w-0",
        !isHorizontal && "min-h-0",
        className,
      )}
    >
      <div
        ref={scrollerRef}
        data-orientation={orientation}
        className={cn(
          "wf-scroll-edge-fade scrollbar-none",
          isHorizontal
            ? "overflow-x-auto overflow-y-hidden"
            : "h-full min-h-0 overflow-y-auto overflow-x-hidden",
          scrollerClassName,
        )}
        style={scrollerStyle}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>

      {showControls ? (
        <>
          <button
            type="button"
            tabIndex={edges.canStart ? 0 : -1}
            aria-hidden={!edges.canStart}
            aria-label={t("actions.scrollPrevious")}
            disabled={!edges.canStart}
            onClick={() => page(-1)}
            className={cn(
              controlClass,
              isHorizontal
                ? "top-1/2 left-0 -translate-y-1/2"
                : "top-0 left-1/2 -translate-x-1/2",
              edges.canStart
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0",
            )}
            style={controlStyle}
          >
            <StartIcon className="size-3.5" aria-hidden />
          </button>

          <button
            type="button"
            tabIndex={edges.canEnd ? 0 : -1}
            aria-hidden={!edges.canEnd}
            aria-label={t("actions.scrollNext")}
            disabled={!edges.canEnd}
            onClick={() => page(1)}
            className={cn(
              controlClass,
              isHorizontal
                ? "top-1/2 right-0 -translate-y-1/2"
                : "bottom-0 left-1/2 -translate-x-1/2",
              edges.canEnd
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0",
            )}
            style={controlStyle}
          >
            <EndIcon className="size-3.5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
