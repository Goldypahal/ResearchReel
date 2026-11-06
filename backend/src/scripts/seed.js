/**
 * Creates (or promotes) the first administrator account.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' ADMIN_USERNAME=admin npm run seed
 *
 * Safe to run repeatedly. No demo content is created.
 */
require('dotenv').config({ quiet: true });
const argon2 = require('argon2');
const db = require('../config/db');

const main = async () => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const username = String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const fullName = process.env.ADMIN_NAME || 'ResearchReel Admin';

  if (!email || password.length < 12) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to create the admin account.');
    process.exit(1);
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    await db.query(`UPDATE users SET role = 'admin', email_verified = TRUE WHERE id = $1`, [existing.rows[0].id]);
    console.log(`Promoted existing account ${email} to admin.`);
  } else {
    const hash = await argon2.hash(password);
    await db.query(
      `INSERT INTO users (email, username, full_name, password_hash, role, email_verified, verification_status)
       VALUES ($1, $2, $3, $4, 'admin', TRUE, 'verified')`,
      [email, username, fullName, hash]
    );
    console.log(`Created admin account ${email} (@${username}).`);
  }
  await db.pool.end();
};

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
