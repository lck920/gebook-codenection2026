import { useState } from "react";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogViewport,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { toastManager } from "@/shared/ui/toast";
import { cn, VISUAL_VIEWPORT_FIXED_CLASS } from "@/shared/lib";

interface GroupPreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripTitle?: string;
  memberCount?: number;
}

interface MemberVote {
  id: string;
  name: string;
  avatar: string;
  budgetStyle: "economy" | "balanced" | "luxury";
  pace: "chill" | "moderate" | "fast";
  topTags: string[];
}

const SAMPLE_MEMBERS: MemberVote[] = [
  {
    id: "1",
    name: "Alex (You)",
    avatar: "🧑‍💻",
    budgetStyle: "balanced",
    pace: "moderate",
    topTags: ["Foodie", "Nature", "Photography"],
  },
  {
    id: "2",
    name: "Sarah",
    avatar: "👩‍🎨",
    budgetStyle: "balanced",
    pace: "chill",
    topTags: ["Cafes", "Culture", "Relaxation"],
  },
  {
    id: "3",
    name: "Marcus",
    avatar: "🏃‍♂️",
    budgetStyle: "economy",
    pace: "fast",
    topTags: ["Adventure", "Hiking", "Nightlife"],
  },
];

const AVAILABLE_TAGS = [
  "Foodie", "Nature", "Photography", "Cafes", "Culture", 
  "Relaxation", "Adventure", "Hiking", "Nightlife", "Shopping", "Historical"
];

export function GroupPreferencesModal({
  open,
  onOpenChange,
  tripTitle = "Trip",
  memberCount = 3,
}: GroupPreferencesModalProps) {
  const [myBudget, setMyBudget] = useState<"economy" | "balanced" | "luxury">("balanced");
  const [myPace, setMyPace] = useState<"chill" | "moderate" | "fast">("moderate");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Foodie", "Nature", "Photography"]);
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  }

  function handleSave() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toastManager.add({
        title: "Group preferences synced!",
        description: "AI agent updated itinerary recommendations based on group consensus.",
        type: "success",
      });
      onOpenChange(false);
    }, 400);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-[opacity] duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogViewport
          className={cn(
            VISUAL_VIEWPORT_FIXED_CLASS,
            "z-50 flex items-center justify-center overflow-y-auto p-4 md:p-6",
          )}
        >
        <DialogPopup className="max-h-[min(92%,760px)] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-6 shadow-[var(--shadow-border),var(--shadow-lg)] outline-none transition-[opacity,scale] duration-200 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <div>
                <DialogTitle className="font-heading text-xl font-bold">
                  Group Preferences & Consensus
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Sync preferences across {memberCount} members to harmonize budget and itinerary pace.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Group Consensus Score Card */}
          <div className="mt-3 rounded-2xl border border-brand-cyan/40 bg-gradient-to-r from-brand-ice/40 to-brand-sky/20 p-4 dark:bg-brand-midnight">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-brand">Group Alignment Score</p>
                <h4 className="font-heading text-2xl font-bold text-foreground">
                  88% Match
                </h4>
              </div>
              <div className="flex -space-x-2">
                {SAMPLE_MEMBERS.map((m) => (
                  <div
                    key={m.id}
                    className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-card text-base shadow-sm dark:border-midnight"
                    title={m.name}
                  >
                    {m.avatar}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              🎯 Consensus: <strong>Balanced budget</strong> with <strong>Scenic cafes + Nature hikes</strong>.
            </p>
          </div>

          {/* My Preferences Form */}
          <div className="space-y-4 pt-2">
            {/* Budget Style Selector */}
            <div>
              <label className="text-xs font-bold text-foreground">
                Your Budget Comfort Range
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  { key: "economy", label: "Budget-Friendly", desc: "Hostels & street eats" },
                  { key: "balanced", label: "Balanced", desc: "3-4★ hotels & casual spots" },
                  { key: "luxury", label: "Premium / Luxury", desc: "Top stays & fine dining" },
                ].map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setMyBudget(b.key as any)}
                    className={`rounded-2xl border p-2.5 text-left transition-all ${
                      myBudget === b.key
                        ? "border-brand bg-brand-ice/40 font-bold text-brand ring-2 ring-brand/30 dark:bg-brand-midnight"
                        : "border-border/80 bg-card text-muted-foreground hover:border-brand/40"
                    }`}
                  >
                    <p className="text-xs font-bold">{b.label}</p>
                    <p className="text-[10px] opacity-80">{b.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Pace */}
            <div>
              <label className="text-xs font-bold text-foreground">
                Preferred Travel Pace
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  { key: "chill", label: "Relaxed ☕", desc: "1-2 stops/day" },
                  { key: "moderate", label: "Moderate 🚶", desc: "3-4 stops/day" },
                  { key: "fast", label: "Action-Packed ⚡", desc: "5+ stops/day" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setMyPace(p.key as any)}
                    className={`rounded-2xl border p-2 text-center transition-all ${
                      myPace === p.key
                        ? "border-brand bg-brand-ice/40 font-bold text-brand ring-2 ring-brand/30 dark:bg-brand-midnight"
                        : "border-border/80 bg-card text-muted-foreground hover:border-brand/40"
                    }`}
                  >
                    <p className="text-xs font-bold">{p.label}</p>
                    <p className="text-[10px] opacity-80">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Tags */}
            <div>
              <label className="text-xs font-bold text-foreground">
                Your Interests & Vibes (Select all that apply)
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "bg-brand text-white shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-brand/10 hover:text-brand"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/70 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="wf-tactile-btn rounded-2xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand/90"
            >
              {submitting ? "Saving…" : "Save & Sync with Group →"}
            </button>
          </div>
        </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}
