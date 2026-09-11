import { useState } from "react";
import { type TravellerStats, calculateTravellerStats } from "../model";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

interface TravellerLevelCardProps {
  tripsCount?: number;
  userName?: string;
  onExplore?: () => void;
}

export function TravellerLevelCard({
  tripsCount = 3,
  userName,
  onExplore,
}: TravellerLevelCardProps) {
  const [showBadges, setShowBadges] = useState(false);
  const stats: TravellerStats = calculateTravellerStats(tripsCount);

  return (
    <Card className="wf-tactile-card overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-card via-card to-brand-ice/20 p-6 shadow-sm">
      {/* Header with Streak & Badge toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-brand-cyan/40 bg-brand-cyan/10 font-mono text-xs font-semibold text-brand-midnight dark:text-brand-sky"
          >
            🔥 {stats.streakDays} Day Planning Streak
          </Badge>
          <Badge
            variant="outline"
            className="border-brand/30 bg-brand/10 font-mono text-xs font-semibold text-brand"
          >
            ⚡ {stats.xp} XP
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => setShowBadges(!showBadges)}
          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand"
        >
          {showBadges ? "Hide Badges" : "View Badges 🏆"}
        </button>
      </div>

      {/* Explorer Character Illustration Area */}
      <div className="relative my-4 flex flex-col items-center justify-center py-2 text-center">
        <div className="relative flex size-28 items-center justify-center rounded-3xl bg-gradient-to-tr from-brand-ice via-white to-brand-sky/40 shadow-inner dark:from-card dark:to-brand-midnight">
          {/* Friendly vector traveller avatar */}
          <div className="text-5xl select-none animate-bounce" style={{ animationDuration: "3s" }}>
            🧑‍🌾
          </div>
          <div className="absolute -bottom-2 rounded-full border border-brand/20 bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            LVL {stats.level}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Level {stats.level}
          </p>
          <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {stats.title}
          </h3>
          {userName && (
            <p className="text-xs text-muted-foreground">Welcome back, {userName}!</p>
          )}
        </div>
      </div>

      {/* Level Milestone Step Dots (1 - 2 - 3 - 4 - 5) */}
      <div className="relative my-4 px-4">
        <div className="absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 rounded-full bg-secondary" />
        <div
          className="absolute top-1/2 left-8 h-1 -translate-y-1/2 rounded-full bg-brand transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, ((stats.level - 1) / 4) * 85))}%` }}
        />
        <div className="relative flex justify-between">
          {[1, 2, 3, 4, 5].map((step) => {
            const isCurrent = step === stats.level;
            const isCompleted = step < stats.level;
            return (
              <div
                key={step}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? "scale-110 border-2 border-brand bg-brand-midnight text-white shadow-md ring-4 ring-brand/20 dark:bg-brand dark:text-brand-midnight"
                      : isCompleted
                        ? "border border-brand bg-brand text-white"
                        : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✓" : step}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Stats Box */}
      <div className="mt-5 grid grid-cols-2 divide-x divide-border rounded-2xl border border-border/80 bg-background/80 py-3 text-center backdrop-blur-sm">
        <div className="px-3">
          <p className="text-xs text-muted-foreground">Trips taken this year</p>
          <p className="font-heading text-xl font-bold text-foreground">
            {stats.tripsTakenThisYear}
          </p>
        </div>
        <div className="px-3">
          <p className="text-xs text-muted-foreground">Trips to next level</p>
          <p className="font-heading text-xl font-bold text-brand">
            {stats.tripsToNextLevel === 0 ? "Maxed Out!" : stats.tripsToNextLevel}
          </p>
        </div>
      </div>

      {onExplore && (
        <button
          type="button"
          onClick={onExplore}
          className="wf-tactile-btn mt-4 w-full rounded-2xl bg-brand py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand/90"
        >
          Plan a new trip →
        </button>
      )}

      {/* Badges Drawer / Expandable View */}
      {showBadges && (
        <div className="mt-4 border-t border-border/60 pt-4 wf-enter">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
            Traveller Badges & Trophies
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stats.badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                  badge.unlocked
                    ? "border-brand-cyan/40 bg-brand-ice/30 dark:bg-brand-midnight/60"
                    : "border-border/40 bg-secondary/30 opacity-50 grayscale"
                }`}
              >
                <span className="text-xl">{badge.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    {badge.name}
                  </p>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
