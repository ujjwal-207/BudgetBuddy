import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

// GET shopping items
router.get('/items', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             r.verdict as reflection_verdict
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN reflections r ON e.id = r.expense_id
      WHERE c.name = 'Shopping'
      AND e.user_id = $1
      ORDER BY e.date DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shopping items:', error);
    res.status(500).json({ error: 'Failed to fetch shopping items' });
  }
});

// GET shopping stats
router.get('/stats', async (req, res) => {
  try {
    const userId = getUserId(req);
    // Get all shopping expenses with reflections
    const shoppingResult = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(e.amount), 0) as total_spent,
        COUNT(r.id) FILTER (WHERE r.verdict = 'worth_it') as worth_it_count,
        COUNT(r.id) FILTER (WHERE r.verdict = 'okay') as okay_count,
        COUNT(r.id) FILTER (WHERE r.verdict = 'regret') as regret_count,
        COUNT(r.id) as total_reflections
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN reflections r ON e.id = r.expense_id
      WHERE c.name = 'Shopping'
      AND e.user_id = $1
    `, [userId]);

    const row = shoppingResult.rows[0];
    const totalItems = parseInt(row.total_items);
    const totalReflections = parseInt(row.total_reflections);
    
    let regretRate = 0;
    if (totalReflections > 0) {
      regretRate = Math.round((parseInt(row.regret_count) / totalReflections) * 100);
    }

    res.json({
      total_items: totalItems,
      total_spent: parseFloat(row.total_spent),
      reflections: {
        worth_it: parseInt(row.worth_it_count),
        okay: parseInt(row.okay_count),
        regret: parseInt(row.regret_count),
        total: totalReflections
      },
      regret_rate: regretRate
    });
  } catch (error) {
    console.error('Error fetching shopping stats:', error);
    res.status(500).json({ error: 'Failed to fetch shopping stats' });
  }
});

// GET shopping items by type
router.get('/items/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const userId = getUserId(req);
    const validTypes = ['necessity', 'impulse', 'investment', 'luxury'];
    
    if (!validTypes.includes(type.toLowerCase())) {
      res.status(400).json({ error: 'Invalid type. Must be: necessity, impulse, investment, or luxury' });
      return;
    }

    const result = await pool.query(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE c.name = 'Shopping' 
      AND e.user_id = $2
      AND LOWER(e.item_type) = LOWER($1)
      ORDER BY e.date DESC
    `, [type, userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shopping items by type:', error);
    res.status(500).json({ error: 'Failed to fetch shopping items' });
  }
});

// GET pending reflections
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
      ORDER BY e.date ASC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending reflections:', error);
    res.status(500).json({ error: 'Failed to fetch pending reflections' });
  }
});

export default router;
