import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib";

export interface TabItem {
  value: string;
  label: string;
  /** When provided, the tab collapses to an icon-only square unless selected. */
  icon?: LucideIcon;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
  static?: boolean;
}

/**
 * Segmented tabs (roving via native buttons). Controlled.
 *
 * When items carry an `icon`, the strip behaves like an expandable icon switch:
 * inactive tabs shrink to an icon-only square while the active tab expands to
 * reveal its label. The reveal animates the label's `max-width`/`opacity`/
 * `margin` so the surrounding button width follows content smoothly, and only
 * GPU-friendly properties drive the segment itself.
 */
export function Tabs({
  items,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
  static: isStatic,
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-secondary p-0.5 shadow-[var(--shadow-border)]",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-md px-2 text-xs font-medium",
              "transition-[background-color,color,box-shadow,scale] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
              "after:absolute after:-inset-y-1 after:content-['']",
              selected
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
              !isStatic && "active:scale-[var(--press-scale)]",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap",
                "transition-[max-width,opacity,margin] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
                Icon
                  ? selected
                    ? "ml-1.5 max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                  : "max-w-[160px] opacity-100",
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
