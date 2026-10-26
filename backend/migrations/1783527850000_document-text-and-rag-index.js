/**
 * Keep the text extracted from each uploaded paper so AI features can work
 * from the paper itself, and record when it was indexed into the RAG service.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP WITH TIME ZONE;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE documents DROP COLUMN IF EXISTS rag_indexed_at;
    ALTER TABLE documents DROP COLUMN IF EXISTS extracted_text;
  `);
};
