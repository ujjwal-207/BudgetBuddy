"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const auth_1 = __importDefault(require("./routes/auth"));
const categories_1 = __importDefault(require("./routes/categories"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const insights_1 = __importDefault(require("./routes/insights"));
const shopping_1 = __importDefault(require("./routes/shopping"));
const recurring_1 = __importDefault(require("./routes/recurring"));
const income_1 = __importDefault(require("./routes/income"));
const investments_1 = __importDefault(require("./routes/investments"));
const transfers_1 = __importDefault(require("./routes/transfers"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const auth_2 = require("./auth");
const schema_1 = require("./db/schema");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/auth', auth_1.default);
app.use(auth_2.requireAuth);
app.use('/expenses', expenses_1.default);
app.use('/categories', categories_1.default);
app.use('/dashboard', dashboard_1.default);
app.use('/insights', insights_1.default);
app.use('/shopping', shopping_1.default);
app.use('/recurring', recurring_1.default);
app.use('/income', income_1.default);
app.use('/investments', investments_1.default);
app.use('/transfers', transfers_1.default);
app.use('/budgets', budgets_1.default);
app.use('/accounts', accounts_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
const startServer = async () => {
    try {
        await (0, schema_1.ensureSchema)();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 BudgetBuddy API ready!`);
        });
    }
    catch (error) {
        console.error('Failed to initialize schema:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map