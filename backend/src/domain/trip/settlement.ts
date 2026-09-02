import type {
  Balance,
  Budget,
  ExpenseSnapshot,
  MemberSnapshot,
  Settlement,
} from "./types";

/** Compute per-member balances and a minimal settlement plan.
 * Mirrors the prototype: net = paid − fairShare, then greedily match the
 * largest debtor to the largest creditor until cleared. */
export function computeBudget(
  members: readonly MemberSnapshot[],
  expenses: readonly ExpenseSnapshot[],
): Budget {
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  for (const m of members) {
    paid.set(m.id, 0);
    share.set(m.id, 0);
  }

  for (const e of expenses) {
    paid.set(e.payer, (paid.get(e.payer) ?? 0) + e.amount);
    const per = e.amount / e.participants.length;
    for (const p of e.participants) {
      share.set(p, (share.get(p) ?? 0) + per);
    }
  }

  const balances: Balance[] = members.map((m) => {
    const p = paid.get(m.id) ?? 0;
    const s = share.get(m.id) ?? 0;
    return { memberId: m.id, paid: p, share: Math.round(s), net: Math.round(p - s) };
  });

  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.memberId, v: -b.net }))
    .sort((a, b) => b.v - a.v);
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.memberId, v: b.net }))
    .sort((a, b) => b.v - a.v);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const x = Math.min(debtor.v, creditor.v);
    if (x > 0.5) {
      settlements.push({ from: debtor.id, to: creditor.id, amount: Math.round(x) });
    }
    debtor.v -= x;
    creditor.v -= x;
    if (debtor.v < 1) i++;
    if (creditor.v < 1) j++;
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPerson = members.length ? Math.round(total / members.length) : 0;

  return { total, perPerson, balances, settlements };
}
