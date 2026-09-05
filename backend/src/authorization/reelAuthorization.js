const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Validates reel ownership or public access
 */
async function canAccessReel(userId, reelId) {
  if (!reelId) return { allowed: false, isAuthor: false };

  const query = `
    SELECT id, author_id, visibility, status 
    FROM reels 
    WHERE id = $1 AND (deleted_at IS NULL);
  `;
  const result = await pool.query(query, [reelId]);
  if (result.rows.length === 0) {
    return { allowed: false, isAuthor: false };
  }

  const reel = result.rows[0];
  const isAuthor = Boolean(userId && reel.author_id === userId);

  if (isAuthor) {
    return { allowed: true, isAuthor: true };
  }

  if (reel.visibility === 'public' && reel.status === 'published') {
    return { allowed: true, isAuthor: false };
  }

  return { allowed: false, isAuthor: false };
}

const authorizeReelOwner = () => {
  return async (req, res, next) => {
    try {
      const reelId = req.params.id || req.body.reelId || req.body.reel_id;
      if (!reelId) {
        throw new NotFoundError('Reel ID is required');
      }

      const { allowed, isAuthor } = await canAccessReel(req.user.id, reelId);
      if (!allowed || !isAuthor) {
        throw new AuthorizationError('Only the reel author can perform this operation');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  canAccessReel,
  authorizeReelOwner
};
