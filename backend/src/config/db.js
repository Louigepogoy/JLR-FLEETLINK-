const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const isNeon =
  connectionString?.includes('neon.tech') ||
  connectionString?.includes('neon.database');

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  isNeon ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('connect', () => {
  console.log(`Connected to PostgreSQL${isNeon ? ' (Neon)' : ''}`);
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

module.exports = { pool, query: (text, params) => pool.query(text, params) };
