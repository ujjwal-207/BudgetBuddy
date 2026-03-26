import { Router } from 'express';
import pool from '../db/pool';
import { createToken, getUserId, hashPassword, requireAuth, verifyPassword } from '../auth';
import { ensureDefaultsForUser } from '../db/schema';

const router = Router();

router.post('/signup', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const existingUser = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const userResult = await client.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'user')
       RETURNING id, username, role`,
      [username, hashPassword(password)]
    );

    await ensureDefaultsForUser(client, userResult.rows[0].id);
    await client.query('COMMIT');

    const user = userResult.rows[0];
    res.status(201).json({
      token: createToken(user),
      user
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error signing up:', error);
    res.status(500).json({ error: 'Failed to create account' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const result = await pool.query(
      `SELECT id, username, role, password_hash
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0 || !verifyPassword(password, result.rows[0].password_hash)) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role
    };

    res.json({
      token: createToken(user),
      user
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT id, username, role
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
