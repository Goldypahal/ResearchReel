const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

/** Activity score weights used for the leaderboard. */
const SCORE_SQL = (since) => `
  (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL ${since('p.created_at')}) * 5
  + (SELECT COUNT(*) FROM videos v WHERE v.author_id = u.id AND v.deleted_at IS NULL ${since('v.created_at')}) * 10
  + (SELECT COUNT(*) FROM documents d WHERE d.uploader_id = u.id AND d.deleted_at IS NULL AND d.visibility = 'public' ${since('d.created_at')}) * 15
  + (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id ${since('f.created_at')}) * 3
  + (SELECT COUNT(*) FROM reactions r JOIN posts p ON p.id = r.post_id WHERE p.author_id = u.id AND r.user_id <> u.id ${since('r.created_at')})
  + (SELECT COUNT(*) FROM video_likes l JOIN videos v ON v.id = l.video_id WHERE v.author_id = u.id AND l.user_id <> u.id ${since('l.created_at')})
  + (SELECT COUNT(*) FROM post_comments c JOIN posts p ON p.id = c.post_id WHERE p.author_id = u.id AND c.author_id <> u.id AND c.deleted_at IS NULL ${since('c.created_at')}) * 2
`;

const periodFilter = (period) => {
  const interval = { week: '7 days', month: '30 days' }[period];
  return (col) => (interval ? `AND ${col} > NOW() - INTERVAL '${interval}'` : '');
};

exports.leaderboard = async (req, res, next) => {
  try {
    const period = ['week', 'month', 'all'].includes(req.query.period) ? req.query.period : 'week';
    const field = req.query.field ? String(req.query.field).slice(0, 50) : null;
    const params = [];
    let fieldSql = '';
    if (field) { params.push(`%${field}%`); fieldSql = `AND array_to_string(u.research_interests, ' ') ILIKE $1`; }
    const r = await db.query(
      `SELECT * FROM (
         SELECT u.id, u.username, u.full_name, u.profile_picture_url AS avatar_url, u.verification_status, u.institution,
                u.research_interests, (${SCORE_SQL(periodFilter(period))})::int AS score
           FROM users u WHERE u.is_deleted IS NOT TRUE AND u.email_verified IS TRUE ${fieldSql}
       ) s WHERE s.score > 0 ORDER BY s.score DESC, s.username ASC LIMIT 50`,
      params
    );
    const rows = r.rows.map((row, i) => ({ ...row, rank: i + 1 }));
    let me = null;
    if (req.user) {
      const mine = rows.find((x) => x.id === req.user.id);
      if (mine) me = mine;
      else {
        const s = await db.query(`SELECT (${SCORE_SQL(periodFilter(period))})::int AS score FROM users u WHERE u.id = $1`, [req.user.id]);
        me = { id: req.user.id, score: s.rows[0]?.score || 0, rank: null };
      }
    }
    return sendSuccess(res, { period, leaders: rows, me }, 'Leaderboard.');
  } catch (error) {
    next(error);
  }
};

