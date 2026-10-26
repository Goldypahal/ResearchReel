const pool = require('../config/db');

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

  async findById(documentId) {
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
    return result.rows;
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
