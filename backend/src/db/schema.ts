import pool from './pool';
import { hashPassword } from '../auth';

const defaultCategories = [
  { name: 'Food', icon: '🍔', color: '#FF6B6B', monthly_budget: 5000 },
  { name: 'Transport', icon: '🚗', color: '#4ECDC4', monthly_budget: 2000 },
  { name: 'Entertainment', icon: '🎬', color: '#FFE66D', monthly_budget: 1500 },
  { name: 'Health', icon: '💊', color: '#A8E6CF', monthly_budget: 2000 },
  { name: 'Shopping', icon: '🛒', color: '#FF8B94', monthly_budget: 3000 },
  { name: 'Bills', icon: '🏠', color: '#B39DDB', monthly_budget: 8000 },
  { name: 'Other', icon: '💸', color: '#90CAF9', monthly_budget: 1000 }
];

const defaultAccounts = [
  { name: 'Bank Account', type: 'bank', account_role: 'flow', icon: '🏦', color: '#38bdf8' },
  { name: 'Cash', type: 'cash', account_role: 'flow', icon: '💵', color: '#22c55e' },
  { name: 'E-Wallet', type: 'ewallet', account_role: 'flow', icon: '📱', color: '#f59e0b' },
  { name: 'Savings Account', type: 'bank', account_role: 'saving', icon: '🔒', color: '#6366f1' }
];

export const monthExpression = (valueExpression: string) =>
  `DATE_TRUNC('month', ${valueExpression})::date`;

const ADMIN_USERNAME = 'ujjwalnepal';
const ADMIN_PASSWORD = 'saving123';

export const ensureDefaultsForUser = async (
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  userId: number
) => {
  const existingAccounts = await client.query(`SELECT COUNT(*)::int AS count FROM accounts WHERE user_id = $1`, [userId]);
  if (existingAccounts.rows[0].count === 0) {
    for (const account of defaultAccounts) {
      await client.query(
        `INSERT INTO accounts (user_id, name, type, account_role, icon, color, current_balance)
         VALUES ($1, $2, $3, $4, $5, $6, 0)`,
        [userId, account.name, account.type, account.account_role, account.icon, account.color]
      );
    }
  }

  const existingCategories = await client.query(`SELECT COUNT(*)::int AS count FROM categories WHERE user_id = $1`, [userId]);
  if (existingCategories.rows[0].count === 0) {
    for (const category of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, icon, color, monthly_budget)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, category.name, category.icon, category.color, category.monthly_budget]
      );
    }
  }
};

