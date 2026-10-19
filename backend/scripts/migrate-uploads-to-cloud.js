/**
 * One-time move of existing /uploads files to Cloudinary, so every upload shows on localhost and on the deployed
 * site. Finds every URL containing "/uploads/" in the database, gets the file (from backend/uploads, or by
 * downloading the URL), uploads it to Cloudinary and rewrites the URL in place.
 *
 *   npm run uploads:migrate            # dry run: only lists what it would do
 *   npm run uploads:migrate -- --apply # uploads and updates the database
 *
 * Needs CLOUDINARY_URL in backend/.env (cloudinary://API_KEY:API_SECRET@CLOUD_NAME). Safe to re-run.
 */
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { query, pool } = require('../src/config/db');
const { uploadDir } = require('../src/middleware/upload');
const { isCloudEnabled, uploadFileToCloud, publicIdFor } = require('../src/utils/cloudStorage');

const apply = process.argv.includes('--apply');
const URL_PATTERN = /https?:\/\/[^\s"',}\]\\]+\/uploads\/[^\s"',}\]\\]+/g;

// Text, text[] and jsonb columns that may hold upload URLs.
const columnSql = `
  SELECT table_name, column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND data_type IN ('text', 'character varying', 'ARRAY', 'jsonb', 'json')`;

const getLocalOrDownload = async (url) => {
  const filename = path.basename(url.split('/uploads/')[1].split('?')[0]);
  const local = path.join(uploadDir, filename);
  if (fs.existsSync(local)) return { filePath: local, filename, temp: false };
  if (!apply) {
    // Dry run: just check the file is reachable instead of downloading it.
    const head = await fetch(url.replace(/^http:\/\//, 'https://'), { method: 'HEAD', signal: AbortSignal.timeout(15000) }).catch(() => null);
    return head && head.ok ? { filePath: null, filename, temp: false, remote: true } : null;
  }
  const res = await fetch(url.replace(/^http:\/\//, 'https://'), { signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!res || !res.ok) return null;
  const tmp = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  return { filePath: tmp, filename, temp: true };
};

(async () => {
  if (apply && !isCloudEnabled()) {
    console.error('CLOUDINARY_URL is not set in backend/.env. Add it first, then run again.');
    process.exit(1);
  }

  const columns = (await query(columnSql)).rows;
  const urlRows = new Map(); // url -> [{ table, column, type }]
  for (const c of columns) {
    const castType = c.data_type === 'ARRAY' ? 'text[]' : c.data_type === 'jsonb' || c.data_type === 'json' ? c.data_type : 'text';
    const found = await query(`SELECT "${c.column_name}"::text AS v FROM "${c.table_name}" WHERE "${c.column_name}"::text LIKE '%/uploads/%'`).catch(() => ({ rows: [] }));
    for (const row of found.rows) {
      for (const url of row.v.match(URL_PATTERN) || []) {
        if (!urlRows.has(url)) urlRows.set(url, []);
        urlRows.get(url).push({ table: c.table_name, column: c.column_name, castType });
      }
    }
  }

  console.log(`${urlRows.size} upload URL(s) found.${apply ? '' : ' (dry run, nothing changed)'}`);
  const moved = new Map();
  const missing = [];
  for (const url of urlRows.keys()) {
    const file = await getLocalOrDownload(url);
    if (!file) { missing.push(url); console.log(`  MISSING  ${url}`); continue; }
    if (!apply) { console.log(`  would move  ${url}${file.remote ? '  (from the live site)' : '  (local file)'}`); continue; }
    try {
      const cloudUrl = await uploadFileToCloud(file.filePath, publicIdFor(file.filename));
      moved.set(url, cloudUrl);
      console.log(`  moved  ${url}\n      -> ${cloudUrl}`);
    } catch (err) {
      missing.push(url);
      console.log(`  FAILED  ${url}: ${err.message}`);
    } finally {
      if (file.temp) fs.unlinkSync(file.filePath);
    }
  }

  if (apply) {
    for (const [url, cloudUrl] of moved) {
      const seen = new Set();
      for (const { table, column, castType } of urlRows.get(url)) {
        if (seen.has(`${table}.${column}`)) continue;
        seen.add(`${table}.${column}`);
        await query(
          `UPDATE "${table}" SET "${column}" = replace("${column}"::text, $1, $2)::${castType} WHERE "${column}"::text LIKE '%' || $1 || '%'`,
          [url, cloudUrl]
        );
      }
    }
    console.log(`\nDatabase updated for ${moved.size} file(s).`);
  }
  if (missing.length) console.log(`${missing.length} file(s) could not be found or uploaded; their URLs were left unchanged.`);
  await pool.end();
})().catch((err) => { console.error(err); process.exit(1); });
