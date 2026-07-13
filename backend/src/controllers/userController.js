const db = require('../config/db');

// Get User Profile (Section 3.6.1)
exports.getProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await db.query(`
      SELECT 
        u.*, 
        i.name as institution_name, i.logo_url as institution_logo,
        (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id) as post_count,
        (SELECT COUNT(*) FROM videos v WHERE v.author_id = u.id) as video_count,
        (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) as following_count
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.username = $1
    `, [username]);

    if (user.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: user.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Profile fetch failed' });
  }
};

const analyticsService = require('../services/analyticsService');

// Get Profile Analytics (Section 3.6.3 / 15.1)
exports.getAnalytics = async (req, res) => {
  const { user_id } = req.params;

  try {
    const analytics = await analyticsService.getProfileAnalytics(user_id);
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ success: false, message: 'Analytics fetch failed' });
  }
};


// Update Profile (Section 3.6.3)
// NOTE: user_id is taken from the authenticated token (req.user.id),
// NOT from the request body, to prevent authorization bypass.
exports.updateProfile = async (req, res) => {
  const { bio, research_interests } = req.body;
  const user_id = req.user.id;

  try {
    const updatedUser = await db.query(
      'UPDATE users SET bio = $1, research_interests = $2, last_active = NOW() WHERE id = $3 RETURNING *',
      [bio, research_interests, user_id]
    );

    res.status(200).json({ success: true, data: updatedUser.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};
