import { Router } from 'express';
import pool from '../db/pool';
import { getUserId } from '../auth';

const router = Router();

interface Insight {
  type: string;
  emoji: string;
  title: string;
  body: string;
  tip: string;
}

// GET weekly insights
router.get('/weekly', async (req, res) => {
  try {
    const userId = getUserId(req);
    const insights: Insight[] = [];

    // 1. WASTE DETECTOR - Category spending analysis
    const categorySpending = await pool.query(`
      SELECT c.name, c.icon, 
             COALESCE(SUM(e.amount), 0) as total,
             COUNT(e.id) as count
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
      AND e.user_id = $1
      GROUP BY c.id
      ORDER BY total DESC
    `, [userId]);

    if (categorySpending.rows.length > 0) {
      const topCategory = categorySpending.rows[0];
      const totalResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = $1
          AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      `, [userId]);
      const totalSpent = parseFloat(totalResult.rows[0].total);
      const percentage = totalSpent > 0 
        ? Math.round((parseFloat(topCategory.total) / totalSpent) * 100) 
        : 0;

      if (percentage > 25) {
        insights.push({
          type: 'waste',
          emoji: '🗑️',
          title: `High spend in ${topCategory.name}`,
          body: `You spent Rs. ${parseFloat(topCategory.total).toFixed(2)} on ${topCategory.name} — ${percentage}% of your total this month.`,
          tip: 'Try a 48-hour rule before buying items in this category.'
        });
      }
    }

    // 2. IMPULSE REPORT - Night-time purchases
    const nightPurchases = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      AND user_id = $1
      AND (EXTRACT(HOUR FROM date) >= 23 OR EXTRACT(HOUR FROM date) < 2)
    `, [userId]);

    const nightCount = parseInt(nightPurchases.rows[0].count);
    const nightTotal = parseFloat(nightPurchases.rows[0].total);
    
    if (nightCount > 2) {
      insights.push({
        type: 'impulse',
        emoji: '🌙',
        title: 'Late night spending detected',
        body: `${nightCount} purchases after 11pm totaled Rs. ${nightTotal.toFixed(2)} this month.`,
        tip: 'Remove saved cards from shopping apps after 10pm.'
      });
    }

    // 3. GOOD SPEND HIGHLIGHT - Best quality Shopping item
    const bestSpend = await pool.query(`
      SELECT e.item_name, e.description, e.amount, e.longevity, e.quality_score
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE c.name = 'Shopping'
      AND e.user_id = $1
      AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
      AND e.quality_score >= 4
      ORDER BY e.quality_score DESC, e.amount DESC
      LIMIT 1
    `, [userId]);

    if (bestSpend.rows.length > 0) {
      const item = bestSpend.rows[0];
      const longevityDays = item.longevity === 'week' ? 7 : 
                           item.longevity === 'month' ? 30 : 
                           item.longevity === 'year' ? 365 : 1825;
      const costPerDay = parseFloat(item.amount) / longevityDays;
      
      insights.push({
        type: 'good_spend',
        emoji: '💪',
        title: `Best purchase: ${item.item_name || item.description}`,
        body: `At Rs. ${parseFloat(item.amount).toFixed(2)} with ${item.longevity} lifespan, cost per day is just Rs. ${costPerDay.toFixed(2)}.`,
        tip: 'This is a high-value habit — keep it up!'
      });
    }

    // 4. SAVING OPPORTUNITY - Highest non-necessity category
    const savingOpp = await pool.query(`
      SELECT c.name, COALESCE(SUM(e.amount), 0) as total
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
      AND e.user_id = $1
      AND c.name NOT IN ('Bills', 'Health', 'Transport')
      GROUP BY c.id
      HAVING SUM(e.amount) > 500
      ORDER BY total DESC
      LIMIT 1
    `, [userId]);

    if (savingOpp.rows.length > 0) {
      const cat = savingOpp.rows[0];
      const monthly30 = parseFloat(cat.total) * 0.3;
      const yearly = monthly30 * 12;
      
      insights.push({
        type: 'saving_opportunity',
        emoji: '✈️',
        title: `Cut ${cat.name} by 30%`,
        body: `You spent Rs. ${parseFloat(cat.total).toFixed(2)} on ${cat.name}. Cutting 30% saves Rs. ${monthly30.toFixed(2)}/month.`,
        tip: `That's Rs. ${yearly.toFixed(0)}/year — enough for a proper holiday!`
      });
    }

    // 5. MOOD CORRELATION - Stress spending
    const moodSpending = await pool.query(`
      SELECT 
        mood,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenses
      WHERE mood IS NOT NULL AND mood != ''
      AND user_id = $1
      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY mood
    `, [userId]);

    const stressedRow = moodSpending.rows.find((r: any) => 
      r.mood?.toLowerCase() === 'stressed' || r.mood?.toLowerCase() === 'bored'
    );
    
    if (stressedRow) {
      const stressedTotal = parseFloat(stressedRow.total);
      const normalResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM expenses
        WHERE (mood IS NULL OR mood = '')
        AND user_id = $1
        AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      `, [userId]);
      const normalAvg = normalResult.rows[0].count > 0 
        ? parseFloat(normalResult.rows[0].total) / normalResult.rows[0].count 
        : 0;
      const stressedAvg = stressedTotal / parseInt(stressedRow.count);
      const difference = stressedAvg - normalAvg;
      
      if (difference > 0) {
        insights.push({
          type: 'mood_correlation',
          emoji: '😰',
          title: 'Stress spending pattern found',
          body: `You spend Rs. ${difference.toFixed(2)} more on average when feeling ${stressedRow.mood}.`,
          tip: 'Keep a small Rs. 500 guilt-free stress budget — but cap it.'
        });
      }
    }

    // Add default insight if none generated
    if (insights.length === 0) {
      insights.push({
        type: 'general',
        emoji: '🎯',
        title: 'Keep it up!',
        body: 'You\'re doing great tracking your expenses. Consistency is the first step to financial awareness!',
        tip: 'Set a daily reminder to log expenses at the same time each day.'
      });
    }

    res.json(insights.slice(0, 5)); // Return max 5 insights
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// GET spending trends
router.get('/trends', async (req, res) => {
  try {
    const userId = getUserId(req);
    // Compare this month vs last month
    const trends = await pool.query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(amount) as total
      FROM expenses
      WHERE date >= CURRENT_DATE - INTERVAL '2 months'
      AND user_id = $1
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
    `, [userId]);

    const thisMonth = trends.rows[0]?.total || 0;
    const lastMonth = trends.rows[1]?.total || 0;
    
    const percentageChange = lastMonth > 0 
      ? Math.round(((parseFloat(thisMonth) - parseFloat(lastMonth)) / parseFloat(lastMonth)) * 100)
      : 0;

    res.json({
      this_month: parseFloat(thisMonth),
      last_month: parseFloat(lastMonth),
      percentage_change: percentageChange,
      trending: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'stable'
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

export default router;
