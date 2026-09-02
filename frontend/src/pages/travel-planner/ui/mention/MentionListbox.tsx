import { useTranslation } from "react-i18next";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib";
import { AgentAvatar } from "../agent/AgentAvatar";
import { AGENT_TOKEN, type MentionCandidate } from "./candidates";

export function MentionListbox({
  listId,
  listRef,
  items,
  activeIndex,
  onSelect,
  onHover,
  optionId,
}: {
  listId: string;
  listRef: React.Ref<HTMLDivElement>;
  items: MentionCandidate[];
  activeIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
  onHover: (index: number) => void;
  optionId: (index: number) => string;
}) {
  const { t } = useTranslation("agent");

  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={t("mention.listLabel")}
      className="absolute inset-x-3 bottom-full mb-2 max-h-56 overflow-y-auto rounded-lg bg-popover p-1 shadow-[var(--shadow-border),var(--shadow-lg)]"
    >
      {items.map((c, i) => (
        <button
          key={c.key}
          type="button"
          role="option"
          id={optionId(i)}
          aria-selected={i === activeIndex}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(c);
          }}
          onMouseEnter={() => onHover(i)}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
            i === activeIndex
              ? "bg-accent text-accent-foreground"
              : "text-foreground",
          )}
        >
          {c.kind === "agent" ? (
            <AgentAvatar />
          ) : (
            <Avatar
              name={c.member!.name}
              bg={c.member!.avatarBg}
              fg={c.member!.avatarFg}
              src={c.member!.image}
              seed={c.member!.id}
              size={24}
            />
          )}
          <span className="min-w-0 flex-1 truncate">{c.label}</span>
          {c.kind === "agent" ? (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              @{AGENT_TOKEN}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
