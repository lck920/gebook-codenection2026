import { ReplyIcon } from "lucide-react";
import { cn, interactive } from "@/shared/lib";

/**
 * Hover-revealed reply control. Parent must use `group` (and typically
 * `relative`) so `group-hover` / `group-focus-within` can show the button —
 * same pattern as the note expand control in StopDetail.
 */
export function ReplyHoverButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground",
        "pointer-events-none opacity-0 transition-[opacity,background-color,color,scale] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        "group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        "hover:bg-accent hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100",
        interactive,
        className,
      )}
    >
      <ReplyIcon className="size-3.5" aria-hidden />
    </button>
  );
}
