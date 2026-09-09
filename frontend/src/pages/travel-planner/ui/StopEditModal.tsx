import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { Trip } from "@/entities/trip";
import type { Stop } from "@/entities/stop";
import type { UpdateStopInput } from "@/shared/api";
import { cn } from "@/shared/lib";
import { StopDetail } from "./StopDetail";

/**
 * Full-screen centered edit modal that wraps `StopDetail`.
 *
 * Opens when the user clicks "Edit" in the `StopDetailModal` view popup.
 * The backdrop blurs the entire screen so the editor stays in focus.
 */
export interface StopEditModalProps {
  trip: Trip;
  stop: Stop | null;
  open: boolean;
  currentUserId: string;
  canEdit: boolean;
  commentPending?: boolean;
  onClose: () => void;
  onToggleVote: (stopId: string) => void;
  onComment: (stopId: string, text: string) => void;
  onUpdateStop: (stopId: string, patch: UpdateStopInput) => void;
  onChangeStopDay: (stopId: string, day: number) => void;
  onExpandNote: (stopId: string) => void;
  onWriteTravelogue: (stopId: string) => void;
  onDeleteStop?: (stopId: string) => void;
}

export function StopEditModal({
  trip,
  stop,
  open,
  currentUserId,
  canEdit,
  commentPending,
  onClose,
  onToggleVote,
  onComment,
  onUpdateStop,
  onChangeStopDay,
  onExpandNote,
  onWriteTravelogue,
  onDeleteStop,
}: StopEditModalProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-out)]",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />

        {/* Viewport — centers the edit card */}
        <DialogPrimitive.Viewport className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
          {stop ? (
            <DialogPrimitive.Popup
              className={cn(
                "relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-card",
                "shadow-[var(--shadow-border),0_25px_50px_-12px_rgb(0_0_0/.35)]",
                "outline-none",
                "transition-[opacity,scale] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
                "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
                "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
                // Tall enough for the full edit form, scrollable inside StopDetail
                "max-h-[min(92dvh,760px)]",
              )}
            >
              <StopDetail
                trip={trip}
                stop={stop}
                currentUserId={currentUserId}
                canEdit={canEdit}
                commentPending={commentPending}
                onClose={onClose}
                onToggleVote={onToggleVote}
                onComment={onComment}
                onUpdateStop={onUpdateStop}
                onChangeStopDay={onChangeStopDay}
                onExpandNote={() => onExpandNote(stop.id)}
                onWriteTravelogue={() => onWriteTravelogue(stop.id)}
                onDeleteStop={
                  onDeleteStop ? () => onDeleteStop(stop.id) : undefined
                }
              />
            </DialogPrimitive.Popup>
          ) : null}
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
