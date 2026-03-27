# BudgetBuddy

A full-stack personal finance app built to answer one main question: **how do I save more money this month?** It still makes expense entry fast, but the main flow now pushes income into a monthly saving plan, investment moves, and a real spendable budget.

## 🚀 Tech Stack

- **Frontend**: React (TypeScript) + Vite + Tailwind CSS
- **Backend**: Express (TypeScript) + PostgreSQL
- **Database**: PostgreSQL 15
- **State Management**: Zustand
- **Charts**: Recharts

## ✨ Features

### Core Features
- **Savings-First Budgeting** - Monthly budget is based on income minus money moved into investments.
- **Natural Language Input** - Text like "200 uber yesterday" is parsed into amount, category, description, and date automatically.
- **Impulse Detection** - Flags purchases that look impulsive based on timing, location, or amount spikes.
- **Visual Dashboard** - Shows spendable cash, protected savings, and a breakdown by category in one place.
- **Money Health Score** - Measures overall financial wellness on a 0-100 scale.
- **Income-to-Investment Flow** - Lets you log salary, push part to investments, and keep the rest for planned spending.
- **Return Tracking** - Keeps investment gains/losses inside the investment bucket until you withdraw them.
- **Shopping Log** - Tracks extra metadata such as item name, type, longevity, and mood.
- **Recurring Expenses** - Records subscriptions and other regular commitments.
- **Weekly Insights** - Delivers personalized spending insights and trends.
- **Dark Mode** - Tailored styling for low-light use.

### Delight Features
- `N` focuses the quick-add bar so you can log expenses without leaving the keyboard.
- Micro-animations reinforce successful saves.
- Categories are color-coded and clearly labeled.
- Quality scoring tags expenses as Smart Spend, Neutral, or Watch Out.
- Reflection prompts encourage revisiting past purchases thoughtfully.

## 📋 Prerequisites

- Node.js 18+ 
- Docker & Docker Compose (optional, for easy setup)
- OR PostgreSQL 15+ installed locally

## 🛠️ Setup

### Fast Start

```bash
./start-app.sh
```

This script:
- starts PostgreSQL with Docker Compose
- waits for the database to be ready
- runs the backend migration
- starts backend and frontend dev servers together

Press `Ctrl+C` to stop all three.

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repo
cd personalfinance

# 2. Start the whole app
./start-app.sh

# 3. Open your browser
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```

### Option 2: Manual Setup

#### 1. Start PostgreSQL

```bash
# Using Docker
docker run -d \
  -e POSTGRES_USER=expenseuser \
  -e POSTGRES_PASSWORD=expensepass \
  -e POSTGRES_DB=expensedb \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15
```

#### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run migrations (creates tables + seeds categories)
npm run migrate

# Start development server
npm run dev
```

Backend runs on `http://localhost:4000`

#### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000`

## 🚢 Deployment tips

- **Backend**: point `DATABASE_URL` to your managed Postgres (Railway, Supabase, etc.). The app already reads `DATABASE_URL`, `PGHOST`, `PGUSER`, and the other standard Postgres env vars, so just configure them in your cloud provider before starting the Docker image or Node process.
- **Frontend**: when building for production, set `VITE_API_URL` to the deployed backend URL (for example `https://alluring-renewal-production-df8c.up.railway.app`). When you run `npm run build`, Vite will bake that address into the static assets while local development continues to talk to `http://localhost:4000`. If you need the dev server to accept traffic proxied from another hostname (a tunnel URL or preview host), set `VITE_ALLOWED_HOSTS` to a comma-separated list of hostnames so Vite’s dev server allows those requests.
- **Local vs deployed**: keep using `./start-app.sh` for localhost (it already defaults the frontend to `http://localhost:4000`). In deployment environments use the same repo, but override `VITE_API_URL` and `DATABASE_URL` so the services target the hosted backend and database.

## 📚 API Endpoints

### Expenses
```
POST   /expenses                - Add expense
GET    /expenses?month=&category= - List with filters
DELETE /expenses/:id            - Delete expense
PATCH  /expenses/:id            - Update expense
POST   /expenses/bulk           - Bulk add expenses
GET    /expenses/impulse        - Flagged impulse purchases
GET    /expenses/quality-report - Quality breakdown
POST   /expenses/:id/reflect    - Add reflection (worth_it/okay/regret)
```

### Categories
```
GET    /categories              - List all categories
POST   /categories              - Create category
PUT    /categories/:id/budget   - Update budget
```

