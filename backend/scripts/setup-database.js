/**
 * Initialize Neon / PostgreSQL (schema + demo users)
 * Usage: set DATABASE_URL in backend/.env then: npm run db:setup
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Running ${path.basename(filePath)}...`);
  await pool.query(sql);
}

async function setup() {
  const url = process.env.DATABASE_URL || '';

  if (!url || url.includes('REPLACE_')) {
    console.error('\nERROR: Set your Neon connection string in backend/.env');
    console.error('  DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require');
    console.error('  DATABASE_SSL=true');
    console.error('\nSee NEON_SETUP.md for steps.\n');
    process.exit(1);
  }

  try {
    const { rows } = await pool.query('SELECT NOW() as now');
    console.log('Database connection OK:', rows[0].now);

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const seedPath = path.join(__dirname, '../database/seed-users.sql');

    const tableCheck = await pool.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'users'
       ) as exists`
    );

    if (!tableCheck.rows[0].exists) {
      await runSqlFile(schemaPath);
      console.log('Schema created.');
    } else {
      console.log('Tables already exist — skipping schema.');
    }

    await runSqlFile(seedPath);
    console.log('Demo users seeded / updated.');

    const users = await pool.query(
      `SELECT email, role, approval_status, is_active FROM users
       WHERE email = ANY($1::text[])`,
      [['admin@jlrfleetlink.com', 'owner@jlrfleetlink.com', 'customer@jlrfleetlink.com']]
    );

    console.log('\n--- Login credentials ---');
    console.log('Admin:    admin@jlrfleetlink.com    / Admin@123');
    console.log('Owner:    owner@jlrfleetlink.com    / Owner@123');
    console.log('Customer: customer@jlrfleetlink.com / Customer@123');
    console.log('\nAccounts in database:');
    users.rows.forEach((u) => {
      console.log(`  ${u.email} | ${u.role} | approval=${u.approval_status} | active=${u.is_active}`);
    });
  } catch (err) {
    console.error('\nSetup failed:', err.message);
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.error('Cannot reach database host. Check DATABASE_URL.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