export const ensureSchema = async (seedDefaults = false) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(60) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(30) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const adminResult = await client.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (username) DO UPDATE
       SET password_hash = users.password_hash
       RETURNING id`,
      [ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD)]
    );
    const adminUserId = adminResult.rows[0].id;

    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(30) NOT NULL,
        account_role VARCHAR(30) NOT NULL DEFAULT 'flow',
        icon VARCHAR(10),
        color VARCHAR(7),
        current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS account_role VARCHAR(30) NOT NULL DEFAULT 'flow'
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        icon VARCHAR(10),
        color VARCHAR(7),
        monthly_budget NUMERIC(10,2)
      )
    `);

    await client.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        category_id INT REFERENCES categories(id),
        description TEXT,
        item_name TEXT,
        item_type VARCHAR(20),
        is_need BOOLEAN,
        longevity VARCHAR(20),
        mood VARCHAR(20),
        quality_score INT,
        is_impulse BOOLEAN DEFAULT false,
        date TIMESTAMPTZ DEFAULT NOW(),
        account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
        payment_method VARCHAR(30),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS account_id INT REFERENCES accounts(id) ON DELETE SET NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        category_id INT REFERENCES categories(id),
        description TEXT,
        frequency VARCHAR(20)
      )
    `);

    await client.query(`
      ALTER TABLE recurring_expenses
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reflections (
        id SERIAL PRIMARY KEY,
        expense_id INT REFERENCES expenses(id),
        verdict VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS income (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        source VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        description TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
        allocation_month DATE,
        is_regular BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE income
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE income
      ADD COLUMN IF NOT EXISTS account_id INT REFERENCES accounts(id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE income
      ADD COLUMN IF NOT EXISTS allocation_month DATE
    `);

    await client.query(`
      UPDATE income
      SET allocation_month = ${monthExpression('date')}
      WHERE allocation_month IS NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        invested_amount NUMERIC(10,2) NOT NULL,
        current_value NUMERIC(10,2),
        units NUMERIC(12,6),
        buy_price NUMERIC(10,2),
        current_price NUMERIC(10,2),
        purchase_date TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE investments
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS investment_transactions (
        id SERIAL PRIMARY KEY,
        investment_id INT REFERENCES investments(id),
        type VARCHAR(20) NOT NULL,
        units NUMERIC(12,6),
        price_per_unit NUMERIC(10,2),
        total_amount NUMERIC(10,2) NOT NULL,
        notes TEXT,
        transaction_date TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        from_account VARCHAR(50) NOT NULL,
        to_account VARCHAR(50) NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        description TEXT,
        transfer_type VARCHAR(50),
        investment_id INT,
        from_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
        to_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
        transfer_date TIMESTAMPTZ DEFAULT NOW(),
        effective_month DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(50)
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD COLUMN IF NOT EXISTS investment_id INT
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD COLUMN IF NOT EXISTS from_account_id INT REFERENCES accounts(id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD COLUMN IF NOT EXISTS to_account_id INT REFERENCES accounts(id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD COLUMN IF NOT EXISTS transfer_date TIMESTAMPTZ DEFAULT NOW()
    `);

    await client.query(`
      ALTER TABLE transfers
      DROP CONSTRAINT IF EXISTS transfers_investment_id_fkey
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD COLUMN IF NOT EXISTS effective_month DATE
    `);

    await client.query(`
      UPDATE transfers
      SET effective_month = ${monthExpression('created_at')}
      WHERE effective_month IS NULL
    `);

    await client.query(`
      UPDATE transfers
      SET transfer_date = created_at
      WHERE transfer_date IS NULL
    `);

    await client.query(`
      UPDATE transfers
      SET transfer_type = CASE
        WHEN from_account = 'income' AND to_account LIKE 'investment:%' THEN 'investment_contribution'
        WHEN from_account LIKE 'investment:%' AND to_account = 'budget' THEN 'investment_withdrawal'
        ELSE 'internal_transfer'
      END
      WHERE transfer_type IS NULL
    `);

    await client.query(`
      UPDATE transfers
      SET investment_id = parsed.investment_id
      FROM (
        SELECT id, NULLIF(REPLACE(to_account, 'investment:', ''), '')::INT AS investment_id
        FROM transfers
        WHERE investment_id IS NULL
          AND to_account LIKE 'investment:%'
      ) AS parsed
      WHERE transfers.id = parsed.id
        AND EXISTS (
          SELECT 1
          FROM investments
          WHERE investments.id = parsed.investment_id
        )
    `);

    await client.query(`
      UPDATE transfers
      SET investment_id = parsed.investment_id
      FROM (
        SELECT id, NULLIF(REPLACE(from_account, 'investment:', ''), '')::INT AS investment_id
        FROM transfers
        WHERE investment_id IS NULL
          AND from_account LIKE 'investment:%'
      ) AS parsed
      WHERE transfers.id = parsed.id
        AND EXISTS (
          SELECT 1
          FROM investments
          WHERE investments.id = parsed.investment_id
        )
    `);

    await client.query(`
      UPDATE transfers
      SET investment_id = NULL
      WHERE investment_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM investments
          WHERE investments.id = transfers.investment_id
        )
    `);

    await client.query(`
      ALTER TABLE transfers
      ADD CONSTRAINT transfers_investment_id_fkey
      FOREIGN KEY (investment_id)
      REFERENCES investments(id)
      ON DELETE SET NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_category_budgets (
        id SERIAL PRIMARY KEY,
        month DATE NOT NULL,
        category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        budget_amount NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (month, category_id)
      )
    `);

    await client.query(`UPDATE accounts SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);
    await client.query(`UPDATE categories SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);
    await client.query(`UPDATE expenses SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);
    await client.query(`UPDATE recurring_expenses SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);
    await client.query(`UPDATE income SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);
    await client.query(`UPDATE investments SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);
    await client.query(`UPDATE transfers SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);

    await client.query(`
      UPDATE investments
      SET current_value = invested_amount
      WHERE current_value IS NULL
    `);

    await ensureDefaultsForUser(client, adminUserId);

    if (seedDefaults) {
      await ensureDefaultsForUser(client, adminUserId);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
