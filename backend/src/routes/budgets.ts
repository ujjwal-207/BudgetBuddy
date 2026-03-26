import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

const monthOrCurrent = (month?: string) => month || new Date().toISOString().slice(0, 10);

const distributions: Record<string, Record<string, number>> = {
  conservative: {
    Food: 25,
    Bills: 30,
    Transport: 10,
    Health: 10,
    Shopping: 10,
    Entertainment: 5,
    Other: 10
  },
  balanced: {
    Food: 20,
    Bills: 25,
    Transport: 10,
    Health: 10,
    Shopping: 15,
    Entertainment: 10,
    Other: 10
  },
  lifestyle: {
    Food: 15,
    Bills: 20,
    Transport: 10,
    Health: 5,
    Shopping: 25,
    Entertainment: 15,
    Other: 10
  }
};

const getBudgetSummary = async (userId: number, month: string) => {
  const [incomeResult, transferResult, budgetResult] = await Promise.all([
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
    ),
    pool.query(
      `SELECT COALESCE(SUM(COALESCE(mcb.budget_amount, c.monthly_budget, 0)), 0) AS total_budget
       FROM categories c
       LEFT JOIN monthly_category_budgets mcb
         ON mcb.category_id = c.id
        AND DATE_TRUNC('month', mcb.month) = DATE_TRUNC('month', $1::date)
       WHERE c.user_id = $2`,
      [month, userId]
    )
  ]);

  const totalIncome = parseFloat(incomeResult.rows[0].total_income);
  const totalInvested = parseFloat(transferResult.rows[0].total_invested);
  const totalWithdrawn = parseFloat(transferResult.rows[0].total_withdrawn);
  const totalBudget = parseFloat(budgetResult.rows[0].total_budget);
  const availableBudget = totalIncome - totalInvested + totalWithdrawn;

  return {
    month,
    total_income: totalIncome,
    total_invested: totalInvested,
    total_withdrawn: totalWithdrawn,
    available_budget: availableBudget,
    total_budget: totalBudget,
    unallocated_budget: availableBudget - totalBudget,
    savings_rate: totalIncome > 0 ? ((availableBudget - totalBudget) / totalIncome) * 100 : 0,
    is_within_income: totalBudget <= availableBudget
  };
};

// POST distribute budget from spendable income
router.post('/distribute', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const userId = getUserId(req);

    const { month, distribution_type = 'balanced', available_budget } = req.body;
    const selectedMonth = monthOrCurrent(month);
    const selectedDistribution = distributions[distribution_type] || distributions.balanced;

    const summary = await getBudgetSummary(userId, selectedMonth);
    const targetBudget = available_budget !== undefined ? parseFloat(available_budget) : summary.available_budget;

    const categoriesResult = await client.query('SELECT id, name FROM categories WHERE user_id = $1', [userId]);
    const categories = categoriesResult.rows;
    const updates = [];

    for (const [categoryName, percentage] of Object.entries(selectedDistribution)) {
      const category = categories.find((item) => item.name === categoryName);
      if (!category) continue;

      const budgetAmount = (targetBudget * percentage) / 100;
      const updateResult = await client.query(
        `INSERT INTO monthly_category_budgets (month, category_id, budget_amount, updated_at)
         VALUES (DATE_TRUNC('month', $1::date)::date, $2, $3, NOW())
         ON CONFLICT (month, category_id)
         DO UPDATE SET budget_amount = EXCLUDED.budget_amount, updated_at = NOW()
         RETURNING *`,
        [selectedMonth, category.id, budgetAmount]
      );

      updates.push({
        ...updateResult.rows[0],
        category_name: categoryName,
        percentage,
        budget_amount: budgetAmount
      });
    }

    await client.query('COMMIT');

    res.json({
      message: 'Budgets distributed successfully',
      month: selectedMonth,
      distribution_type,
      available_budget: targetBudget,
      budgets: updates
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error distributing budget:', error);
    res.status(500).json({ error: 'Failed to distribute budget' });
  } finally {
    client.release();
  }
});

