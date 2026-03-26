import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';
import { parseNaturalLanguage, getCategoryFromKeywords } from '../utils/parser';
import { calculateQualityScore } from '../utils/scorer';
import { checkImpulsePurchase } from '../utils/impulseDetector';

const router = Router();

interface ExpenseBody {
  amount: number;
  account_id?: number;
  category_id?: number;
  category_name?: string;
  description?: string;
  item_name?: string;
  item_type?: string;
  is_need?: boolean;
  longevity?: string;
  mood?: string;
  payment_method?: string;
  date?: string;
  is_impulse?: boolean;
  natural_input?: string;
}

// POST add expense
router.post('/', async (req: Request<{}, {}, ExpenseBody>, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const userId = getUserId(req);

    let { 
      amount, 
      account_id,
      category_id, 
      category_name, 
      description, 
      item_name, 
      item_type, 
      is_need, 
      longevity, 
      mood, 
      payment_method,
      date,
      is_impulse,
      natural_input
    } = req.body;

    // Handle natural language input
    if (natural_input) {
      const parsed = parseNaturalLanguage(natural_input);
      amount = parsed.amount;
      category_name = parsed.category;
      description = parsed.description || description;
      date = parsed.date.toISOString();
    }

    // Get or create category
    if (category_name && !category_id) {
      const catResult = await client.query(
        'SELECT id FROM categories WHERE name = $1 AND user_id = $2',
        [category_name, userId]
      );
      
      if (catResult.rows.length > 0) {
        category_id = catResult.rows[0].id;
      } else {
        // Create new category if doesn't exist
        const newCatResult = await client.query(
          `INSERT INTO categories (user_id, name, icon, color, monthly_budget) 
           VALUES ($1, $2, '📁', '#999999', 0) 
           RETURNING id`,
          [userId, category_name]
        );
        category_id = newCatResult.rows[0].id;
      }
    }

    if (!category_id) {
      res.status(400).json({ error: 'Category is required' });
      await client.query('ROLLBACK');
      return;
    }

    // Check for impulse purchase
    if (is_impulse === undefined) {
      const impulseCheck = await checkImpulsePurchase(
        userId,
        amount, 
        category_id, 
        mood, 
        date ? new Date(date) : new Date()
      );
      is_impulse = impulseCheck.isImpulse;
    }

    // Get category spending for quality score
    const categorySpentResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE category_id = $1
       AND user_id = $2
       AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [category_id, userId]
    );
    const categorySpent = parseFloat(categorySpentResult.rows[0].total);

    // Get category budget
    const categoryBudgetResult = await client.query(
      'SELECT monthly_budget FROM categories WHERE id = $1 AND user_id = $2',
      [category_id, userId]
    );
    const categoryBudget = categoryBudgetResult.rows[0].monthly_budget 
      ? parseFloat(categoryBudgetResult.rows[0].monthly_budget) 
      : undefined;

    // Calculate quality score
    const quality_score = calculateQualityScore({
      category_id,
      category_name: category_name || '',
      amount,
      is_impulse: is_impulse || false,
      item_type,
      longevity,
      mood,
      is_need,
      categoryBudget,
      categorySpent
    });

    // Insert expense
    const expenseDate = date ? new Date(date) : new Date();
    const result = await client.query(
      `INSERT INTO expenses 
       (user_id, amount, category_id, description, item_name, item_type, is_need, 
        longevity, mood, quality_score, is_impulse, date, account_id, payment_method) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       RETURNING *`,
      [
        userId, amount, category_id, description || null, item_name || null, 
        item_type || null, is_need ?? null, longevity || null, mood || null,
        quality_score, is_impulse || false, expenseDate, account_id || null, payment_method || null
      ]
    );

    if (account_id) {
      await client.query(
        `UPDATE accounts
         SET current_balance = current_balance - $1
         WHERE id = $2`,
        [amount, account_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      ...result.rows[0],
      quality_label: getQualityLabel(quality_score),
      impulse_reasons: is_impulse ? ['Flagged as impulse'] : []
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  } finally {
    client.release();
  }
});

function getQualityLabel(score: number): { label: string; emoji: string; color: string } {
  if (score >= 4) {
    return { label: 'Smart Spend', emoji: '🟢', color: '#4ECDC4' };
  } else if (score === 3) {
    return { label: 'Neutral', emoji: '🟡', color: '#FFE66D' };
  } else {
    return { label: 'Watch Out', emoji: '🔴', color: '#FF6B6B' };
  }
}

// GET expenses with filters
router.get('/', async (req, res) => {
  try {
    const { month, category, limit = 100, offset = 0 } = req.query;
    const userId = getUserId(req);
    
    let query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN accounts a ON e.account_id = a.id
      WHERE e.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (month) {
      query += ` AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', $${paramIndex}::date)`;
      params.push(month as string);
      paramIndex++;
    }

    if (category) {
      query += ` AND c.name = $${paramIndex}`;
      params.push(category as string);
      paramIndex++;
    }

    query += ` ORDER BY e.date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// GET single expense
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              a.name as account_name, a.icon as account_icon
       FROM expenses e
       JOIN categories c ON e.category_id = c.id
       LEFT JOIN accounts a ON e.account_id = a.id
       WHERE e.id = $1
         AND e.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// PATCH update expense
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { 
      amount, category_id, description, item_name, item_type, 
      is_need, longevity, mood, is_impulse, date, payment_method, account_id
    } = req.body;
    const existingExpense = await pool.query('SELECT amount, account_id FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    if (existingExpense.rows.length === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

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
    if (item_name !== undefined) {
      fields.push(`item_name = $${paramIndex++}`);
      values.push(item_name);
    }
    if (item_type !== undefined) {
      fields.push(`item_type = $${paramIndex++}`);
      values.push(item_type);
    }
    if (is_need !== undefined) {
      fields.push(`is_need = $${paramIndex++}`);
      values.push(is_need);
    }
    if (longevity !== undefined) {
      fields.push(`longevity = $${paramIndex++}`);
      values.push(longevity);
    }
    if (mood !== undefined) {
      fields.push(`mood = $${paramIndex++}`);
      values.push(mood);
    }
    if (is_impulse !== undefined) {
      fields.push(`is_impulse = $${paramIndex++}`);
      values.push(is_impulse);
    }
    if (date !== undefined) {
      fields.push(`date = $${paramIndex++}`);
      values.push(date);
    }
    if (payment_method !== undefined) {
      fields.push(`payment_method = $${paramIndex++}`);
      values.push(payment_method);
    }
    if (account_id !== undefined) {
      fields.push(`account_id = $${paramIndex++}`);
      values.push(account_id);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id, userId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const previous = existingExpense.rows[0];
      const result = await client.query(
        `UPDATE expenses e
         SET ${fields.join(', ')}
         WHERE e.id = $${paramIndex}
           AND e.user_id = $${paramIndex + 1}
         RETURNING e.*`,
        values
      );

      const newAmount = amount !== undefined ? amount : Number(previous.amount);
      const newAccountId = account_id !== undefined ? account_id : previous.account_id;
      if (previous.account_id) {
        await client.query(
          `UPDATE accounts
           SET current_balance = current_balance + $1
           WHERE id = $2`,
          [previous.amount, previous.account_id]
        );
      }
      if (newAccountId) {
        await client.query(
          `UPDATE accounts
           SET current_balance = current_balance - $1
           WHERE id = $2`,
          [newAmount, newAccountId]
        );
      }
      await client.query('COMMIT');
      const hydratedResult = await client.query(
        `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                a.name as account_name, a.icon as account_icon
         FROM expenses e
         JOIN categories c ON e.category_id = c.id
         LEFT JOIN accounts a ON e.account_id = a.id
         WHERE e.id = $1
           AND e.user_id = $2`,
        [id, userId]
      );
      res.json(hydratedResult.rows[0] || result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE expense
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const userId = getUserId(req);
    const expenseResult = await client.query('SELECT amount, account_id FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    if (expenseResult.rows.length > 0 && expenseResult.rows[0].account_id) {
      await client.query(
        `UPDATE accounts
         SET current_balance = current_balance + $1
         WHERE id = $2`,
        [expenseResult.rows[0].amount, expenseResult.rows[0].account_id]
      );
    }
    await client.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    await client.query('COMMIT');
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  } finally {
    client.release();
  }
});

// POST bulk add expenses
router.post('/bulk', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const userId = getUserId(req);
    const expenses = req.body.expenses;
    
    if (!Array.isArray(expenses) || expenses.length === 0) {
      res.status(400).json({ error: 'Expenses array is required' });
      await client.query('ROLLBACK');
      return;
    }

    const results = [];
    
    for (const expense of expenses) {
      const { 
        amount, category_id, category_name, description, item_name, 
        item_type, is_need, longevity, mood, payment_method, date 
      } = expense;

      let catId = category_id;
      
      // Get or create category
      if (category_name && !catId) {
        const catResult = await client.query(
          'SELECT id FROM categories WHERE name = $1 AND user_id = $2',
          [category_name, userId]
        );
        
        if (catResult.rows.length > 0) {
          catId = catResult.rows[0].id;
        }
      }

      if (!catId) continue;

      const expenseDate = date ? new Date(date) : new Date();
      const result = await client.query(
        `INSERT INTO expenses 
         (user_id, amount, category_id, description, item_name, item_type, is_need, 
          longevity, mood, is_impulse, date, payment_method) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         RETURNING *`,
        [
          userId, amount, catId, description || null, item_name || null, 
          item_type || null, is_need ?? null, longevity || null, 
          mood || null, false, expenseDate, payment_method || null
        ]
      );
      
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ expenses: results, count: results.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk creating expenses:', error);
    res.status(500).json({ error: 'Failed to bulk create expenses' });
  } finally {
    client.release();
  }
});

// POST add reflection to expense
router.post('/:id/reflect', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { verdict } = req.body;

    if (!['worth_it', 'okay', 'regret'].includes(verdict)) {
      res.status(400).json({ error: 'Invalid verdict. Must be: worth_it, okay, or regret' });
      return;
    }

    // Check if reflection already exists
    const existing = await pool.query(
      `SELECT r.id
       FROM reflections r
       JOIN expenses e ON e.id = r.expense_id
       WHERE r.expense_id = $1
         AND e.user_id = $2`,
      [id, userId]
    );

    if (existing.rows.length > 0) {
      // Update existing reflection
      const result = await pool.query(
        `UPDATE reflections 
         SET verdict = $2, created_at = NOW()
         WHERE expense_id = $1
           AND EXISTS (SELECT 1 FROM expenses WHERE id = $1 AND user_id = $3)
         RETURNING *`,
        [id, verdict, userId]
      );
      res.json(result.rows[0]);
    } else {
      // Create new reflection
      const result = await pool.query(
        `INSERT INTO reflections (expense_id, verdict) 
         SELECT $1, $2
         WHERE EXISTS (SELECT 1 FROM expenses WHERE id = $1 AND user_id = $3)
         RETURNING *`,
        [id, verdict, userId]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error adding reflection:', error);
    res.status(500).json({ error: 'Failed to add reflection' });
  }
});

// GET pending reflections (shopping items 7+ days old without reflection)
router.get('/pending-reflections', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN reflections r ON e.id = r.expense_id
      WHERE c.name = 'Shopping'
      AND e.user_id = $1
      AND r.id IS NULL
      AND e.date <= CURRENT_DATE - INTERVAL '7 days'
      AND e.date >= CURRENT_DATE - INTERVAL '14 days'
      ORDER BY e.date ASC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending reflections:', error);
    res.status(500).json({ error: 'Failed to fetch pending reflections' });
  }
});

// GET reflection stats
router.get('/reflection-stats', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.id) as total_shopping,
        COUNT(DISTINCT r.expense_id) as reflected_count,
        COUNT(DISTINCT CASE WHEN r.verdict = 'worth_it' THEN e.id END) as worth_it_count,
        COUNT(DISTINCT CASE WHEN r.verdict = 'okay' THEN e.id END) as okay_count,
        COUNT(DISTINCT CASE WHEN r.verdict = 'regret' THEN e.id END) as regret_count,
        COUNT(DISTINCT CASE WHEN e.is_impulse THEN e.id END) as impulse_count,
        COUNT(DISTINCT CASE WHEN e.is_impulse AND r.verdict = 'regret' THEN e.id END) as impulse_regret_count
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN reflections r ON e.id = r.expense_id
      WHERE c.name = 'Shopping'
      AND e.user_id = $1
      AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
    `, [userId]);
    
    const row = result.rows[0];
    const impulseCount = parseInt(row.impulse_count) || 0;
    const impulseRegretCount = parseInt(row.impulse_regret_count) || 0;
    const regretRate = impulseCount > 0 ? Math.round((impulseRegretCount / impulseCount) * 100) : 0;
    
    res.json({
      total_shopping: parseInt(row.total_shopping) || 0,
      reflected: parseInt(row.reflected_count) || 0,
      worth_it: parseInt(row.worth_it_count) || 0,
      okay: parseInt(row.okay_count) || 0,
      regret: parseInt(row.regret_count) || 0,
      impulse_count: impulseCount,
      impulse_regret_rate: regretRate
    });
  } catch (error) {
    console.error('Error fetching reflection stats:', error);
    res.status(500).json({ error: 'Failed to fetch reflection stats' });
  }
});

