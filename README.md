# JLR Fleetlink

A professional web-based vehicle rental platform with modern SaaS-style UI, role-based dashboards, online payments (GCash & Card), and commission-based platform earnings.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Zustand, Axios, Recharts |
| Backend | Express.js, Node.js, PostgreSQL, JWT, bcrypt |
| Payments | GCash (simulated), Visa/Mastercard (simulated) |

## Features

- **Authentication** – JWT-based login/register with role-based access (Customer, Owner, Admin)
- **Navbar Logic** – Shows Sign In/Create Account when logged out; Dashboard, Profile, Notifications, Logout when logged in
- **Dark/Light Mode** – Toggle with persisted preference and smooth transitions
- **Vehicle Rental** – Browse, search, filter, book vehicles with double-booking prevention
- **Online Payments** – GCash & Card with partial/down payment support
- **Commission System** – Auto-deduct platform commission; admin can change rate dynamically
- **Dashboards** – Separate dashboards for Customer, Owner, and Admin with analytics charts
- **Notifications** – Real-time booking and payment notifications
- **Security** – JWT auth, role middleware, input validation, protected routes

## Project Structure

```
JLRFLEETLINK/
├── backend/          # Express.js API
│   ├── database/     # schema.sql, seed.sql
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── utils/
└── frontend/         # Next.js App
    └── src/
        ├── app/      # Pages (App Router)
        ├── components/
        ├── lib/
        └── store/
```

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@jlrfleetlink.com` | `Admin@123` |
| **Owner** | `owner@jlrfleetlink.com` | `Owner@123` |
| **Customer** | `customer@jlrfleetlink.com` | `Customer@123` |

After creating the database, run: `cd backend && npm run seed`

New registrations require **driver's license photo**, **live selfie**, and **admin approval** before login. Admins review at **Dashboard → Approvals**.

See [CREDENTIALS.md](./CREDENTIALS.md) for details.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```bash
# Create database
createdb jlr_fleetlink

# Run schema
psql -d jlr_fleetlink -f backend/database/schema.sql
psql -d jlr_fleetlink -f backend/database/seed-users.sql

# If upgrading an existing database:
# psql -d jlr_fleetlink -f backend/database/migration_user_approval.sql
# psql -d jlr_fleetlink -f backend/database/seed-users.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

npm install
npm run dev
```

API runs at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local

npm install
npm run dev
```

App runs at `http://localhost:3000`

## API Endpoints

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Register account |
| `POST /api/auth/login` | Login |
| `GET /api/vehicles` | Browse vehicles |
| `POST /api/bookings` | Create booking |
| `POST /api/payments/process` | Process payment |
| `GET /api/transactions/earnings` | Owner earnings |
| `GET /api/transactions/analytics` | Admin analytics |
| `PUT /api/commission` | Update commission % |
| `GET /api/notifications` | Get notifications |

## User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | Browse vehicles, book, pay online, view history |
| **Owner** | Add/manage vehicles, approve bookings, view earnings |
| **Admin** | Manage users, bookings, payments, commission, analytics |

## Payment Example

```
Booking Total:    ₱10,000
First Payment:    ₱3,000  (partial)
Remaining:        ₱7,000

Commission (10%): ₱300 from first payment
Owner Receives:   ₱2,700
Platform Earns:   ₱300
```

## Production Notes

- Replace simulated GCash/Card payments in `backend/src/services/paymentService.js` with PayMongo, Xendit, or Stripe
- Use strong `JWT_SECRET` and HTTPS in production
- Configure proper CORS origins in backend `.env`

## License

MIT
# JLR-FLEETLINK-
