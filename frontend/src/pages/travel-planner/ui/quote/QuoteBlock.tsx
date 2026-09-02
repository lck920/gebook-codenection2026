import { cn } from "@/shared/lib";
import type { ParsedQuote } from "./formatQuote";

/** Inline quote block for rendered comments / chat bubbles. */
export function QuoteBlock({
  quote,
  className,
}: {
  quote: ParsedQuote;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-1 border-l-[3px] border-border-strong pl-2 text-xs leading-snug text-muted-foreground",
        className,
      )}
    >
      {quote.author ? (
        <div className="font-medium text-muted-foreground/90">{quote.author}</div>
      ) : null}
      <p className="whitespace-pre-wrap text-pretty">{quote.text}</p>
    </div>
  );
}
