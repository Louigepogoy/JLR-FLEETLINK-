# JLR Fleetlink — Demo Login Credentials

Use these accounts after running the database setup and seed script.

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@jlrfleetlink.com` | `Admin@123` |
| **Owner** | `owner@jlrfleetlink.com` | `Owner@123` |
| **Customer** | `customer@jlrfleetlink.com` | `Customer@123` |

## Setup seed accounts (Neon — recommended)

1. Paste your Neon connection string into `backend/.env` as `DATABASE_URL`
2. Set `DATABASE_SSL=true`
3. Run:

```bash
cd backend
npm run db:setup
```

See [NEON_SETUP.md](./NEON_SETUP.md) for full Neon instructions.

## New user registration

New **Customer** and **Owner** sign-ups require:

1. Valid driver's license number  
2. Photo of driver's license  
3. Live selfie (for human identity verification)  
4. **Admin approval** before they can sign in  

Admins review pending registrations at: **Dashboard → Approvals**
