/**
 * Converts the remaining `timestamp without time zone` columns to timestamptz.
 *
 * Naive timestamps are read by node-postgres as the API server's local time and
 * compared with NOW() in the database session's zone, so dates shift and
 * schedules misfire whenever either isn't UTC. Existing values were written by
 * UTC databases (the Docker default), so they are interpreted as UTC.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

const findColumns = `
  SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND data_type = $1 AND table_name <> 'pgmigrations'`;

exports.up = async (pgm) => {
  const { rows } = await pgm.db.query(findColumns, ['timestamp without time zone']);
  for (const { table_name: t, column_name: c } of rows) {
    pgm.sql(`ALTER TABLE "${t}" ALTER COLUMN "${c}" TYPE TIMESTAMPTZ USING "${c}" AT TIME ZONE 'UTC'`);
  }
};

exports.down = async () => {
  // Converting back would lose zone information and reintroduce the bug; intentionally a no-op.
};
