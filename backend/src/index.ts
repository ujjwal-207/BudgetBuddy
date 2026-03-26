import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import expensesRouter from './routes/expenses';
import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import dashboardRouter from './routes/dashboard';
import insightsRouter from './routes/insights';
import shoppingRouter from './routes/shopping';
import recurringRouter from './routes/recurring';
import incomeRouter from './routes/income';
import investmentsRouter from './routes/investments';
import transfersRouter from './routes/transfers';
import budgetsRouter from './routes/budgets';
import accountsRouter from './routes/accounts';
import { requireAuth } from './auth';
import { ensureSchema } from './db/schema';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use(requireAuth);
app.use('/expenses', expensesRouter);
app.use('/categories', categoriesRouter);
app.use('/dashboard', dashboardRouter);
app.use('/insights', insightsRouter);
app.use('/shopping', shoppingRouter);
app.use('/recurring', recurringRouter);
app.use('/income', incomeRouter);
app.use('/investments', investmentsRouter);
app.use('/transfers', transfersRouter);
app.use('/budgets', budgetsRouter);
app.use('/accounts', accountsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 BudgetBuddy API ready!`);
    });
  } catch (error) {
    console.error('Failed to initialize schema:', error);
    process.exit(1);
  }
};

startServer();

export default app;
