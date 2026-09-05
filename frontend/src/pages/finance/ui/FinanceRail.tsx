import { UserPlusIcon } from "lucide-react";
import type { Trip } from "@/entities/trip";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib";
import { personalShare, type FinanceScope } from "../model/finance";

/** Right rail: who has put in what while planning, or who owes what after. */
export function FinanceRail({
  trip,
  mode,
  currentMemberId,
  memberName,
  onAddToPool,
  money,
  canEdit,
}: {
  trip: Trip;
  mode: "budget" | "expenses";
  scope: FinanceScope;
  currentMemberId: string | null;
  memberName: (id: string) => string;
  onAddToPool: () => void;
  money: {
    display: string;
    converted: boolean;
    loading: boolean;
    unavailable: boolean;
    format: (amount: number, from?: string) => string;
    convert: (amount: number, from?: string) => number | null;
  };
  canEdit: boolean;
}) {
  const currency = money.display;

  return (
    <aside className="scrollbar-reveal flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto px-5 py-5.5 max-xl:hidden">
      {mode === "budget" ? (
        <BudgetRail
          trip={trip}
          currency={currency}
          money={money}
          currentMemberId={currentMemberId}
          onAddToPool={onAddToPool}
          canEdit={canEdit}
        />
      ) : (
        <ExpensesRail
          trip={trip}
          currency={currency}
          money={money}
          currentMemberId={currentMemberId}
          memberName={memberName}
        />
      )}
    </aside>
  );
}

function BudgetRail({
  trip,
  currency,
  money,
  currentMemberId,
  onAddToPool,
  canEdit,
}: {
  trip: Trip;
  currency: string;
  money: { format: (amount: number, from?: string) => string };
  currentMemberId: string | null;
  onAddToPool: () => void;
  canEdit: boolean;
}) {
  const share = personalShare(trip, currentMemberId);
  const contribution = (memberId: string) =>
    (trip.contributions ?? []).find((c) => c.memberId === memberId)?.amount ?? 0;

  return (
    <>
      <section>
        <div className="flex items-center gap-2.5">
          <h3 className="font-heading text-base font-bold tracking-tight">
            Pool contributions
          </h3>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {currency}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {trip.members.map((member) => {
            const amount = contribution(member.id);
            return (
              <div
                key={member.id}
                className="flex items-center gap-2.5 rounded-xl bg-muted p-2"
              >
                <Avatar
                  name={member.name}
                  bg={member.avatarBg}
                  fg={member.avatarFg}
                  size={30}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {member.name}
                    {member.id === currentMemberId ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · you
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-px text-[11px] capitalize text-muted-foreground">
                    {member.role}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 font-mono text-[12.5px] font-semibold",
                    amount === 0 && "text-muted-foreground",
                  )}
                >
                  {amount > 0 ? money.format(amount) : "—"}
                </p>
              </div>
            );
          })}

          {trip.intake?.partySize != null &&
          trip.intake.partySize > trip.members.length ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border p-2">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-muted">
                <UserPlusIcon
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">
                  Invite traveller {trip.members.length + 1}
                </p>
                <p className="mt-px text-[11px] text-muted-foreground">
                  Party size is {trip.intake.partySize}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl bg-muted p-4">
        <h3 className="font-heading text-base font-bold tracking-tight">
          Your share
        </h3>
        <dl className="mt-3 flex flex-col gap-2 text-[12.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">You put in</dt>
            <dd className="font-mono font-semibold">
              {money.format(share.contributed)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Your planned stops</dt>
            <dd className="font-mono font-semibold">
              {money.format(share.plannedShare)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <dt className="font-semibold">Still yours</dt>
            <dd
              className={cn(
                "font-mono font-bold",
                share.remaining < 0 && "text-destructive-foreground",
              )}
            >
              {money.format(share.remaining)}
            </dd>
          </div>
        </dl>

        {share.contributed === 0 ? (
          <button
            type="button"
            onClick={onAddToPool}
            disabled={!canEdit}
            className="wf-interactive wf-pressable mt-3 h-9 w-full rounded-xl bg-foreground text-xs font-semibold text-background disabled:opacity-50"
          >
            Add your budget
          </button>
        ) : null}
      </section>
    </>
  );
}

function ExpensesRail({
  trip,
  currency,
  money,
  currentMemberId,
  memberName,
}: {
  trip: Trip;
  currency: string;
  money: { format: (amount: number, from?: string) => string };
  currentMemberId: string | null;
  memberName: (id: string) => string;
}) {
  const { balances, settlements } = trip.budget;

  return (
    <>
      <section>
        <div className="flex items-center gap-2.5">
          <h3 className="font-heading text-base font-bold tracking-tight">
            Balances
          </h3>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {currency}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {balances.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Balances appear once expenses are logged.
            </p>
          ) : (
            balances.map((balance) => {
              const member = trip.members.find((m) => m.id === balance.memberId);
              return (
                <div
                  key={balance.memberId}
                  className="flex items-center gap-2.5 rounded-xl bg-muted p-2"
                >
                  {member ? (
                    <Avatar
                      name={member.name}
                      bg={member.avatarBg}
                      fg={member.avatarFg}
                      size={30}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {memberName(balance.memberId)}
                      {balance.memberId === currentMemberId ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · you
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-px truncate text-[11px] text-muted-foreground">
                      Paid {money.format(balance.paid)} · share{" "}
                      {money.format(balance.share)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 font-mono text-[12.5px] font-semibold",
                      balance.net > 0 && "text-[var(--ok-fg,#0a6f4d)]",
                      balance.net < 0 && "text-destructive-foreground",
                      balance.net === 0 && "text-muted-foreground",
                    )}
                  >
                    {balance.net > 0 ? "+" : balance.net < 0 ? "−" : ""}
                    {money.format(Math.abs(balance.net))}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-muted p-4">
        <h3 className="font-heading text-base font-bold tracking-tight">
          Settle up
        </h3>
        {settlements.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Everyone is square — no transfers needed.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              {settlements.length === 1
                ? "One transfer clears the trip so far."
                : `${settlements.length} transfers clear the trip so far.`}
            </p>
            <div className="mt-2.5 flex flex-col gap-2">
              {settlements.map((settlement, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-[12px]"
                >
                  <span className="truncate font-semibold">
                    {memberName(settlement.from)}
                  </span>
                  <span className="text-muted-foreground" aria-label="pays">
                    →
                  </span>
                  <span className="truncate font-semibold">
                    {memberName(settlement.to)}
                  </span>
                  <span className="ml-auto font-mono font-semibold">
                    {money.format(settlement.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
