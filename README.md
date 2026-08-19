# VinBook - Commercial Accounting & Financial SaaS Platform

VinBook is a modern, enterprise-grade cloud accounting and double-entry bookkeeping platform built with Next.js 16, TypeScript, Tailwind CSS, Prisma, and PostgreSQL (Neon).

## 🚀 Features

- **Dashboard & Financial KPIs**: Real-time revenue overview, expense breakdowns, and key performance indicators.
- **Invoicing & Estimates**:
  - Full invoice lifecycle (Draft, Sent, Paid, Partial, Overdue, Cancelled)
  - Estimate/Quote conversion to invoice
  - PDF export and automated tax calculations
- **Double-Entry General Ledger**:
  - Hierarchical Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expense)
  - Balanced debit/credit journal entries
- **Banking & Reconciliation**:
  - Multi-bank account support
  - Transaction import and automatic invoice/expense matching
- **Customer & Vendor CRM**:
  - Credit limit management, payment terms, and prepaid balances
  - Detailed customer financial statements
- **Multi-Tenant Organizations**:
  - Secure tenant separation with role-based access control (Admin, Accountant, Viewer)
- **API & Protocol Integration**:
  - Model Context Protocol (MCP) server support (`/api/mcp`)
  - Hermes Agent protocol integration (`/api/hermes`)

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Database & ORM**: PostgreSQL (Neon Serverless) & Prisma Client
- **Auth**: NextAuth.js v5
- **UI Components**: Radix UI, Tailwind CSS, Lucide Icons, Recharts

---

## ⚙️ Environment Variables

Create a `.env` file or configure your environment variables in Vercel:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://<user>:<password>@<host>/<dbname>?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret" # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://vinbook.vercel.app"

# Optional: OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Optional: Resend for Emails
RESEND_API_KEY=""
EMAIL_FROM="VinBook <onboarding@resend.dev>"

# Optional: Stripe for Subscriptions
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema to Neon
npx prisma db push

# Seed initial chart of accounts and default organization
npm run db:seed

# Start development server
npm run dev
```
