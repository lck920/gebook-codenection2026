import { cn } from "@/shared/lib";

export function Spinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label ?? "Loading"}
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-border border-t-brand",
        className,
      )}
    />
  );
}
