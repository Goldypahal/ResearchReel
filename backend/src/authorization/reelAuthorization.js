const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Reel drafts (reel_drafts) are private to their author until published,
 * at which point they become a row in "videos".
 */
async function canAccessReel(userId, reelId) {
  if (!reelId) return { allowed: false, isAuthor: false };

  const result = await pool.query(
    'SELECT id, author_id, status FROM reel_drafts WHERE id = $1',
    [reelId]
  );
  if (result.rows.length === 0) {
    return { allowed: false, isAuthor: false };
  }

  const isAuthor = Boolean(userId && result.rows[0].author_id === userId);
  return { allowed: isAuthor, isAuthor };
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
