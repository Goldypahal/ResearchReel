const pool = require('../config/db');

class DocumentRepository {
  /**
   * Registers a newly uploaded document record
   */
  async createDocument({ ownerId, title, abstract, doi, publicationYear, journal, fileUrl, storageKey, mimeType, fileSize, metadata }) {
    const query = `
      INSERT INTO documents (
        owner_id, title, abstract, doi, publication_year, journal,
        file_url, storage_key, mime_type, file_size, status, visibility, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PROCESSING', 'private', $11)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      ownerId,
      title || 'Untitled Document',
      abstract || '',
      doi || null,
      publicationYear || null,
      journal || null,
      fileUrl || '',
      storageKey || '',
      mimeType || 'application/pdf',
      fileSize || 0,
      metadata ? JSON.stringify(metadata) : '{}'
    ]);
    return result.rows[0];
  }

  /**
   * Finds a document by ID enforcing soft deletion filtering
   */
  async findById(documentId) {
    const query = `
      SELECT * FROM documents
      WHERE id = $1 AND deleted_at IS NULL;
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows[0] || null;
  }

  /**
   * Finds documents belonging to a user
   */
  async findByOwner(ownerId) {
    const query = `
      SELECT * FROM documents
      WHERE owner_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [ownerId]);
    return result.rows;
  }

  /**
   * Updates document status (e.g. PROCESSING -> READY -> FAILED)
   */
  async updateStatus(documentId, status) {
    const query = `
      UPDATE documents
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, status, updated_at;
    `;
    const result = await pool.query(query, [status, documentId]);
    return result.rows[0] || null;
  }

  /**
   * Soft deletes a document
   */
  async softDelete(documentId, ownerId) {
    const query = `
      UPDATE documents
      SET deleted_at = NOW()
      WHERE id = $1 AND owner_id = $2
      RETURNING id;
    `;
    const result = await pool.query(query, [documentId, ownerId]);
    return result.rows.length > 0;
  }
}

module.exports = new DocumentRepository();
