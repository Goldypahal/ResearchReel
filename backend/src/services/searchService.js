const { Client } = require('@elastic/elasticsearch');
const db = require('../config/db');

// Instantiate Elasticsearch Client
let esClient = null;
try {
  if (process.env.ELASTICSEARCH_URL) {
    esClient = new Client({
      node: process.env.ELASTICSEARCH_URL,
      maxRetries: 3,
      requestTimeout: 3000,
    });
  }
} catch (error) {
  console.warn('Elasticsearch initialization failed, falling back to database search:', error.message);
}

/**
 * Perform a search across documents, posts, videos, and users.
 * Supports Elasticsearch with full SQL query fallback.
 */
const searchDocuments = async (query, type = 'all', cursor = null, limit = 10) => {
  const searchTerm = query ? query.trim() : '';

  if (esClient) {
    try {
      const searchQueries = [];
      const indices = [];

      if (type === 'all' || type === 'document') {
        indices.push('researchreel_documents');
      }
      if (type === 'all' || type === 'post') {
        indices.push('researchreel_posts');
      }
      if (type === 'all' || type === 'video') {
        indices.push('researchreel_videos');
      }
      if (type === 'all' || type === 'user') {
        indices.push('researchreel_users');
      }

      const body = {
        query: {
          multi_match: {
            query: searchTerm,
            fields: ['title^3', 'caption^2', 'username^4', 'full_name^3', 'summary_text', 'tags^2'],
            fuzziness: 'AUTO'
          }
        },
        size: limit,
        sort: [
          { _score: 'desc' },
          { id: 'desc' }
        ]
      };

      if (cursor) {
        body.search_after = cursor.split(',');
      }

      const result = await esClient.search({
        index: indices.join(','),
        body,
        ignore_unavailable: true
      });

      const hits = result.hits.hits;
      let nextCursor = null;
      if (hits.length > 0 && hits[hits.length - 1].sort) {
        nextCursor = hits[hits.length - 1].sort.join(',');
      }

      return {
        results: hits.map(hit => ({
          id: hit._source.id,
          type: hit._index.replace('researchreel_', '').replace(/s$/, ''), // convert researchreel_posts -> post
          title: hit._source.title || hit._source.caption || hit._source.username || hit._source.file_name || '',
          description: hit._source.description || hit._source.summary_text || hit._source.full_name || '',
          score: hit._score,
          metadata: hit._source
        })),
        nextCursor
      };
    } catch (error) {
      console.warn('Elasticsearch query failed, falling back to database query:', error.message);
    }
  }

  // Fallback database query using ILIKE
  return searchDatabaseFallback(searchTerm, type, cursor, limit);
};

/**
 * Fallback search queries for PostgreSQL database
 */
const searchDatabaseFallback = async (searchTerm, type, cursor, limit) => {
  const offset = cursor ? parseInt(cursor) : 0;
  const ilikePattern = `%${searchTerm}%`;
  const results = [];

  try {
    const queries = [];

    // Documents query
    if (type === 'all' || type === 'document') {
      queries.push(
        db.query(`
          SELECT id, 'document' AS type, file_name AS title, summary_text AS description, created_at
          FROM documents
          WHERE file_name ILIKE $1 OR summary_text ILIKE $1
          LIMIT $2 OFFSET $3
        `, [ilikePattern, limit, offset]).then(res => res.rows)
      );
    }

    // Users query
    if (type === 'all' || type === 'user') {
      queries.push(
        db.query(`
          SELECT id, 'user' AS type, username AS title, full_name AS description, created_at
          FROM users
          WHERE username ILIKE $1 OR full_name ILIKE $1
          LIMIT $2 OFFSET $3
        `, [ilikePattern, limit, offset]).then(res => res.rows)
      );
    }

    // Posts query
    if (type === 'all' || type === 'post') {
      queries.push(
        db.query(`
          SELECT id, 'post' AS type, caption AS title, array_to_string(tags, ' ') AS description, created_at
          FROM posts
          WHERE caption ILIKE $1 OR $2 = ANY(tags)
          LIMIT $3 OFFSET $4
        `, [ilikePattern, searchTerm, limit, offset]).then(res => res.rows)
      );
    }

    // Videos query
    if (type === 'all' || type === 'video') {
      queries.push(
        db.query(`
          SELECT id, 'video' AS type, title, description, created_at
          FROM videos
          WHERE title ILIKE $1 OR description ILIKE $1
          LIMIT $2 OFFSET $3
        `, [ilikePattern, limit, offset]).then(res => res.rows.map(r => ({ ...r, title: r.title, description: r.description })))
      );
    }

    const queryResults = await Promise.all(queries);
    queryResults.forEach(rows => {
      results.push(...rows);
    });

    // Sort results by date or simple relevance matching
    const mapped = results.map(item => {
      let score = 0.5;
      const lowerTitle = (item.title || '').toLowerCase();
      const lowerDesc = (item.description || '').toLowerCase();
      const lowerSearch = searchTerm.toLowerCase();
      
      if (lowerTitle === lowerSearch) score = 1.0;
      else if (lowerTitle.startsWith(lowerSearch)) score = 0.9;
      else if (lowerTitle.includes(lowerSearch)) score = 0.8;
      else if (lowerDesc.includes(lowerSearch)) score = 0.6;

      return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        score
      };
    }).sort((a, b) => b.score - a.score);

    const nextCursor = mapped.length > 0 ? (offset + limit).toString() : null;

    return {
      results: mapped,
      nextCursor
    };

  } catch (error) {
    console.error('Database fallback search failed:', error);
    return { results: [], nextCursor: null };
  }
};

/**
 * Elasticsearch Indexing hooks
 */
const indexEntity = async (index, id, document) => {
  if (!esClient) return;
  try {
    await esClient.index({
      index: `researchreel_${index}`,
      id,
      body: document,
      refresh: true
    });
  } catch (error) {
    console.error(`Failed to index entity in ${index}:`, error.message);
  }
};

const removeEntity = async (index, id) => {
  if (!esClient) return;
  try {
    await esClient.delete({
      index: `researchreel_${index}`,
      id,
      refresh: true
    });
  } catch (error) {
    console.error(`Failed to remove entity from ${index}:`, error.message);
  }
};

module.exports = {
  searchDocuments,
  indexEntity,
  removeEntity
};

