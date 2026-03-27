"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../auth");
const router = (0, express_1.Router)();
const normalizeStatus = (principalAmount, repaidAmount) => (repaidAmount >= principalAmount ? 'paid' : 'open');
router.get('/', async (req, res) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const result = await pool_1.default.query(`SELECT l.*,
              a.name AS account_name,
              a.icon AS account_icon,
              GREATEST(l.principal_amount - l.repaid_amount, 0) AS outstanding_amount
       FROM loans l
       LEFT JOIN accounts a ON l.account_id = a.id
       WHERE l.user_id = $1
       ORDER BY
         CASE l.status WHEN 'open' THEN 1 ELSE 2 END,
         l.lent_date DESC,
         l.created_at DESC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ error: 'Failed to fetch loans' });
    }
});
router.post('/', async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        await client.query('BEGIN');
        const userId = (0, auth_1.getUserId)(req);
        const { counterparty_name, principal_amount, description, lent_date, expected_repayment_date, account_id, direction } = req.body;
        const loanAmount = Number(principal_amount);
        const loanDirection = direction === 'incoming' ? 'incoming' : 'outgoing';
        if (!counterparty_name || !Number.isFinite(loanAmount) || loanAmount <= 0) {
            throw new Error('Counterparty name and a positive amount are required');
        }
        if (account_id) {
            const accountDelta = loanDirection === 'outgoing' ? -loanAmount : loanAmount;
            await client.query(`UPDATE accounts
         SET current_balance = current_balance + $1
         WHERE id = $2 AND user_id = $3`, [accountDelta, account_id, userId]);
        }
        const result = await client.query(`INSERT INTO loans
       (user_id, account_id, counterparty_name, principal_amount, description, lent_date, expected_repayment_date, direction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [
            userId,
            account_id || null,
            counterparty_name,
            loanAmount,
            description || null,
            lent_date || new Date(),
            expected_repayment_date || null,
            loanDirection
        ]);
        const hydrated = await client.query(`SELECT l.*,
              a.name AS account_name,
              a.icon AS account_icon,
              GREATEST(l.principal_amount - l.repaid_amount, 0) AS outstanding_amount
       FROM loans l
       LEFT JOIN accounts a ON l.account_id = a.id
       WHERE l.id = $1 AND l.user_id = $2`, [result.rows[0].id, userId]);
        await client.query('COMMIT');
        res.status(201).json(hydrated.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating loan:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to create loan'
        });
    }
    finally {
        client.release();
    }
});
router.post('/:id/repay', async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        await client.query('BEGIN');
        const userId = (0, auth_1.getUserId)(req);
        const { id } = req.params;
        const { amount, repayment_date, account_id } = req.body;
        const repaymentAmount = Number(amount);
        if (!Number.isFinite(repaymentAmount) || repaymentAmount <= 0) {
            throw new Error('Repayment amount must be positive');
        }
        const existingLoan = await client.query(`SELECT id, principal_amount, repaid_amount, account_id, direction
       FROM loans
       WHERE id = $1 AND user_id = $2`, [id, userId]);
        if (existingLoan.rows.length === 0) {
            throw new Error('Loan not found');
        }
        const loan = existingLoan.rows[0];
        const principalAmount = Number(loan.principal_amount);
        const repaidAmount = Number(loan.repaid_amount);
        const outstandingAmount = principalAmount - repaidAmount;
        if (repaymentAmount > outstandingAmount) {
            throw new Error('Repayment exceeds outstanding amount');
        }
        const nextRepaidAmount = repaidAmount + repaymentAmount;
        const nextStatus = normalizeStatus(principalAmount, nextRepaidAmount);
        const loanDirection = loan.direction || 'outgoing';
        const destinationAccountId = account_id || loan.account_id || null;
        const updatedLoan = await client.query(`UPDATE loans
       SET repaid_amount = $1,
           status = $2,
           account_id = COALESCE($3, account_id),
           closed_at = CASE WHEN $2 = 'paid' THEN COALESCE(closed_at, $4) ELSE NULL END
       WHERE id = $5 AND user_id = $6
       RETURNING *`, [nextRepaidAmount, nextStatus, destinationAccountId, repayment_date || new Date(), id, userId]);
        if (destinationAccountId) {
            const accountDelta = loanDirection === 'outgoing' ? repaymentAmount : -repaymentAmount;
            await client.query(`UPDATE accounts
         SET current_balance = current_balance + $1
         WHERE id = $2 AND user_id = $3`, [accountDelta, destinationAccountId, userId]);
        }
        const hydrated = await client.query(`SELECT l.*,
              a.name AS account_name,
              a.icon AS account_icon,
              GREATEST(l.principal_amount - l.repaid_amount, 0) AS outstanding_amount
       FROM loans l
       LEFT JOIN accounts a ON l.account_id = a.id
       WHERE l.id = $1 AND l.user_id = $2`, [updatedLoan.rows[0].id, userId]);
        await client.query('COMMIT');
        res.json(hydrated.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error repaying loan:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to repay loan'
        });
    }
    finally {
        client.release();
    }
});
exports.default = router;
//# sourceMappingURL=loans.js.map