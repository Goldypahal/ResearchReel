const pool = require('../config/db');

/**
 * MOCK: Generates a presigned S3 URL for uploading assets.
 * In production, this uses AWS SDK `getSignedUrl`.
 */
exports.generateUploadUrl = async (req, res, next) => {
  try {
    const { fileName, mimeType } = req.body;
    const userId = req.user.id;

    if (!fileName || !mimeType) {
      return res.status(400).json({ error: 'fileName and mimeType are required' });
    }

    const s3Key = `users/${userId}/${Date.now()}_${fileName}`;
    
    // MOCK: Generate fake upload URL for local dev
    const uploadUrl = `https://mock-s3.local/upload?key=${encodeURIComponent(s3Key)}`;

    res.status(200).json({
      uploadUrl,
      s3Key,
      bucket: 'rr-staging-uploads'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registers the uploaded asset into the PostgreSQL database.
 */
exports.registerAsset = async (req, res, next) => {
  try {
    const { fileName, sizeBytes, mimeType, s3Bucket, s3Key, publicUrl, metadata, tags } = req.body;
    const userId = req.user.id;

    const query = `
      INSERT INTO media_assets 
        (owner_id, file_name, file_size_bytes, mime_type, s3_bucket, s3_key, public_url, metadata, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [
      userId, fileName, sizeBytes, mimeType, s3Bucket, s3Key, publicUrl, 
      metadata || {}, tags || []
    ];

    const result = await pool.query(query, values);
    
    res.status(201).json({
      message: 'Asset registered successfully',
      asset: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft deletes an asset (moves to trash, kept for 30 days).
 */
exports.softDeleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      UPDATE media_assets
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND owner_id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found or unauthorized' });
    }

    res.status(200).json({
      message: 'Asset moved to trash',
      asset: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all non-deleted assets for the authenticated user.
 */
exports.getUserAssets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT * FROM media_assets 
      WHERE owner_id = $1 AND is_deleted = FALSE
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [userId]);
    
    res.status(200).json({
      assets: result.rows
    });
  } catch (error) {
    next(error);
  }
};
