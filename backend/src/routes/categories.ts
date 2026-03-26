import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

const monthOrCurrent = (month?: string) => month || new Date().toISOString().slice(0, 10);

// GET all categories
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const selectedMonth = monthOrCurrent(req.query.month as string | undefined);
    const result = await pool.query(
      `SELECT c.*,
              COALESCE(mcb.budget_amount, c.monthly_budget, 0) AS monthly_budget,
              COALESCE(SUM(e.amount), 0) AS spent_this_month
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
       ORDER BY c.name`,
      [selectedMonth, userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST create category
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, icon, color, monthly_budget } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (user_id, name, icon, color, monthly_budget)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, icon, color, monthly_budget]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT update category budget for a month
router.put('/:id/budget', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { monthly_budget, month } = req.body;
    const selectedMonth = monthOrCurrent(month);

    const categoryResult = await pool.query(
      `SELECT id
       FROM categories
       WHERE id = $1
         AND user_id = $2`,
      [id, userId]
    );

    if (categoryResult.rows.length === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO monthly_category_budgets (month, category_id, budget_amount, updated_at)
       VALUES (DATE_TRUNC('month', $1::date)::date, $2, $3, NOW())
       ON CONFLICT (month, category_id)
       DO UPDATE SET budget_amount = EXCLUDED.budget_amount, updated_at = NOW()
       RETURNING *`,
      [selectedMonth, id, monthly_budget]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

export default router;
