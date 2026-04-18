# SKT Mart

A full-stack multi-vendor e-commerce platform (Flipkart-style) with customer storefront, vendor dashboard, and admin control panel.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL
- **Auth**: JWT + OTP (Firebase-ready)
- **Payments**: Razorpay (test-mode hooks)
- **Search**: Postgres full-text + pg_trgm (typo-tolerant)

## Structure

```
skt-mart/
├── apps/
│   ├── web/   # Next.js frontend (customer, vendor, admin)
│   └── api/   # Express backend API
├── package.json
└── README.md
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

Use the provided docker-compose:

```bash
docker compose up -d
```

Or install Postgres locally and create a database named `sktmart`.

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/api/.env`:
- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — any long random string
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — from https://dashboard.razorpay.com
- `SMTP_*` — any SMTP provider (SendGrid, Gmail, etc.)

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run dev servers

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

## Default Accounts (after seed)

| Role     | Email                  | Password      |
|----------|------------------------|---------------|
| Admin    | admin@sktmart.com      | admin@123     |
| Vendor   | vendor@sktmart.com     | vendor@123    |
| Customer | customer@sktmart.com   | customer@123  |

## Routes

### Customer
- `/` — Homepage with banners, categories, deals
- `/category/[slug]` — Product listing with filters
- `/product/[slug]` — Product detail page
- `/cart`, `/wishlist`, `/checkout`
- `/orders`, `/orders/[id]`
- `/account` — Profile, addresses

### Vendor
- `/vendor` — Dashboard
- `/vendor/products` — Product CRUD
- `/vendor/orders` — Order fulfillment

### Admin
- `/admin` — Dashboard
- `/admin/vendors` — Vendor approval
- `/admin/products`, `/admin/orders`, `/admin/users`, `/admin/banners`

### Legal
- `/privacy-policy`
- `/return-policy`
- `/terms`
- `/shipping-policy`
- `/refund-policy`
- `/contact`, `/about`

## License

MIT
