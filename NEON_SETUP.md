# Connect JLR Fleetlink to Neon PostgreSQL

No app code changes needed — only update `backend/.env` and run setup once.

## Step 1 — Create Neon database

1. Go to [https://neon.tech](https://neon.tech) and sign in
2. Create a project (e.g. `jlr-fleetlink`)
3. Open **Dashboard → Connect**
4. Copy the **connection string** (use **Pooled connection** for the API)

Example:
```
postgresql://neondb_owner:xxxxx@ep-cool-name-12345678.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

## Step 2 — Update backend `.env`

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://YOUR_NEON_CONNECTION_STRING
DATABASE_SSL=true
```

Keep `JWT_SECRET`, `FRONTEND_URL`, and `API_BASE_URL` as they are.

## Step 3 — Create tables and demo users

```bash
cd backend
npm run db:setup
```

You should see:
```
Database connection OK
Schema applied.
Demo users seeded.
```

## Step 4 — Start the app

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

## Step 5 — Log in

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@jlrfleetlink.com | Admin@123 |
| Owner | owner@jlrfleetlink.com | Owner@123 |
| Customer | customer@jlrfleetlink.com | Customer@123 |

---

## Troubleshooting login

| Problem | Fix |
|---------|-----|
| "Database unavailable" | Check `DATABASE_URL` in `backend/.env`, ensure Neon project is active |
| "Invalid email or password" | Run `npm run db:setup` again to create demo users |
| "Pending admin approval" | Use demo accounts above, or approve user in Admin → Approvals |
| Frontend can't reach API | Ensure `NEXT_PUBLIC_API_URL=http://localhost:5000/api` in `frontend/.env.local` |

Reset demo passwords only:
```bash
cd backend
npm run seed
```
