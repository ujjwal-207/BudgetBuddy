import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

// GET investment summary
router.get('/summary/total', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_investments,
        COALESCE(SUM(invested_amount), 0) AS total_invested,
        COALESCE(SUM(COALESCE(current_value, invested_amount)), 0) AS total_current_value,
        COALESCE(SUM(COALESCE(current_value, invested_amount) - invested_amount), 0) AS total_profit_loss,
        CASE
          WHEN COALESCE(SUM(invested_amount), 0) > 0 THEN
            (COALESCE(SUM(COALESCE(current_value, invested_amount) - invested_amount), 0) / SUM(invested_amount)) * 100
          ELSE 0
        END AS overall_return_percentage
      FROM investments
      WHERE user_id = $1
    `, [userId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching investment summary:', error);
    res.status(500).json({ error: 'Failed to fetch investment summary' });
  }
});

// GET investments by type
router.get('/by-type', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT
        type,
        COUNT(*) AS count,
        SUM(invested_amount) AS total_invested,
        SUM(COALESCE(current_value, invested_amount)) AS total_current_value,
        SUM(COALESCE(current_value, invested_amount) - invested_amount) AS total_profit_loss
      FROM investments
      WHERE user_id = $1
        AND type IS NOT NULL
      GROUP BY type
      ORDER BY total_invested DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching investments by type:', error);
    res.status(500).json({ error: 'Failed to fetch investments by type' });
  }
});

// GET all investments
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT *,
        COALESCE(current_value, invested_amount) - invested_amount AS profit_loss,
        CASE
          WHEN invested_amount > 0 THEN
            ((COALESCE(current_value, invested_amount) - invested_amount) / invested_amount) * 100
          ELSE 0
        END AS return_percentage
      FROM investments
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

// GET investment transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT t.*
       FROM investment_transactions t
       JOIN investments i ON i.id = t.investment_id
       WHERE t.investment_id = $1
         AND i.user_id = $2
       ORDER BY transaction_date DESC`,
      [id, userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET single investment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT *,
              COALESCE(current_value, invested_amount) - invested_amount AS profit_loss,
              CASE
                WHEN invested_amount > 0 THEN
                  ((COALESCE(current_value, invested_amount) - invested_amount) / invested_amount) * 100
                ELSE 0
              END AS return_percentage
       FROM investments
       WHERE id = $1
         AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Investment not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching investment:', error);
    res.status(500).json({ error: 'Failed to fetch investment' });
  }
});

// POST create investment
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const userId = getUserId(req);

    const { name, type, invested_amount, units, buy_price, current_price, current_value, notes, purchase_date } =
      req.body;

    const initialValue = current_value ?? invested_amount;
    const investmentResult = await client.query(
      `INSERT INTO investments
       (user_id, name, type, invested_amount, current_value, units, buy_price, current_price, notes, purchase_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        name,
        type || null,
        invested_amount,
        initialValue,
        units || null,
        buy_price || null,
        current_price || null,
        notes || null,
        purchase_date || new Date()
      ]
    );

    await client.query(
      `INSERT INTO investment_transactions
       (investment_id, type, units, price_per_unit, total_amount, notes, transaction_date)
       VALUES ($1, 'buy', $2, $3, $4, $5, $6)`,
      [
        investmentResult.rows[0].id,
        units || 1,
        buy_price || invested_amount,
        invested_amount,
        'Initial investment',
        purchase_date || new Date()
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(investmentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating investment:', error);
    res.status(500).json({ error: 'Failed to create investment' });
  } finally {
    client.release();
  }
});

// PUT update investment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { current_value, current_price, notes, name, type, purchase_date } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (current_value !== undefined) {
      fields.push(`current_value = $${paramIndex++}`);
      values.push(current_value);
    }
    if (current_price !== undefined) {
      fields.push(`current_price = $${paramIndex++}`);
      values.push(current_price);
    }
    if (notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (purchase_date !== undefined) {
      fields.push(`purchase_date = $${paramIndex++}`);
      values.push(purchase_date);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE investments
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
         AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating investment:', error);
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

// DELETE investment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    await pool.query(
      `DELETE FROM investment_transactions
       WHERE investment_id = $1
         AND EXISTS (SELECT 1 FROM investments WHERE id = $1 AND user_id = $2)`,
      [id, userId]
    );
    await pool.query('DELETE FROM transfers WHERE investment_id = $1 AND user_id = $2', [id, userId]);
    await pool.query('DELETE FROM investments WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

// POST add transaction (buy/sell)
router.post('/:id/transaction', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const userId = getUserId(req);
    const { type, units, price_per_unit, total_amount, notes } = req.body;

    const investmentResult = await client.query(
      `SELECT id
       FROM investments
       WHERE id = $1
         AND user_id = $2`,
      [id, userId]
    );

    if (investmentResult.rows.length === 0) {
      res.status(404).json({ error: 'Investment not found' });
      await client.query('ROLLBACK');
      return;
    }

    const txResult = await client.query(
      `INSERT INTO investment_transactions
       (investment_id, type, units, price_per_unit, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, type, units, price_per_unit, total_amount, notes || null]
    );

    if (type === 'buy') {
      await client.query(
        `UPDATE investments
         SET invested_amount = invested_amount + $1,
             current_value = COALESCE(current_value, invested_amount, 0) + $1,
             units = COALESCE(units, 0) + $2
         WHERE id = $3
           AND user_id = $4`,
        [total_amount, units || 0, id, userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(txResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  } finally {
    client.release();
  }
});

export default router;
