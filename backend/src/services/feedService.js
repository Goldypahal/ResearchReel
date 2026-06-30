const db = require('../config/db');
const searchService = require('./searchService');
const aiService = require('./aiService');

const getFeed = async () => {
  const posts = await db.query(`
    SELECT 
      p.*, 
      u.username, u.full_name, u.profile_picture_url, u.verification_status,
      d.file_name, d.summary_text,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as reaction_count
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN documents d ON p.document_id = d.id
    ORDER BY p.created_at DESC
    LIMIT 20
  `);

  return posts.rows;
};

const createPost = async ({ author_id, content_type, caption, media_urls, document_id, tags, publication_status, doi }) => {
  const newPost = await db.query(
    `INSERT INTO posts (author_id, content_type, caption, media_urls, document_id, tags, publication_status, doi) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [author_id, content_type, caption, media_urls, document_id, tags, publication_status, doi]
  );
  const post = newPost.rows[0];

  try {
    await searchService.indexEntity('posts', post.id, {
      id: post.id,
      author_id: post.author_id,
      caption: post.caption,
      tags: post.tags,
      publication_status: post.publication_status,
      content_type: post.content_type
    });
  } catch (err) {
    console.error('Failed to index post in search:', err.message);
  }

  return post;
};

const reactToPost = async ({ post_id, user_id, reaction_type }) => {
  await db.query(
    'INSERT INTO reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT reactions_pkey DO UPDATE SET reaction_type = $3',
    [post_id, user_id, reaction_type]
  );
  return true;
};

const uploadDocument = async ({ uploader_id, file_name, file_type, file_url }) => {
  let newDoc = await db.query(
    `INSERT INTO documents (uploader_id, file_name, file_type, file_url) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [uploader_id, file_name, file_type, file_url]
  );
  let doc = newDoc.rows[0];

  try {
    const aiSummary = await aiService.summarizeDocument(doc.id);
    const updatedDoc = await db.query(
      `UPDATE documents SET summary_text = $1, key_points = $2 WHERE id = $3 RETURNING *`,
      [aiSummary.abstract, aiSummary.key_points, doc.id]
    );
    doc = updatedDoc.rows[0];
  } catch (err) {
    console.error('Failed to generate AI summary:', err.message);
    doc.summary_text = `Fallback Summary: Unable to generate AI insights for ${file_name}.`;
  }

  try {
    await searchService.indexEntity('documents', doc.id, {
      id: doc.id,
      file_name: doc.file_name,
      summary_text: doc.summary_text,
      uploader_id: doc.uploader_id
    });
  } catch (err) {
    console.error('Failed to index document in search:', err.message);
  }

  return doc;
};

module.exports = {
  getFeed,
  createPost,
  reactToPost,
  uploadDocument
};

