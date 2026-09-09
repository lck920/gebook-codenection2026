import type { ReactNode } from "react";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { cn, useIsMobile } from "@/shared/lib";

export interface ContainerScrollProps {
  /** Content laid on the tilting card. It keeps its own framing — this
   *  component contributes the perspective and the transform, nothing else, so
   *  a `BrowserFrame`/`PhoneFrame` inside doesn't end up double-bezelled. */
  children: ReactNode;
  /** Optional heading above the card; drifts up as the card flattens. */
  titleComponent?: ReactNode;
  className?: string;
}

/**
 * Scroll-driven 3D card. The card starts tilted back on its X axis, as though
 * you were looking down at a laptop screen, and flattens to face-on as it
 * travels into view.
 *
 * The tilt is driven by scroll progress rather than a timed animation, so it
 * tracks the pointer/wheel exactly and reverses when scrolling back up. Under
 * `prefers-reduced-motion` every range collapses to its resting value, leaving
 * the card flat and static.
 */
export function ContainerScroll({
  children,
  titleComponent,
  className,
}: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const still = useReducedMotion() ?? false;

  // Progress runs 0 as the card's top edge enters the bottom of the viewport
  // and 1 once the card is centred, so the tilt resolves while the card travels
  // into view rather than after it has already settled.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  // Phones sit closer to the screen, so the same rotation reads much stronger —
  // the scale range compensates rather than the angle.
  const rotateRange: [number, number] = still ? [0, 0] : [22, 0];
  const scaleRange: [number, number] = still
    ? [1, 1]
    : isMobile
      ? [0.92, 1]
      : [1.05, 1];
  const liftRange: [number, number] = still ? [0, 0] : [0, -60];

  const rotateX = useTransform(scrollYProgress, [0, 1], rotateRange);
  const scale = useTransform(scrollYProgress, [0, 1], scaleRange);
  const lift = useTransform(scrollYProgress, [0, 1], liftRange);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Perspective lives on the parent so the child's rotateX reads as depth
          rather than a flat vertical squash. */}
      <div className="[perspective:1200px]">
        {titleComponent ? (
          <motion.div style={{ y: lift }} className="mx-auto text-center">
            {titleComponent}
          </motion.div>
        ) : null}

        <motion.div
          style={{ rotateX, scale }}
          className="w-full will-change-transform"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