// GET impulse expenses
router.get('/impulse', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM expenses e
       JOIN categories c ON e.category_id = c.id
       WHERE e.is_impulse = true
       AND e.user_id = $1
       AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
       ORDER BY e.date DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching impulse expenses:', error);
    res.status(500).json({ error: 'Failed to fetch impulse expenses' });
  }
});

// GET quality report
router.get('/quality-report', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE quality_score >= 4) as good_count,
        COUNT(*) FILTER (WHERE quality_score = 3) as neutral_count,
        COUNT(*) FILTER (WHERE quality_score <= 2) as bad_count,
        SUM(amount) FILTER (WHERE quality_score >= 4) as good_total,
        SUM(amount) FILTER (WHERE quality_score = 3) as neutral_total,
        SUM(amount) FILTER (WHERE quality_score <= 2) as bad_total,
        COUNT(*) as total_count
       FROM expenses
       WHERE user_id = $1
         AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );
    
    const row = result.rows[0];
    const total = parseInt(row.total_count) || 0;
    
    res.json({
      good: {
        count: parseInt(row.good_count) || 0,
        total: parseFloat(row.good_total) || 0,
        percentage: total > 0 ? Math.round((parseInt(row.good_count) / total) * 100) : 0
      },
      neutral: {
        count: parseInt(row.neutral_count) || 0,
        total: parseFloat(row.neutral_total) || 0,
        percentage: total > 0 ? Math.round((parseInt(row.neutral_count) / total) * 100) : 0
      },
      bad: {
        count: parseInt(row.bad_count) || 0,
        total: parseFloat(row.bad_total) || 0,
        percentage: total > 0 ? Math.round((parseInt(row.bad_count) / total) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching quality report:', error);
    res.status(500).json({ error: 'Failed to fetch quality report' });
  }
});

export default router;
