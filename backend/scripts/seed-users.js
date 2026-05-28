/**
 * Run: node scripts/seed-users.js
 * Creates demo admin, owner, customer accounts
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const users = [
  { email: 'admin@jlrfleetlink.com', password: 'Admin@123', fullName: 'System Administrator', phone: '+639171000001', role: 'admin', license: null },
  { email: 'owner@jlrfleetlink.com', password: 'Owner@123', fullName: 'Juan Dela Cruz', phone: '+639181000002', role: 'owner', license: 'N01-12-345678' },
  { email: 'customer@jlrfleetlink.com', password: 'Customer@123', fullName: 'Maria Santos', phone: '+639191000003', role: 'customer', license: 'N02-98-765432' },
];

async function seed() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, license_number, approval_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', true)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         approval_status = 'approved',
         is_active = true`,
      [u.email, hash, u.fullName, u.phone, u.role, u.license]
    );
    console.log(`✓ ${u.role}: ${u.email} / ${u.password}`);
  }
  await pool.end();
  console.log('\nDone! See CREDENTIALS.md');
}

seed().catch((e) => { console.error(e); process.exit(1); });