### Dashboard
```
GET    /dashboard               - Totals, breakdown, budget status
GET    /dashboard/health-score  - Money health score (0-100)
```

### Insights
```
GET    /insights/weekly         - 3-5 personalized insights
GET    /insights/trends         - Spending trends
```

### Shopping
```
GET    /shopping/items          - All shopping entries
GET    /shopping/stats          - Shopping statistics
GET    /shopping/items/:type    - Filter by type
GET    /shopping/pending-reflections - Items needing reflection
```

### Recurring
```
GET    /recurring               - List recurring expenses
POST   /recurring               - Create recurring expense
PUT    /recurring/:id           - Update recurring expense
DELETE /recurring/:id           - Delete recurring expense
GET    /recurring/summary/monthly - Monthly commitment total
```

## 🗄️ Database Schema

### Tables
- **categories** - Expense categories with icons, colors, budgets
- **expenses** - Main expense records with quality scores
- **recurring_expenses** - Regular/subscription expenses
- **reflections** - User reflections on past purchases

### Seed Categories
| Name | Budget |
|------|--------|
| Food | $5,000 |
| Transport | $2,000 |
| Entertainment | $1,500 |
| Health | $2,000 |
| Shopping | $3,000 |
| Bills | $8,000 |
| Other | $1,000 |

## 💡 Natural Language Parser

The parser understands inputs like:

```
"200 uber"           -> $200, Transport, "uber", today
"coffee 80"          -> $80, Food, "coffee", today
"500 food yesterday" -> $500, Food, "yesterday"
"lunch 1200 monday"  -> $1,200, Food, "lunch", last Monday
```

**Category Keywords:**
- Transport: uber, ola, auto, bus, metro, petrol, cab, taxi
- Food: food, lunch, dinner, zomato, swiggy, chai, coffee, breakfast
- Entertainment: movie, netflix, spotify, game, concert
- Health: medicine, doctor, hospital, gym, yoga, fitness
- Shopping: amazon, flipkart, shoes, clothes, bag, headphone
- Bills: rent, electricity, wifi, bill, recharge

## 🎯 Money Health Score

Score out of 100, calculated from:
- +30 pts: % of good/investment expenses
- +20 pts: stayed within overall budget
- +15 pts: protected savings by moving money out of spendable cash
- +20 pts: impulse purchases < 10% of total
- +15 pts: has savings goal progress
- +15 pts: spending trending down

**Grades:**
- 80-100: 💚 Excellent - "You're crushing it!"
- 60-79: 🟢 Good - "Solid habits, room to grow"
- 40-59: 🟡 Fair - "Watch your impulse spending"
- 0-39: 🔴 At Risk - "Time for a spending audit"

## ⚡ Impulse Detection

Flags expenses as impulse if:
- Added between 10pm - 2am
- Same category spent 3+ times in one day
- Amount > 2x user's average for that category
- User tagged mood as "Bored" or "Stressed"

## 📱 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Focus QuickAdd bar |

## 🔧 Development

### Backend Commands
```bash
npm run dev      # Start dev server (tsx watch)
npm run build    # Compile TypeScript
npm run start    # Start production server
npm run migrate  # Run database migrations
```

### Frontend Commands
```bash
npm run dev      # Start dev server (Vite)
npm run build    # Build for production
npm run preview  # Preview production build
```

## 📁 Project Structure

```
personalfinance/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── db/              # Database connection & migrations
│   │   ├── utils/           # Parser, scorer, impulse detector
│   │   └── index.ts         # Express app entry
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Zustand state management
│   │   └── App.tsx          # Main app component
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

## 🎨 UI Components

- **QuickAddBar** - Natural language input with live preview
- **ExpenseCard** - Expense display with quality badges
- **DashboardHeader** - Budget progress ring
- **MoneyHealthScore** - Financial health indicator
- **CategoryGrid** - Category overview with mini progress bars
- **DonutChart** - Category spending breakdown
- **DailyBarChart** - 30-day spending trend
- **ShoppingEntryModal** - Extended shopping entry form
- **ImpulseWarningModal** - Impulse purchase warning
- **ReflectionPrompt** - Post-purchase reflection

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Kill process on port 4000 or 3000
lsof -ti:4000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Database connection error:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Or restart Docker container
docker-compose restart db
```

**Migration fails:**
```bash
# Drop and recreate database
docker-compose down -v
docker-compose up -d db
npm run migrate
```

## 📝 License

MIT

## 🙏 Credits

Built with ❤️ using React, Express, and PostgreSQL.

---

**Start tracking your expenses today and gain financial self-awareness!** 🚀
