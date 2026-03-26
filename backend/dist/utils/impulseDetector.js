"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkImpulsePurchase = checkImpulsePurchase;
exports.getImpulseExpensesThisMonth = getImpulseExpensesThisMonth;
exports.formatImpulseWarning = formatImpulseWarning;
const pool_1 = __importDefault(require("../db/pool"));
async function checkImpulsePurchase(userId, amount, categoryId, mood, date = new Date()) {
    const reasons = [];
    const hour = date.getHours();
    // Check 1: Added between 10pm - 2am
    if (hour >= 22 || hour < 2) {
        reasons.push('Late night purchase (10pm - 2am)');
    }
    // Check 2: Same category spent 3+ times in one day
    const sameDayResult = await pool_1.default.query(`SELECT COUNT(*) as count 
     FROM expenses 
     WHERE category_id = $1 
     AND DATE(date) = DATE($2)
     AND user_id = $3`, [categoryId, date, userId]);
    const sameDayCount = parseInt(sameDayResult.rows[0].count);
    if (sameDayCount >= 3) {
        reasons.push(`${sameDayCount + 1}th purchase in this category today`);
    }
    // Check 3: Amount > 2x user's average for that category
    const avgResult = await pool_1.default.query(`SELECT AVG(amount) as avg_amount 
     FROM expenses 
     WHERE category_id = $1
     AND user_id = $2`, [categoryId, userId]);
    const avgAmount = parseFloat(avgResult.rows[0].avg_amount) || 0;
    if (avgAmount > 0 && amount > avgAmount * 2) {
        reasons.push(`Amount is ${(amount / avgAmount).toFixed(1)}x your average for this category`);
    }
    // Check 4: Mood is "Bored" or "Stressed"
    if (mood && ['stressed', 'bored'].includes(mood.toLowerCase())) {
        reasons.push(`Purchase made while feeling ${mood}`);
    }
    return {
        isImpulse: reasons.length > 0,
        reasons
    };
}
async function getImpulseExpensesThisMonth(userId) {
    const result = await pool_1.default.query(`SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM expenses e
     JOIN categories c ON e.category_id = c.id
     WHERE e.is_impulse = true
     AND e.user_id = $1
     AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
     ORDER BY e.date DESC`, [userId]);
    return result.rows;
}
function formatImpulseWarning(reasons) {
    if (reasons.length === 0)
        return '';
    const mainReason = reasons[0];
    return `⚡ Heads up — ${mainReason.toLowerCase()}. Still add it?`;
}
//# sourceMappingURL=impulseDetector.js.map