import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT *
       FROM accounts
       WHERE user_id = $1
       ORDER BY
         CASE account_role
           WHEN 'flow' THEN 1
           WHEN 'saving' THEN 2
           ELSE 3
         END,
         CASE type
           WHEN 'bank' THEN 1
           WHEN 'cash' THEN 2
           WHEN 'ewallet' THEN 3
           ELSE 4
         END,
         created_at ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, type, account_role = 'flow', icon, color, current_balance = 0 } = req.body;
    const result = await pool.query(
      `INSERT INTO accounts (user_id, name, type, account_role, icon, color, current_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, name, type, account_role, icon || null, color || null, current_balance]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, type, account_role, icon, color, current_balance } = req.body;
    const result = await pool.query(
      `UPDATE accounts
       SET name = COALESCE($2, name),
           type = COALESCE($3, type),
           account_role = COALESCE($4, account_role),
           icon = COALESCE($5, icon),
           color = COALESCE($6, color),
           current_balance = COALESCE($7, current_balance)
       WHERE id = $1
         AND user_id = $8
       RETURNING *`,
      [id, name ?? null, type ?? null, account_role ?? null, icon ?? null, color ?? null, current_balance ?? null, userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

export default router;
