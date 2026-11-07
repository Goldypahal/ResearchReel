const pool = require('../config/db');
const { signedUrl } = require('../utils/fileAccess');

/**
 * Documents are owned through documents.uploader_id (the column every other
 * query in the codebase uses). The API layer still speaks of "owner".
 */
class DocumentRepository {
  async createDocument({ ownerId, title, abstract, doi, publicationYear, journal, fileName, fileUrl, storageKey, mimeType, fileSize, metadata, status = 'processing' }) {
    const query = `
      INSERT INTO documents (
        uploader_id, title, file_name, file_type, abstract, doi, publication_year, journal,
        file_url, storage_key, file_size, status, visibility, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'private', $13)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      ownerId,
      title || fileName || 'Untitled document',
      fileName || title || 'document',
      mimeType || 'application/pdf',
      abstract || '',
      doi || null,
      publicationYear || null,
      journal || null,
      fileUrl,
      storageKey || null,
      fileSize || 0,
      status,
      metadata ? JSON.stringify(metadata) : '{}'
    ]);
    return result.rows[0];
  }

  /** API-facing row: the (large) extracted text stays server-side; `indexed` says whether AI Q&A can use it. */
  toPublic(row) {
    if (!row) return row;
    // storage_key is internal; file_url is replaced by a short-lived signed link.
    const { extracted_text, rag_indexed_at, storage_key, ...rest } = row;
    return {
      ...rest,
      file_url: signedUrl(storage_key, row.file_url),
      has_text: Boolean(extracted_text),
      ai_indexed: Boolean(rag_indexed_at),
    };
  }

  async findById(documentId) {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL',
      [documentId]
    );
    return this.toPublic(result.rows[0] || null);
  }

  /** Includes extracted_text — for server-side AI use only, never send to clients. */
  async findWithText(documentId) {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL',
      [documentId]
    );
    return result.rows[0] || null;
  }

  async findByOwner(ownerId) {
    const result = await pool.query(
      `SELECT * FROM documents
       WHERE uploader_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [ownerId]
    );
    return result.rows.map((r) => this.toPublic(r));
  }

  async updateStatus(documentId, status) {
    const result = await pool.query(
      `UPDATE documents SET status = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, status, updated_at`,
      [status, documentId]
    );
    return result.rows[0] || null;
  }

  /** Only provided fields change; `doi: null` clears it. */
  async updateOwned(documentId, ownerId, { title, doi, visibility }) {
    const sets = [];
    const params = [documentId, ownerId];
    if (title !== undefined) { params.push(title); sets.push(`title = $${params.length}`); }
    if (doi !== undefined) { params.push(doi); sets.push(`doi = $${params.length}`); }
    if (visibility !== undefined) { params.push(visibility); sets.push(`visibility = $${params.length}`); }
    if (!sets.length) return this.findById(documentId);
    const result = await pool.query(
      `UPDATE documents SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND uploader_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      params
    );
    return this.toPublic(result.rows[0] || null);
  }

  async softDelete(documentId, ownerId) {
    const result = await pool.query(
      `UPDATE documents SET deleted_at = NOW()
       WHERE id = $1 AND uploader_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [documentId, ownerId]
    );
    return result.rows.length > 0;
  }
}

module.exports = new DocumentRepository();
