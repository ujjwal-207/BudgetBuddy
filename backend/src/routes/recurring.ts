import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

// GET all recurring expenses
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM recurring_expenses r
      JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = $1
      ORDER BY r.frequency, r.description
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recurring expenses:', error);
    res.status(500).json({ error: 'Failed to fetch recurring expenses' });
  }
});

// POST create recurring expense
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, category_id, description, frequency } = req.body;

    if (!amount || !category_id || !frequency) {
      res.status(400).json({ error: 'Amount, category_id, and frequency are required' });
      return;
    }

    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency.toLowerCase())) {
      res.status(400).json({ error: 'Frequency must be: daily, weekly, or monthly' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO recurring_expenses (amount, category_id, description, frequency) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, amount, category_id, description, frequency]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating recurring expense:', error);
    res.status(500).json({ error: 'Failed to create recurring expense' });
  }
});

// PUT update recurring expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { amount, category_id, description, frequency } = req.body;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (category_id !== undefined) {
      fields.push(`category_id = $${paramIndex++}`);
      values.push(category_id);
    }
    if (description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (frequency !== undefined) {
      fields.push(`frequency = $${paramIndex++}`);
      values.push(frequency);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE recurring_expenses SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recurring expense:', error);
    res.status(500).json({ error: 'Failed to update recurring expense' });
  }
});

// DELETE recurring expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    await pool.query('DELETE FROM recurring_expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Recurring expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    res.status(500).json({ error: 'Failed to delete recurring expense' });
  }
});

// GET monthly total for recurring expenses
router.get('/summary/monthly', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT 
        SUM(CASE WHEN frequency = 'daily' THEN amount * 30 END) as daily_monthly,
        SUM(CASE WHEN frequency = 'weekly' THEN amount * 4 END) as weekly_monthly,
        SUM(CASE WHEN frequency = 'monthly' THEN amount END) as monthly_total,
        SUM(
          CASE 
            WHEN frequency = 'daily' THEN amount * 30 
            WHEN frequency = 'weekly' THEN amount * 4 
            WHEN frequency = 'monthly' THEN amount 
          END
        ) as total_monthly_commitment
      FROM recurring_expenses
      WHERE user_id = $1
    `, [userId]);

    res.json({
      from_daily: parseFloat(result.rows[0].daily_monthly) || 0,
      from_weekly: parseFloat(result.rows[0].weekly_monthly) || 0,
      from_monthly: parseFloat(result.rows[0].monthly_total) || 0,
      total: parseFloat(result.rows[0].total_monthly_commitment) || 0
    });
  } catch (error) {
    console.error('Error calculating recurring total:', error);
    res.status(500).json({ error: 'Failed to calculate recurring total' });
  }
});

export default router;
