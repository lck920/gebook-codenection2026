import { useEffect, useState } from "react";
import { gradientAvatarUrl } from "@/shared/lib";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/shared/ui/tooltip";
import type { UserLocationAvatar } from "./types";

export interface UserLocationMarkerProps {
  avatar: UserLocationAvatar;
  /** Reverse-geocoded place label, or a resolving/fallback string. */
  placeLabel: string;
  /** Epoch ms of the last geolocation update. */
  updatedAt: number;
  locateLabel: string;
  updatedNowLabel: string;
  updatedMinutesLabel: (minutes: number) => string;
  updatedHoursLabel: (hours: number) => string;
  onActivate: () => void;
}

function formatRelative(
  updatedAt: number,
  labels: Pick<
    UserLocationMarkerProps,
    "updatedNowLabel" | "updatedMinutesLabel" | "updatedHoursLabel"
  >,
): string {
  const seconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (seconds < 45) return labels.updatedNowLabel;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return labels.updatedMinutesLabel(minutes);
  return labels.updatedHoursLabel(Math.floor(minutes / 60));
}

/** Live user-location pin: avatar trigger + rich hover tooltip. */
export function UserLocationMarker({
  avatar,
  placeLabel,
  updatedAt,
  locateLabel,
  updatedNowLabel,
  updatedMinutesLabel,
  updatedHoursLabel,
  onActivate,
}: UserLocationMarkerProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const relative = formatRelative(updatedAt, {
    updatedNowLabel,
    updatedMinutesLabel,
    updatedHoursLabel,
  });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="trip-map-user-location"
            aria-label={locateLabel}
            onClick={(ev) => {
              ev.stopPropagation();
              onActivate();
            }}
          />
        }
      >
        <img
          src={avatar.src || gradientAvatarUrl(avatar.seed)}
          alt=""
          draggable={false}
          style={{ background: avatar.bg }}
        />
      </TooltipTrigger>
      <TooltipPopup
        side="top"
        sideOffset={10}
        className="flex max-w-56 flex-col gap-0.5 px-2.5 py-1.5"
      >
        <span className="font-medium text-pretty">{avatar.name}</span>
        <span className="text-pretty opacity-80">{placeLabel}</span>
        <span className="tabular-nums opacity-70">{relative}</span>
      </TooltipPopup>
    </Tooltip>
  );
}