// GET suggested budget distribution
router.get('/suggest', async (req, res) => {
  try {
    getUserId(req);
    const incomeAmount = parseFloat((req.query.income as string) || '0');
    const investmentAmount = parseFloat((req.query.investment as string) || '0');
    const availableBudget = Math.max(incomeAmount - investmentAmount, 0);

    const suggestions = Object.fromEntries(
      Object.entries(distributions).map(([type, categories]) => [
        type,
        {
          description:
            type === 'conservative'
              ? 'Needs-focused'
              : type === 'balanced'
              ? 'Balanced approach'
              : 'Lifestyle-focused',
          budgets: Object.fromEntries(
            Object.entries(categories).map(([category, percentage]) => [
              category,
              (availableBudget * percentage) / 100
            ])
          )
        }
      ])
    );

    res.json({
      income: incomeAmount,
      investment_amount: investmentAmount,
      available_budget: availableBudget,
      suggestions
    });
  } catch (error) {
    console.error('Error getting budget suggestions:', error);
    res.status(500).json({ error: 'Failed to get budget suggestions' });
  }
});

// GET current budget vs income ratio
router.get('/ratio', async (req, res) => {
  try {
    const userId = getUserId(req);
    const selectedMonth = monthOrCurrent(req.query.month as string | undefined);
    const summary = await getBudgetSummary(userId, selectedMonth);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching budget ratio:', error);
    res.status(500).json({ error: 'Failed to fetch budget ratio' });
  }
});

// GET month plan with category budgets
router.get('/plan', async (req, res) => {
  try {
    const userId = getUserId(req);
    const selectedMonth = monthOrCurrent(req.query.month as string | undefined);
    const [summary, categoriesResult] = await Promise.all([
      getBudgetSummary(userId, selectedMonth),
      pool.query(
        `SELECT c.id, c.name, c.icon, c.color,
                COALESCE(mcb.budget_amount, c.monthly_budget, 0) AS budget_amount
         FROM categories c
         LEFT JOIN monthly_category_budgets mcb
           ON mcb.category_id = c.id
          AND DATE_TRUNC('month', mcb.month) = DATE_TRUNC('month', $1::date)
         WHERE c.user_id = $2
         ORDER BY c.name`,
        [selectedMonth, userId]
      )
    ]);

    res.json({
      ...summary,
      categories: categoriesResult.rows
    });
  } catch (error) {
    console.error('Error fetching budget plan:', error);
    res.status(500).json({ error: 'Failed to fetch budget plan' });
  }
});

// GET monthly surplus / deficit history
router.get('/history', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
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
      budget_by_month AS (
        SELECT
          DATE_TRUNC('month', month)::date AS month,
          COALESCE(SUM(budget_amount), 0) AS total_budget
        FROM monthly_category_budgets
        WHERE category_id IN (SELECT id FROM categories WHERE user_id = $1)
        GROUP BY 1
      ),
      months AS (
        SELECT month FROM income_by_month
        UNION
        SELECT month FROM transfer_by_month
        UNION
        SELECT month FROM budget_by_month
      )
      SELECT
        months.month,
        COALESCE(i.total_income, 0) AS total_income,
        COALESCE(t.total_invested, 0) AS total_invested,
        COALESCE(t.total_withdrawn, 0) AS total_withdrawn,
        COALESCE(b.total_budget, 0) AS total_budget,
        COALESCE(i.total_income, 0) - COALESCE(t.total_invested, 0) + COALESCE(t.total_withdrawn, 0) AS available_budget,
        (COALESCE(i.total_income, 0) - COALESCE(t.total_invested, 0) + COALESCE(t.total_withdrawn, 0)) - COALESCE(b.total_budget, 0) AS surplus_or_deficit
      FROM months
      LEFT JOIN income_by_month i ON i.month = months.month
      LEFT JOIN transfer_by_month t ON t.month = months.month
      LEFT JOIN budget_by_month b ON b.month = months.month
      ORDER BY months.month DESC
      LIMIT 12
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching budget history:', error);
    res.status(500).json({ error: 'Failed to fetch budget history' });
  }
});

export default router;
