export interface NepalBudgetGuidance {
  bandLabel: string;
  profile: string;
  allocation: {
    essentials: number;
    lifestyle: number;
    savings: number;
    buffer: number;
  };
  categoryTargets: Array<{
    key: string;
    label: string;
    minPct: number;
    maxPct: number;
  }>;
}

export const NEPAL_MINIMUM_MONTHLY_WAGE = 19550;

export const getNepalBudgetGuidance = (monthlyIncome: number): NepalBudgetGuidance => {
  if (monthlyIncome <= 30000) {
    return {
      bandLabel: 'Starter income',
      profile: 'Protect essentials first. Keep lifestyle spending tight and build a small emergency buffer.',
      allocation: { essentials: 60, lifestyle: 15, savings: 20, buffer: 5 },
      categoryTargets: [
        { key: 'Bills', label: 'Bills / rent', minPct: 25, maxPct: 35 },
        { key: 'Food', label: 'Food', minPct: 18, maxPct: 24 },
        { key: 'Transport', label: 'Transport', minPct: 8, maxPct: 12 },
        { key: 'Health', label: 'Health', minPct: 5, maxPct: 8 },
        { key: 'Shopping', label: 'Shopping', minPct: 3, maxPct: 6 },
        { key: 'Entertainment', label: 'Entertainment', minPct: 2, maxPct: 5 }
      ]
    };
  }

  if (monthlyIncome <= 60000) {
    return {
      bandLabel: 'Working household',
      profile: 'A balanced Nepal-style budget usually works best here: control rent and food, then invest steadily.',
      allocation: { essentials: 55, lifestyle: 15, savings: 25, buffer: 5 },
      categoryTargets: [
        { key: 'Bills', label: 'Bills / rent', minPct: 22, maxPct: 30 },
        { key: 'Food', label: 'Food', minPct: 16, maxPct: 22 },
        { key: 'Transport', label: 'Transport', minPct: 7, maxPct: 10 },
        { key: 'Health', label: 'Health', minPct: 5, maxPct: 8 },
        { key: 'Shopping', label: 'Shopping', minPct: 4, maxPct: 8 },
        { key: 'Entertainment', label: 'Entertainment', minPct: 3, maxPct: 6 }
      ]
    };
  }

  if (monthlyIncome <= 100000) {
    return {
      bandLabel: 'Growth income',
      profile: 'You have room to invest harder. Lifestyle can rise, but savings should still be intentional.',
      allocation: { essentials: 50, lifestyle: 18, savings: 27, buffer: 5 },
      categoryTargets: [
        { key: 'Bills', label: 'Bills / rent', minPct: 20, maxPct: 28 },
        { key: 'Food', label: 'Food', minPct: 15, maxPct: 20 },
        { key: 'Transport', label: 'Transport', minPct: 6, maxPct: 10 },
        { key: 'Health', label: 'Health', minPct: 5, maxPct: 9 },
        { key: 'Shopping', label: 'Shopping', minPct: 5, maxPct: 10 },
        { key: 'Entertainment', label: 'Entertainment', minPct: 4, maxPct: 8 }
      ]
    };
  }

  return {
    bandLabel: 'High income',
    profile: 'The main risk here is lifestyle inflation. Keep savings and investment rate high before discretionary spending grows.',
    allocation: { essentials: 45, lifestyle: 20, savings: 30, buffer: 5 },
    categoryTargets: [
      { key: 'Bills', label: 'Bills / rent', minPct: 18, maxPct: 25 },
      { key: 'Food', label: 'Food', minPct: 12, maxPct: 18 },
      { key: 'Transport', label: 'Transport', minPct: 5, maxPct: 9 },
      { key: 'Health', label: 'Health', minPct: 5, maxPct: 10 },
      { key: 'Shopping', label: 'Shopping', minPct: 6, maxPct: 12 },
      { key: 'Entertainment', label: 'Entertainment', minPct: 5, maxPct: 10 }
    ]
  };
};
