import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

const currentMonth = () => new Date().toISOString().slice(0, 10);

const getCashflowSummary = async (userId: number, month: string) => {
  const [incomeResult, transferResult] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_income
       FROM income
       WHERE user_id = $2
         AND DATE_TRUNC('month', allocation_month) = DATE_TRUNC('month', $1::date)`,
      [month, userId]
    ),
    pool.query(
      `SELECT
          COALESCE(SUM(CASE WHEN transfer_type = 'investment_contribution' THEN amount ELSE 0 END), 0) AS total_invested,
          COALESCE(SUM(CASE WHEN transfer_type = 'investment_withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawn
       FROM transfers
       WHERE user_id = $2
         AND DATE_TRUNC('month', effective_month) = DATE_TRUNC('month', $1::date)`,
      [month, userId]
    )
  ]);

  const totalIncome = parseFloat(incomeResult.rows[0].total_income);
  const totalInvested = parseFloat(transferResult.rows[0].total_invested);
  const totalWithdrawn = parseFloat(transferResult.rows[0].total_withdrawn);

  return {
    total_income: totalIncome,
    total_invested: totalInvested,
    total_withdrawn: totalWithdrawn,
    available_budget: totalIncome - totalInvested + totalWithdrawn
  };
};

// GET dashboard data
router.get('/', async (req, res) => {
  try {
    const month = currentMonth();
    const userId = getUserId(req);

    const [categorySummary, dailySpending, totalResult, budgetResult, keywordsResult, cashflowSummary] =
      await Promise.all([
        pool.query(
          `SELECT c.name, c.icon, c.color,
                  COALESCE(mcb.budget_amount, c.monthly_budget, 0) AS monthly_budget,
                  COALESCE(SUM(e.amount), 0) AS total_spent,
                  COUNT(e.id) AS transaction_count
           FROM categories c
           LEFT JOIN monthly_category_budgets mcb
             ON mcb.category_id = c.id
            AND DATE_TRUNC('month', mcb.month) = DATE_TRUNC('month', $1::date)
           LEFT JOIN expenses e
             ON c.id = e.category_id
            AND e.user_id = $2
            AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', $1::date)
           WHERE c.user_id = $2
           GROUP BY c.id, mcb.budget_amount
           ORDER BY total_spent DESC`,
          [month, userId]
        ),
        pool.query(
          `SELECT DATE(date) AS day, COALESCE(SUM(amount), 0) AS daily_total
           FROM expenses
           WHERE user_id = $1
             AND date >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY DATE(date)
           ORDER BY day`
          , [userId]
        ),
        pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM expenses
           WHERE user_id = $2
             AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $1::date)`,
          [month, userId]
        ),
        pool.query(
          `SELECT COALESCE(SUM(COALESCE(mcb.budget_amount, c.monthly_budget, 0)), 0) AS total_budget
           FROM categories c
           LEFT JOIN monthly_category_budgets mcb
             ON mcb.category_id = c.id
            AND DATE_TRUNC('month', mcb.month) = DATE_TRUNC('month', $1::date)
           WHERE c.user_id = $2`,
          [month, userId]
        ),
        pool.query(
          `SELECT description, COUNT(*) AS frequency, AVG(amount) AS avg_amount
           FROM expenses
           WHERE user_id = $1
             AND description IS NOT NULL
             AND description != ''
           GROUP BY description
           ORDER BY frequency DESC
           LIMIT 10`,
          [userId]
        ),
        getCashflowSummary(userId, month)
      ]);

    const totalSpent = parseFloat(totalResult.rows[0].total);
    const totalBudget = parseFloat(budgetResult.rows[0].total_budget);
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - new Date().getDate();

    res.json({
      category_summary: categorySummary.rows,
      daily_spending: dailySpending.rows,
      total_spent: totalSpent,
      total_budget: totalBudget,
      days_left: daysLeft,
      budget_percentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      top_keywords: keywordsResult.rows,
      cashflow_summary: {
        ...cashflowSummary,
        remaining_budget: cashflowSummary.available_budget - totalSpent
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET money health score
router.get('/health-score', async (req, res) => {
  try {
    const month = currentMonth();
    const userId = getUserId(req);
    const [expensesResult, budgetResult, cashflowSummary] = await Promise.all([
      pool.query(
        `SELECT e.amount, e.is_impulse, e.item_type, c.name AS category_name
         FROM expenses e
         JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = $2
           AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', $1::date)`,
        [month, userId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(COALESCE(mcb.budget_amount, c.monthly_budget, 0)), 0) AS total_budget
         FROM categories c
         LEFT JOIN monthly_category_budgets mcb
           ON mcb.category_id = c.id
          AND DATE_TRUNC('month', mcb.month) = DATE_TRUNC('month', $1::date)
         WHERE c.user_id = $2`,
        [month, userId]
      ),
      getCashflowSummary(userId, month)
    ]);

    const expenses = expensesResult.rows;
    const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalBudget = parseFloat(budgetResult.rows[0].total_budget);
    const spendableBudget = cashflowSummary.available_budget;

    let score = 0;
    const breakdown = {
      goodRatio: 0,
      withinBudget: 0,
      lowImpulse: 0,
      trendingDown: 0,
      savingsGoal: 0
    };

    const goodCategories = ['Health', 'Transport'];
    const goodSpending = expenses
      .filter((expense) => goodCategories.includes(expense.category_name) || expense.item_type === 'investment')
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    if (totalSpent > 0) {
      breakdown.goodRatio = Math.round((goodSpending / totalSpent) * 30);
      score += breakdown.goodRatio;
    }

    if (totalSpent <= totalBudget) {
      breakdown.withinBudget = 20;
      score += 20;
    } else if (totalSpent <= totalBudget * 1.2) {
      breakdown.withinBudget = 10;
      score += 10;
    }

    const impulseTotal = expenses
      .filter((expense) => expense.is_impulse)
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    if (totalSpent > 0) {
      const impulseRatio = impulseTotal / totalSpent;
      if (impulseRatio < 0.1) {
        breakdown.lowImpulse = 20;
        score += 20;
      } else if (impulseRatio < 0.2) {
        breakdown.lowImpulse = 10;
        score += 10;
      }
    }

    breakdown.trendingDown = 10;
    score += 10;

    if (spendableBudget > 0 && spendableBudget >= totalSpent) {
      const savingsRate = (spendableBudget - totalSpent) / spendableBudget;
      breakdown.savingsGoal = savingsRate > 0.2 ? 15 : Math.round(savingsRate * 75);
      score += breakdown.savingsGoal;
    }

    score = Math.min(100, Math.max(0, score));

    const profile =
      score >= 80
        ? { grade: 'A', label: 'Excellent', emoji: '💚' }
        : score >= 60
        ? { grade: 'B', label: 'Good', emoji: '🟢' }
        : score >= 40
        ? { grade: 'C', label: 'Fair', emoji: '🟡' }
        : { grade: 'D', label: 'At Risk', emoji: '🔴' };

    res.json({
      score,
      ...profile,
      breakdown,
      total_income: cashflowSummary.total_income,
      total_spent: totalSpent,
      total_budget: totalBudget,
      available_budget: spendableBudget
    });
  } catch (error) {
    console.error('Error calculating health score:', error);
    res.status(500).json({ error: 'Failed to calculate health score' });
  }
});

// GET streak data
router.get('/streak', async (req, res) => {
  try {
    const userId = getUserId(req);
    const currentStreakResult = await pool.query(`
      WITH consecutive_days AS (
        SELECT
          DATE(date) AS expense_date,
          DATE(date) - ROW_NUMBER() OVER (ORDER BY DATE(date)) AS grp
        FROM expenses
        WHERE user_id = $1
          AND DATE(date) <= CURRENT_DATE
      )
      SELECT COUNT(*) AS streak
      FROM consecutive_days
      WHERE grp = (SELECT MAX(grp) FROM consecutive_days WHERE expense_date = CURRENT_DATE)
    `, [userId]);

    const longestStreakResult = await pool.query(`
      WITH consecutive_days AS (
        SELECT
          DATE(date) AS expense_date,
          DATE(date) - ROW_NUMBER() OVER (ORDER BY DATE(date)) AS grp
        FROM expenses
        WHERE user_id = $1
      ),
      streaks AS (
        SELECT grp, COUNT(*) AS streak_length
        FROM consecutive_days
        GROUP BY grp
      )
      SELECT MAX(streak_length) AS longest_streak
      FROM streaks
    `, [userId]);

    const currentStreak = parseInt(currentStreakResult.rows[0]?.streak || '0', 10);
    const longestStreak = parseInt(longestStreakResult.rows[0]?.longest_streak || '0', 10);

    res.json({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      message:
        currentStreak > 0
          ? `🔥 ${currentStreak} day${currentStreak > 1 ? 's' : ''} in a row — keep logging!`
          : 'Start your streak today!'
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch streak data' });
  }
});

// GET consolidated money map
router.get('/money-map', async (req, res) => {
  try {
    const userId = getUserId(req);
    const [monthlyResult, movementResult] = await Promise.all([
      pool.query(`
        WITH income_by_month AS (
          SELECT DATE_TRUNC('month', allocation_month)::date AS month, COALESCE(SUM(amount), 0) AS total_income
          FROM income
          WHERE user_id = $1
          GROUP BY 1
        ),
        transfer_by_month AS (
          SELECT
            DATE_TRUNC('month', effective_month)::date AS month,
            COALESCE(SUM(CASE WHEN transfer_type = 'investment_contribution' THEN amount ELSE 0 END), 0) AS total_invested,
            COALESCE(SUM(CASE WHEN transfer_type = 'investment_withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawn
          FROM transfers
          WHERE user_id = $1
          GROUP BY 1
        ),
        expense_by_month AS (
          SELECT DATE_TRUNC('month', date)::date AS month, COALESCE(SUM(amount), 0) AS total_spent
          FROM expenses
          WHERE user_id = $1
          GROUP BY 1
        ),
        months AS (
          SELECT month FROM income_by_month
          UNION
          SELECT month FROM transfer_by_month
          UNION
          SELECT month FROM expense_by_month
        )
        SELECT
          months.month,
          COALESCE(i.total_income, 0) AS total_income,
          COALESCE(t.total_invested, 0) AS total_invested,
          COALESCE(t.total_withdrawn, 0) AS total_withdrawn,
          COALESCE(e.total_spent, 0) AS total_spent,
          COALESCE(i.total_income, 0) - COALESCE(t.total_invested, 0) + COALESCE(t.total_withdrawn, 0) AS spendable_budget,
          (COALESCE(i.total_income, 0) - COALESCE(t.total_invested, 0) + COALESCE(t.total_withdrawn, 0)) - COALESCE(e.total_spent, 0) AS month_balance
        FROM months
        LEFT JOIN income_by_month i ON i.month = months.month
        LEFT JOIN transfer_by_month t ON t.month = months.month
        LEFT JOIN expense_by_month e ON e.month = months.month
        ORDER BY months.month DESC
        LIMIT 12
      `, [userId]),
      pool.query(`
        SELECT *
        FROM (
          SELECT
            'income' AS movement_type,
            source AS title,
            COALESCE(description, source) AS detail,
            amount,
            date AS movement_date
          FROM income
          WHERE user_id = $1

          UNION ALL

          SELECT
            'expense' AS movement_type,
            c.name AS title,
            COALESCE(e.description, c.name) AS detail,
            e.amount,
            e.date AS movement_date
          FROM expenses e
          JOIN categories c ON c.id = e.category_id
          WHERE e.user_id = $1

          UNION ALL

          SELECT
            COALESCE(transfer_type, 'transfer') AS movement_type,
            CASE
              WHEN transfer_type = 'investment_contribution' THEN 'Moved to investment'
              WHEN transfer_type = 'investment_withdrawal' THEN 'Returned from investment'
              ELSE 'Transfer'
            END AS title,
            COALESCE(description, from_account || ' to ' || to_account) AS detail,
            amount,
            COALESCE(transfer_date, created_at) AS movement_date
          FROM transfers
          WHERE user_id = $1
        ) movement_feed
        ORDER BY movement_date DESC
        LIMIT 40
      `, [userId])
    ]);

    res.json({
      monthly_summary: monthlyResult.rows,
      recent_movements: movementResult.rows
    });
  } catch (error) {
    console.error('Error fetching money map:', error);
    res.status(500).json({ error: 'Failed to fetch money map' });
  }
});

export default router;
