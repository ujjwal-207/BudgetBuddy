"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../auth");
const router = (0, express_1.Router)();
const monthOrCurrent = (month) => month || new Date().toISOString().slice(0, 10);
// GET all income entries
router.get('/', async (req, res) => {
    try {
        const { month, limit = 100 } = req.query;
        const userId = (0, auth_1.getUserId)(req);
        const result = await pool_1.default.query(`SELECT *,
              DATE_TRUNC('month', allocation_month)::date AS allocation_month
       FROM income
       WHERE user_id = $3
         AND DATE_TRUNC('month', allocation_month) = DATE_TRUNC('month', $1::date)
       ORDER BY date DESC
       LIMIT $2`, [monthOrCurrent(month), parseInt(limit, 10), userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching income:', error);
        res.status(500).json({ error: 'Failed to fetch income' });
    }
});
// POST add income
router.post('/', async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        await client.query('BEGIN');
        const userId = (0, auth_1.getUserId)(req);
        const { amount, source, category, description, date, allocation_month, account_id, is_regular } = req.body;
        const incomeDate = date || new Date();
        const allocationMonth = allocation_month || incomeDate;
        const result = await client.query(`INSERT INTO income (user_id, amount, source, category, description, date, account_id, allocation_month, is_regular)
       VALUES ($1, $2, $3, $4, $5, $6, $7, DATE_TRUNC('month', $8::date)::date, $9)
       RETURNING *, DATE_TRUNC('month', allocation_month)::date AS allocation_month`, [userId, amount, source, category || null, description || null, incomeDate, account_id || null, allocationMonth, is_regular || false]);
        if (account_id) {
            await client.query(`UPDATE accounts
         SET current_balance = current_balance + $1
         WHERE id = $2`, [amount, account_id]);
        }
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding income:', error);
        res.status(500).json({ error: 'Failed to add income' });
    }
    finally {
        client.release();
    }
});
// DELETE income
router.delete('/:id', async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        await client.query('BEGIN');
        const userId = (0, auth_1.getUserId)(req);
        const { id } = req.params;
        const incomeResult = await client.query('SELECT amount, account_id FROM income WHERE id = $1 AND user_id = $2', [id, userId]);
        if (incomeResult.rows.length > 0 && incomeResult.rows[0].account_id) {
            await client.query(`UPDATE accounts
         SET current_balance = current_balance - $1
         WHERE id = $2`, [incomeResult.rows[0].amount, incomeResult.rows[0].account_id]);
        }
        await client.query('DELETE FROM income WHERE id = $1 AND user_id = $2', [id, userId]);
        await client.query('COMMIT');
        res.json({ message: 'Income deleted successfully' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting income:', error);
        res.status(500).json({ error: 'Failed to delete income' });
    }
    finally {
        client.release();
    }
});
// GET income summary
router.get('/summary/monthly', async (req, res) => {
    try {
        const { month } = req.query;
        const userId = (0, auth_1.getUserId)(req);
        const selectedMonth = monthOrCurrent(month);
        const result = await pool_1.default.query(`SELECT
          COALESCE(SUM(amount), 0) AS total_income,
          COUNT(*) AS income_count,
          COALESCE(SUM(CASE WHEN is_regular = true THEN amount ELSE 0 END), 0) AS regular_income,
          COALESCE(SUM(CASE WHEN is_regular = false THEN amount ELSE 0 END), 0) AS irregular_income,
          DATE_TRUNC('month', $1::date)::date AS month
       FROM income
       WHERE user_id = $2
         AND DATE_TRUNC('month', allocation_month) = DATE_TRUNC('month', $1::date)`, [selectedMonth, userId]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching income summary:', error);
        res.status(500).json({ error: 'Failed to fetch income summary' });
    }
});
// GET income by source
router.get('/by-source', async (req, res) => {
    try {
        const { month } = req.query;
        const userId = (0, auth_1.getUserId)(req);
        const selectedMonth = monthOrCurrent(month);
        const result = await pool_1.default.query(`SELECT
          source,
          COUNT(*) AS count,
          SUM(amount) AS total,
          AVG(amount) AS average
       FROM income
       WHERE user_id = $2
         AND DATE_TRUNC('month', allocation_month) = DATE_TRUNC('month', $1::date)
       GROUP BY source
       ORDER BY total DESC`, [selectedMonth, userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching income by source:', error);
        res.status(500).json({ error: 'Failed to fetch income by source' });
    }
});
exports.default = router;
//# sourceMappingURL=income.js.map