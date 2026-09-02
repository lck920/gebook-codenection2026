export interface ExpenseAnalysis {
  totalAmount: number;
  currency: string;
  categoryBreakdown: Record<string, number>;
  categoryPercentages: Record<string, number>;
  topCategory: string;
  insights: string[];
  costSavingTips: string[];
}

export interface FairSplitSuggestion {
  memberId: string;
  memberName: string;
  paidAmount: number;
  netBalance: number; // positive = owed money, negative = owes money
  suggestedTransfers: Array<{
    from: string;
    to: string;
    amount: number;
    currency: string;
  }>;
}

export class FinanceAiService {
  /**
   * Analyzes an array of expenses for budget health and generates smart insights.
   */
  public analyzeExpenses(
    expenses: Array<{ category: string; amount: number; title: string }>,
    currency = "USD",
    budgetLimit?: number,
  ): ExpenseAnalysis {
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryBreakdown: Record<string, number> = {};

    for (const exp of expenses) {
      const cat = exp.category || "other";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + exp.amount;
    }

    const categoryPercentages: Record<string, number> = {};
    let topCategory = "lodging";
    let topCategoryAmount = 0;

    for (const [cat, amt] of Object.entries(categoryBreakdown)) {
      categoryPercentages[cat] = totalAmount > 0 ? Math.round((amt / totalAmount) * 100) : 0;
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    }

    const insights: string[] = [];
    const costSavingTips: string[] = [];

    if (totalAmount === 0) {
      insights.push("No expenses logged yet. Add your flights, lodging, or food to start tracking.");
    } else {
      insights.push(
        `Highest spend is currently in "${topCategory}" (${categoryPercentages[topCategory] || 0}% of total).`,
      );

      if (categoryPercentages["food"] && categoryPercentages["food"] > 35) {
        costSavingTips.push("Dining accounts for over 35% of total budget. Consider booking a group meal plan or visiting local market stalls.");
      }

      if (categoryPercentages["transport"] && categoryPercentages["transport"] > 25) {
        costSavingTips.push("Transit costs are relatively high. Multi-day regional rail or transit passes can save up to 20%.");
      }

      if (budgetLimit && totalAmount > budgetLimit) {
        insights.push(`⚠️ Total spending exceeds planned budget limit by ${currency} ${(totalAmount - budgetLimit).toLocaleString()}.`);
      } else if (budgetLimit) {
        const remaining = budgetLimit - totalAmount;
        insights.push(`✅ Within budget! Remaining buffer: ${currency} ${remaining.toLocaleString()}.`);
      }
    }

    if (costSavingTips.length === 0) {
      costSavingTips.push("Group spending is well balanced across categories.");
    }

    return {
      totalAmount,
      currency,
      categoryBreakdown,
      categoryPercentages,
      topCategory,
      insights,
      costSavingTips,
    };
  }

  /**
   * Generates fair settlement transfers minimizing transaction count.
   */
  public calculateSmartSettleUp(
    members: Array<{ id: string; name: string }>,
    expenses: Array<{
      paidById: string;
      amount: number;
      splitMembers?: string[];
      currency: string;
    }>,
    currency = "USD",
  ): FairSplitSuggestion[] {
    const balances: Record<string, number> = {};
    const paidTotals: Record<string, number> = {};

    for (const m of members) {
      balances[m.id] = 0;
      paidTotals[m.id] = 0;
    }

    for (const exp of expenses) {
      paidTotals[exp.paidById] = (paidTotals[exp.paidById] ?? 0) + exp.amount;
      const splitWith = exp.splitMembers && exp.splitMembers.length > 0
        ? exp.splitMembers
        : members.map((m) => m.id);

      const splitShare = exp.amount / splitWith.length;

      // Payer gets credit
      balances[exp.paidById] = (balances[exp.paidById] ?? 0) + exp.amount;

      // Debtors owe their share
      for (const debtorId of splitWith) {
        balances[debtorId] = (balances[debtorId] ?? 0) - splitShare;
      }
    }

    // Minimized settlement transfers
    const debtors: Array<{ id: string; amount: number }> = [];
    const creditors: Array<{ id: string; amount: number }> = [];

    for (const [id, bal] of Object.entries(balances)) {
      if (bal < -0.01) {
        debtors.push({ id, amount: -bal });
      } else if (bal > 0.01) {
        creditors.push({ id, amount: bal });
      }
    }

    const transfers: Array<{ from: string; to: string; amount: number; currency: string }> = [];

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx]!;
      const creditor = creditors[cIdx]!;
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      transfers.push({
        from: debtor.id,
        to: creditor.id,
        amount: Math.round(settleAmount * 100) / 100,
        currency,
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount < 0.01) dIdx++;
      if (creditor.amount < 0.01) cIdx++;
    }

    return members.map((m) => ({
      memberId: m.id,
      memberName: m.name,
      paidAmount: paidTotals[m.id] ?? 0,
      netBalance: Math.round((balances[m.id] ?? 0) * 100) / 100,
      suggestedTransfers: transfers.filter((t) => t.from === m.id || t.to === m.id),
    }));
  }
}
