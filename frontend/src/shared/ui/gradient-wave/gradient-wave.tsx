import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/shared/lib";
import { Gradient, type GradientOptions } from "./gradient";

export interface GradientWaveProps extends GradientOptions {
  className?: string;
  style?: CSSProperties;
  /** Pause the animation without unmounting. Defaults to `true`. */
  playing?: boolean;
}

/** Airy sky/ice palette that keeps foreground text readable in both themes. */
const DEFAULT_COLORS = [
  "#cdf5fd",
  "#ffffff",
  "#a0e9ff",
  "#e6faff",
  "#20bced",
  "#ffffff",
];

/**
 * A full-bleed animated mesh-gradient rendered on a WebGL canvas. Drop it into
 * any `position: relative` container as a decorative backdrop — it is
 * `aria-hidden` and `pointer-events-none`, sizes itself to the container, and
 * falls back to a single static frame under `prefers-reduced-motion` or when
 * WebGL is unavailable.
 */
export function GradientWave({
  colors = DEFAULT_COLORS,
  playing = true,
  className,
  style,
  shadowPower,
  darkenTop,
  noiseSpeed,
  noiseFrequency,
  deform,
}: GradientWaveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
    } satisfies Partial<CSSStyleDeclaration>);
    container.appendChild(canvas);

    let gradient: Gradient | null = null;
    try {
      gradient = new Gradient(canvas, {
        colors,
        shadowPower,
        darkenTop,
        noiseSpeed,
        noiseFrequency,
        deform,
      });
      if (playing && !reduceMotion) gradient.start();
      else gradient.renderStatic();
    } catch (error) {
      // WebGL missing/blocked — leave the container empty, the parent's own
      // background shows through.
      console.error("GradientWave: could not start WebGL gradient", error);
    }

    return () => {
      gradient?.dispose();
      canvas.remove();
    };
  }, [
    colors,
    playing,
    reduceMotion,
    shadowPower,
    darkenTop,
    noiseSpeed,
    noiseFrequency,
    deform,
  ]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={style}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    />
  );
}
