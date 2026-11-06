/**
 * Papers can now be imported by DOI/ORCID (metadata only, no PDF), so the file URL becomes optional.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE documents ALTER COLUMN file_url DROP NOT NULL;
    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'upload',
      ADD COLUMN IF NOT EXISTS external_url TEXT,
      ADD COLUMN IF NOT EXISTS citation_count INT;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_owner_doi
      ON documents (uploader_id, lower(doi)) WHERE doi IS NOT NULL AND deleted_at IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS uq_documents_owner_doi;
    ALTER TABLE documents DROP COLUMN IF EXISTS citation_count, DROP COLUMN IF EXISTS external_url, DROP COLUMN IF EXISTS source;
  `);
};
