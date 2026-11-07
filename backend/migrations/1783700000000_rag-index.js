/**
 * Tracks each paper's state in the Research RAG service, and lets an AI
 * conversation cover several papers.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS rag_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS rag_error TEXT,
      ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_documents_rag_status ON documents (rag_status) WHERE deleted_at IS NULL;

    ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS document_ids UUID[] NOT NULL DEFAULT '{}';
    UPDATE ai_conversations SET document_ids = ARRAY[document_id] WHERE document_id IS NOT NULL AND document_ids = '{}';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE ai_conversations DROP COLUMN IF EXISTS document_ids;
    DROP INDEX IF EXISTS idx_documents_rag_status;
    ALTER TABLE documents DROP COLUMN IF EXISTS rag_indexed_at, DROP COLUMN IF EXISTS rag_error, DROP COLUMN IF EXISTS rag_status;
  `);
};