/** Badge definitions: each is unlocked when its metric reaches the goal. */
const BADGES = [
  { id: 'first_post', name: 'First Words', description: 'Publish your first post.', metric: 'posts', goal: 1, category: 'Research Impact', icon: 'pen' },
  { id: 'prolific', name: 'Prolific Writer', description: 'Publish 25 posts.', metric: 'posts', goal: 25, category: 'Research Impact', icon: 'pen' },
  { id: 'first_paper', name: 'Open Science', description: 'Share your first paper.', metric: 'papers', goal: 1, category: 'Research Impact', icon: 'book' },
  { id: 'library', name: 'Library Builder', description: 'Share 10 papers.', metric: 'papers', goal: 10, category: 'Research Impact', icon: 'book' },
  { id: 'first_reel', name: 'Lights, Camera, Science', description: 'Publish your first reel.', metric: 'reels', goal: 1, category: 'Innovation', icon: 'film' },
  { id: 'director', name: 'Science Communicator', description: 'Publish 10 reels.', metric: 'reels', goal: 10, category: 'Innovation', icon: 'film' },
  { id: 'ai_explorer', name: 'AI Explorer', description: 'Ask the AI research assistant 10 questions.', metric: 'ai_questions', goal: 10, category: 'Innovation', icon: 'bot' },
  { id: 'collaborator', name: 'Collaborator', description: 'Join or create 3 projects.', metric: 'projects', goal: 3, category: 'Innovation', icon: 'users' },
  { id: 'rising', name: 'Rising Voice', description: 'Reach 10 followers.', metric: 'followers', goal: 10, category: 'Social Influence', icon: 'flame' },
  { id: 'influencer', name: 'Thought Leader', description: 'Reach 100 followers.', metric: 'followers', goal: 100, category: 'Social Influence', icon: 'globe' },
  { id: 'appreciated', name: 'Appreciated', description: 'Receive 50 likes across your posts and reels.', metric: 'likes_received', goal: 50, category: 'Social Influence', icon: 'heart' },
  { id: 'conversation', name: 'Conversation Starter', description: 'Receive 25 comments.', metric: 'comments_received', goal: 25, category: 'Social Influence', icon: 'message' },
  { id: 'verified', name: 'Verified Scholar', description: 'Link your ORCID iD.', metric: 'orcid', goal: 1, category: 'Research Impact', icon: 'shield' }
];

const userMetrics = async (userId) => {
  const r = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM posts WHERE author_id = $1 AND deleted_at IS NULL) AS posts,
       (SELECT COUNT(*)::int FROM documents WHERE uploader_id = $1 AND deleted_at IS NULL) AS papers,
       (SELECT COUNT(*)::int FROM videos WHERE author_id = $1 AND deleted_at IS NULL) AS reels,
       (SELECT COUNT(*)::int FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id WHERE c.user_id = $1 AND m.role = 'user') AS ai_questions,
       (SELECT COUNT(*)::int FROM project_members pm JOIN projects p ON p.id = pm.project_id WHERE pm.user_id = $1 AND p.deleted_at IS NULL) AS projects,
       (SELECT COUNT(*)::int FROM follows WHERE following_id = $1) AS followers,
       ((SELECT COUNT(*) FROM reactions r JOIN posts p ON p.id = r.post_id WHERE p.author_id = $1 AND r.user_id <> $1)
        + (SELECT COUNT(*) FROM video_likes l JOIN videos v ON v.id = l.video_id WHERE v.author_id = $1 AND l.user_id <> $1))::int AS likes_received,
       ((SELECT COUNT(*) FROM post_comments c JOIN posts p ON p.id = c.post_id WHERE p.author_id = $1 AND c.author_id <> $1 AND c.deleted_at IS NULL)
        + (SELECT COUNT(*) FROM video_comments c JOIN videos v ON v.id = c.video_id WHERE v.author_id = $1 AND c.author_id <> $1 AND c.deleted_at IS NULL))::int AS comments_received,
       (SELECT CASE WHEN orcid_id IS NOT NULL THEN 1 ELSE 0 END FROM users WHERE id = $1) AS orcid`,
    [userId]
  );
  return r.rows[0];
};

exports.achievements = async (req, res, next) => {
  try {
    let userId = req.user?.id;
    if (req.query.username) {
      const u = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND is_deleted IS NOT TRUE', [req.query.username]);
      if (!u.rows[0]) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
      userId = u.rows[0].id;
    }
    if (!userId) return sendError(res, 'Sign in to see your achievements.', 401, 'AUTHENTICATION_ERROR', req);
    const m = await userMetrics(userId);
    const badges = BADGES.map((b) => {
      const value = m[b.metric] || 0;
      return { ...b, progress: Math.min(value, b.goal), unlocked: value >= b.goal };
    });
    const total = await db.query(`SELECT (${SCORE_SQL(() => '')})::int AS score FROM users u WHERE u.id = $1`, [userId]);
    return sendSuccess(res, {
      metrics: m,
      badges,
      unlocked_count: badges.filter((b) => b.unlocked).length,
      total_score: total.rows[0]?.score || 0
    }, 'Achievements.');
  } catch (error) {
    next(error);
  }
};
