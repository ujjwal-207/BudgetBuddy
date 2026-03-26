interface ExpenseData {
  category_id: number;
  category_name: string;
  amount: number;
  is_impulse: boolean;
  item_type?: string | null;
  longevity?: string | null;
  mood?: string | null;
  is_need?: boolean | null;
  categoryBudget?: number;
  categorySpent?: number;
  sameDayCount?: number;
}

export function calculateQualityScore(expense: ExpenseData): number {
  let score = 3; // Start with neutral

  const goodCategories = ['Health', 'Transport', 'Education'];
  const necessityTypes = ['necessity', 'investment'];
  const longLongevity = ['year', '5years'];

  // GOOD factors (increase score)
  if (goodCategories.includes(expense.category_name)) {
    score += 1;
  }

  if (expense.item_type && necessityTypes.includes(expense.item_type.toLowerCase())) {
    score += 1;
  }

  if (expense.longevity && longLongevity.some(l => expense.longevity?.toLowerCase().includes(l))) {
    score += 1;
  }

  if (expense.is_need === true) {
    score += 1;
  }

  // Check if under budget
  if (expense.categoryBudget && expense.categorySpent !== undefined) {
    const projectedTotal = expense.categorySpent + expense.amount;
    if (projectedTotal <= expense.categoryBudget) {
      score += 1;
    }
  }

  // BAD factors (decrease score)
  if (expense.is_impulse) {
    score -= 2;
  }

  // Over budget
  if (expense.categoryBudget && expense.categorySpent !== undefined) {
    const projectedTotal = expense.categorySpent + expense.amount;
    if (projectedTotal > expense.categoryBudget) {
      score -= 1;
    }
  }

  // Negative mood spending
  if (expense.mood && ['stressed', 'bored'].includes(expense.mood.toLowerCase())) {
    score -= 1;
  }

  // Multiple same-category purchases in one day
  if (expense.sameDayCount && expense.sameDayCount >= 3) {
    score -= 1;
  }

  // Clamp score between 1 and 5
  return Math.max(1, Math.min(5, score));
}

export function getQualityLabel(score: number): { label: string; emoji: string; color: string } {
  if (score >= 5) {
    return { label: 'Smart Spend', emoji: '🟢', color: '#10b981' };
  } else if (score === 4) {
    return { label: 'Good Buy', emoji: '🟢', color: '#34d399' };
  } else if (score === 3) {
    return { label: 'Neutral', emoji: '🟡', color: '#fbbf24' };
  } else if (score === 2) {
    return { label: 'Watch Out', emoji: '🔴', color: '#f87171' };
  } else {
    return { label: 'Impulse / Luxury', emoji: '⚡', color: '#fb923c' };
  }
}

export function calculateMoneyHealthScore(expenses: any[], budgets: any[], income: number): number {
  let score = 0;

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalBudget = budgets.reduce((sum, b) => sum + (parseFloat(b.monthly_budget) || 0), 0);

  // +30 pts: % of good/investment expenses
  const goodCategories = ['Health', 'Education', 'Transport'];
  const goodSpending = expenses
    .filter(e => goodCategories.includes(e.category_name) || e.item_type === 'investment')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  
  if (totalSpent > 0) {
    const goodRatio = goodSpending / totalSpent;
    score += Math.round(goodRatio * 30);
  }

  // +20 pts: stayed within overall budget
  if (totalSpent <= totalBudget) {
    score += 20;
  } else if (totalSpent <= totalBudget * 1.2) {
    score += 10; // Partial points for being close
  }

  // +20 pts: impulse purchases < 10% of total
  const impulseTotal = expenses
    .filter(e => e.is_impulse)
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  
  if (totalSpent > 0) {
    const impulseRatio = impulseTotal / totalSpent;
    if (impulseRatio < 0.1) {
      score += 20;
    } else if (impulseRatio < 0.2) {
      score += 10;
    }
  }

  // +15 pts: spending trending down vs last month (simplified)
  score += 10; // Placeholder - would need historical comparison

  // +15 pts: has savings (income > budget)
  if (income > totalBudget) {
    score += 15;
  } else if (income > totalSpent) {
    score += 8;
  }

  return Math.min(100, Math.max(0, score));
}

export function getMoneyHealthGrade(score: number): { grade: string; label: string; emoji: string } {
  if (score >= 80) {
    return { grade: 'A', label: 'Excellent', emoji: '💚' };
  } else if (score >= 60) {
    return { grade: 'B', label: 'Good', emoji: '🟢' };
  } else if (score >= 40) {
    return { grade: 'C', label: 'Fair', emoji: '🟡' };
  } else {
    return { grade: 'D', label: 'At Risk', emoji: '🔴' };
  }
}
