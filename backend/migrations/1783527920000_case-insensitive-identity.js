/**
 * Emails and usernames are case-insensitive identities.
 *
 * Lower-cases stored emails (unless that would collide with another account)
 * and adds unique indexes on lower(email) / lower(username) so "Alice@x.edu"
 * and "alice@x.edu" can no longer be two accounts. If existing data already
 * has case-only duplicates, the index for that column is skipped with a
 * NOTICE rather than failing the deploy; the app-level checks still apply.
 */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE users u SET email = lower(u.email)
     WHERE u.email <> lower(u.email)
       AND NOT EXISTS (SELECT 1 FROM users o WHERE o.id <> u.id AND lower(o.email) = lower(u.email));

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM users GROUP BY lower(email) HAVING COUNT(*) > 1) THEN
        RAISE NOTICE 'users: case-only duplicate emails exist; skipping users_email_lower_key';
      ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
      END IF;
      IF EXISTS (SELECT 1 FROM users GROUP BY lower(username) HAVING COUNT(*) > 1) THEN
        RAISE NOTICE 'users: case-only duplicate usernames exist; skipping users_username_lower_key';
      ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (lower(username));
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS users_email_lower_key; DROP INDEX IF EXISTS users_username_lower_key;');
};
