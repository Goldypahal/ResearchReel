/**
 * Early tables used TIMESTAMP WITHOUT TIME ZONE, which shifts times by the database
 * server's timezone. Convert every such column in the public schema to TIMESTAMPTZ,
 * interpreting existing values as UTC.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT table_name, column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'
           AND table_name <> 'pgmigrations'
      LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
                       r.table_name, r.column_name, r.column_name);
      END LOOP;
    END $$;
  `);
};

exports.down = () => {};
