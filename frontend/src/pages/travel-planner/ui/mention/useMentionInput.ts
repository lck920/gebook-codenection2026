import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import {
  buildMentionCandidates,
  filterMentionCandidates,
  type MentionCandidate,
} from "./candidates";
import { detectMention, type ActiveMention } from "./detectMention";

type TextField = HTMLInputElement | HTMLTextAreaElement;

/**
 * Shared `@`-mention state for composers (agent chat + stop comments).
 * Token must be the member full name so the backend `parseMemberMentions`
 * matcher stays aligned.
 */
export function useMentionInput({
  trip,
  value,
  setValue,
  inputRef,
  listId,
  includeAgent = true,
}: {
  trip: Trip;
  value: string;
  setValue: (next: string) => void;
  inputRef: React.RefObject<TextField | null>;
  listId: string;
  includeAgent?: boolean;
}) {
  const { t } = useTranslation("agent");
  const [mention, setMention] = useState<ActiveMention | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingCaretRef = useRef<number | null>(null);

  const candidates = useMemo(
    () =>
      buildMentionCandidates(trip, t("panel.agentName"), { includeAgent }),
    [trip, t, includeAgent],
  );

  const items = useMemo(() => {
    if (!mention) return [];
    return filterMentionCandidates(candidates, mention.query);
  }, [mention, candidates]);

  const open = mention !== null && items.length > 0;

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useLayoutEffect(() => {
    if (pendingCaretRef.current === null) return;
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current);
    }
    pendingCaretRef.current = null;
  }, [value, inputRef]);

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      if (!mention) return;
      const el = inputRef.current;
      const caret = el?.selectionStart ?? value.length;
      const before = value.slice(0, mention.start);
      const after = value.slice(caret);
      const inserted = `@${candidate.token} `;
      setValue(before + inserted + after);
      setMention(null);
      pendingCaretRef.current = before.length + inserted.length;
    },
    [mention, value, setValue, inputRef],
  );

  const syncFromInput = useCallback(
    (next: string, caret: number, opts?: { pasted?: boolean }) => {
      setMention(opts?.pasted ? null : detectMention(next, caret));
      setActiveIndex(0);
    },
    [],
  );

  const dismiss = useCallback(() => setMention(null), []);

  /** Returns true when the key event was consumed by the mention list. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<TextField>): boolean => {
      if (!open) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.nativeEvent.isComposing)) {
        e.preventDefault();
        insertMention(items[activeIndex] ?? items[0]!);
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return true;
      }
      return false;
    },
    [open, items, activeIndex, insertMention],
  );

  const optionId = useCallback(
    (index: number) => `${listId}-option-${index}`,
    [listId],
  );

  const aria = {
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-autocomplete": "list" as const,
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": open ? optionId(activeIndex) : undefined,
  };

  return {
    open,
    items,
    activeIndex,
    setActiveIndex,
    listRef,
    listId,
    insertMention,
    syncFromInput,
    dismiss,
    onKeyDown,
    optionId,
    aria,
  };
}
