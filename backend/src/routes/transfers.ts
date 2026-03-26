import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

const monthOrCurrent = (month?: string) => month || new Date().toISOString().slice(0, 10);

const inferInvestmentId = (value?: string) => {
  if (!value || !value.startsWith('investment:')) return null;
  const id = Number(value.replace('investment:', ''));
  return Number.isFinite(id) ? id : null;
};

// GET all transfers
router.get('/', async (req, res) => {
  try {
    const { limit = 100, month } = req.query;
    const userId = getUserId(req);
    const selectedMonth = monthOrCurrent(month as string | undefined);

    const result = await pool.query(
      `SELECT *,
              DATE_TRUNC('month', effective_month)::date AS effective_month
       FROM transfers
       WHERE user_id = $3
         AND DATE_TRUNC('month', effective_month) = DATE_TRUNC('month', $1::date)
       ORDER BY created_at DESC
       LIMIT $2`,
      [selectedMonth, parseInt(limit as string, 10), userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// POST create transfer
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const userId = getUserId(req);

    const {
      from_account,
      to_account,
      amount,
      description,
      transfer_date,
      effective_month,
      transfer_type,
      investment_id,
      from_account_id,
      to_account_id
    } = req.body;

    const resolvedInvestmentId =
      investment_id || inferInvestmentId(to_account) || inferInvestmentId(from_account);

    let resolvedType = transfer_type;
    if (!resolvedType) {
      if (from_account === 'income' && resolvedInvestmentId) {
        resolvedType = 'investment_contribution';
      } else if (resolvedInvestmentId && to_account === 'budget') {
        resolvedType = 'investment_withdrawal';
      } else {
        resolvedType = 'internal_transfer';
      }
    }

    const transferResult = await client.query(
      `INSERT INTO transfers
       (user_id, from_account, to_account, amount, description, transfer_type, investment_id, from_account_id, to_account_id, transfer_date, effective_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, DATE_TRUNC('month', $11::date)::date)
       RETURNING *, DATE_TRUNC('month', effective_month)::date AS effective_month`,
      [
        userId,
        from_account,
        to_account,
        amount,
        description || null,
        resolvedType,
        resolvedInvestmentId,
        from_account_id || null,
        to_account_id || null,
        transfer_date || new Date(),
        effective_month || transfer_date || new Date()
      ]
    );

    if (from_account_id) {
      await client.query(
        `UPDATE accounts
         SET current_balance = current_balance - $1
         WHERE id = $2`,
        [amount, from_account_id]
      );
    }

    if (to_account_id) {
      await client.query(
        `UPDATE accounts
         SET current_balance = current_balance + $1
         WHERE id = $2`,
        [amount, to_account_id]
      );
    }

    if (resolvedInvestmentId && resolvedType === 'investment_contribution') {
      await client.query(
        `INSERT INTO investment_transactions
         (investment_id, type, total_amount, notes, transaction_date)
         VALUES ($1, 'buy', $2, $3, $4)`,
        [
          resolvedInvestmentId,
          amount,
          `Transfer from income: ${description || 'Investment contribution'}`,
          transfer_date || new Date()
        ]
      );

      await client.query(
        `UPDATE investments
         SET invested_amount = invested_amount + $1,
             current_value = COALESCE(current_value, invested_amount, 0) + $1
         WHERE id = $2`,
        [amount, resolvedInvestmentId]
      );
    }

    if (resolvedInvestmentId && resolvedType === 'investment_withdrawal') {
      const investmentResult = await client.query(
        `SELECT invested_amount, COALESCE(current_value, invested_amount) AS current_value
         FROM investments
         WHERE id = $1`,
        [resolvedInvestmentId]
      );

      if (investmentResult.rows.length === 0) {
        throw new Error('Investment not found');
      }

      const currentValue = parseFloat(investmentResult.rows[0].current_value);
      const investedAmount = parseFloat(investmentResult.rows[0].invested_amount);

      if (amount > currentValue) {
        throw new Error('Withdrawal exceeds current investment value');
      }

      const principalReduction = currentValue > 0 ? (amount * investedAmount) / currentValue : 0;

      await client.query(
        `INSERT INTO investment_transactions
         (investment_id, type, total_amount, notes, transaction_date)
         VALUES ($1, 'sell', $2, $3, $4)`,
        [
          resolvedInvestmentId,
          amount,
          `Moved to budget: ${description || 'Investment withdrawal'}`,
          transfer_date || new Date()
        ]
      );

      await client.query(
        `UPDATE investments
         SET invested_amount = GREATEST(invested_amount - $1, 0),
             current_value = GREATEST(COALESCE(current_value, invested_amount) - $2, 0)
         WHERE id = $3`,
        [principalReduction, amount, resolvedInvestmentId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(transferResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating transfer:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create transfer'
    });
  } finally {
    client.release();
  }
});

// GET transfer summary
router.get('/summary/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    const userId = getUserId(req);
    const selectedMonth = monthOrCurrent(month as string | undefined);

    const result = await pool.query(
      `SELECT
          COALESCE(SUM(amount), 0) AS total_transferred,
          COUNT(*) AS transfer_count,
          transfer_type,
          from_account,
          to_account
       FROM transfers
       WHERE user_id = $2
         AND DATE_TRUNC('month', effective_month) = DATE_TRUNC('month', $1::date)
       GROUP BY transfer_type, from_account, to_account
       ORDER BY total_transferred DESC`,
      [selectedMonth, userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transfer summary:', error);
    res.status(500).json({ error: 'Failed to fetch transfer summary' });
  }
});

export default router;
