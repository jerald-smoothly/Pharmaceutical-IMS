# PharmaFlow — Setup Guide

## Quick Start (with Docker)

```bash
# 1. Start the PostgreSQL database
docker compose up db -d

# 2. Run database migrations
npm run db:push

# 3. Seed with test accounts
npm install ts-node --save-dev
npm run db:seed

# 4. Start the dev server
npm run dev
```

Then open http://localhost:3000

## Test Accounts

| Role     | Email                        | Password      |
|----------|------------------------------|---------------|
| Admin    | admin@pharmaflow.local       | admin123      |
| Staff    | staff@pharmaflow.local       | staff123      |
| Customer | buyer@healthcaredist.com     | customer123   |

## Importing Stock

1. Sign in as Admin or Staff
2. Go to **Import Stock** in the sidebar
3. Download the CSV template or prepare your own
4. Upload a `.csv`, `.xlsx`, or `.xls` file

### Required CSV Columns
- `sku` — unique product code
- `name` — product name
- `batch_number` — lot/batch number
- `expiry_date` — YYYY-MM-DD
- `quantity` — units received
- `unit_price` — selling price

### Optional Columns
- `generic_name`, `manufacturer`, `category`, `unit`
- `cost_price`, `supplier`, `requires_prescription`

## Production Deployment

1. Update `.env` — set a secure `AUTH_SECRET`
2. Run `docker compose up --build`
3. Migrations run automatically via `npm run db:push` before start
