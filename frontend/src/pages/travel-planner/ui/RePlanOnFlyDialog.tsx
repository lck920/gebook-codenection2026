import { useState } from "react";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { toastManager } from "@/shared/ui/toast";

interface RePlanOnFlyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriggerAgentPrompt?: (prompt: string) => void;
  tripTitle?: string;
}

interface ScenarioOption {
  id: string;
  icon: string;
  title: string;
  description: string;
  suggestedPrompt: string;
  badge: string;
}

const SCENARIOS: ScenarioOption[] = [
  {
    id: "flight_delay",
    icon: "✈️",
    title: "Flight Delayed / Schedule Shift",
    description: "Flight or train delayed by a few hours. Push today's activities back or shift dinner.",
    suggestedPrompt: "My flight is delayed by 3 hours. Please adjust today's schedule: push afternoon activities by 3 hours and suggest a late dinner spot nearby.",
    badge: "Most Common",
  },
  {
    id: "bad_weather",
    icon: "🌧️",
    title: "Bad Weather / Rainy Day",
    description: "Rain or storm forecasted. Swap outdoor walking tours for indoor museums, cafes, and galleries.",
    suggestedPrompt: "It looks like it will rain tomorrow. Please replace all outdoor activities tomorrow with indoor attractions, cozy cafes, and museums nearby.",
    badge: "Weather Alert",
  },
  {
    id: "attraction_closed",
    icon: "🔒",
    title: "Attraction Closed / Overbooked",
    description: "A planned spot is unexpectedly closed or tickets are sold out. Find the best alternative.",
    suggestedPrompt: "Our planned stop is closed today. Please suggest the best alternative landmark or activity within walking distance and adjust our itinerary.",
    badge: "Quick Swap",
  },
  {
    id: "budget_adjust",
    icon: "💰",
    title: "Over Budget / Optimize Costs",
    description: "We spent more than planned on lodging/transport. Rebalance remaining days with free/low-cost gems.",
    suggestedPrompt: "We are currently 20% over budget. Please optimize the remaining days with budget-friendly food spots, free viewpoints, and transit-accessible stops.",
    badge: "Cost Saver",
  },
  {
    id: "fatigue_rest",
    icon: "☕",
    title: "Too Tired / Need A Rest Afternoon",
    description: "Group is exhausted. Lighten the schedule and schedule relaxation time.",
    suggestedPrompt: "The group is feeling tired. Please lighten today's schedule to just 1 relaxed stop and suggest a quiet park or tea house.",
    badge: "Pace Adjust",
  },
];

export function RePlanOnFlyDialog({
  open,
  onOpenChange,
  onTriggerAgentPrompt,
  tripTitle = "Trip",
}: RePlanOnFlyDialogProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>(SCENARIOS[0]!.id);
  const [customNote, setCustomNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === selectedScenario) ?? SCENARIOS[0]!;

  function handleRePlan() {
    setIsProcessing(true);
    const finalPrompt = customNote
      ? `${scenario.suggestedPrompt} Extra note: ${customNote}`
      : scenario.suggestedPrompt;

    setTimeout(() => {
      setIsProcessing(false);
      onOpenChange(false);
      if (onTriggerAgentPrompt) {
        onTriggerAgentPrompt(finalPrompt);
      }
      toastManager.add({
        title: "⚡ Re-plan triggered!",
        description: `Gebook AI assistant is adjusting the itinerary for: "${scenario.title}"`,
        type: "success",
      });
    }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md rounded-3xl p-6 sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-xl text-amber-500">
                ⚡
              </span>
              <div>
                <DialogTitle className="font-heading text-xl font-bold">
                  Re-Plan on the Fly
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Things changed unexpectedly? Let Gebook AI instantly restructure your plan in seconds.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scenario Selection Grid */}
          <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {SCENARIOS.map((item) => {
              const isSelected = item.id === selectedScenario;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedScenario(item.id)}
                  className={`wf-tactile-card w-full rounded-2xl border p-3 text-left transition-all ${
                    isSelected
                      ? "border-brand bg-brand-ice/40 shadow-sm ring-2 ring-brand/30 dark:bg-brand-midnight"
                      : "border-border/80 bg-card hover:border-brand/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-xs font-bold text-foreground">
                            {item.title}
                          </h4>
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-bold text-brand">
                            {item.badge}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        isSelected
                          ? "border-brand bg-brand text-white"
                          : "border-border bg-background"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional Custom Instructions Input */}
          <div className="mt-3">
            <label className="text-xs font-bold text-foreground">
              Additional details / notes for AI (Optional):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Flight LH452 is delayed until 4:30 PM..."
              className="mt-1 w-full rounded-2xl border border-input bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
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
              disabled={isProcessing}
              onClick={handleRePlan}
              className="wf-tactile-btn rounded-2xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand/90"
            >
              {isProcessing ? "Re-Planning…" : "⚡ Execute AI Re-Plan →"}
            </button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
