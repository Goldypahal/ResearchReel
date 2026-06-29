const db = require('../config/db');
const analyticsService = require('../services/analyticsService');

// Get Reels Feed (Infinite Scroll - Section 3.3)
exports.getReels = async (req, res) => {
  try {
    const reels = await db.query(`
      SELECT 
        v.*, 
        u.username, u.full_name, u.profile_picture_url, u.verification_status,
        (SELECT COUNT(*) FROM analytics_events ae WHERE ae.entity_id = v.id AND ae.event_type = 'view_video') as view_count,
        (SELECT COUNT(*) FROM analytics_events ae WHERE ae.entity_id = v.id AND ae.event_type = 'like_video') as like_count
      FROM videos v
      JOIN users u ON v.author_id = u.id
      ORDER BY v.created_at DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      data: reels.rows
    });
  } catch (error) {
    console.error('Failed to fetch reels:', error);
    res.status(500).json({ success: false, message: 'Reels fetch failed' });
  }
};

// Upload & Process Reel (Section 8.4)
exports.uploadReel = async (req, res) => {
  const { author_id, title, description, video_url, linked_paper_id, timestamps, tags } = req.body;

  try {
    const thumbnail_url = video_url ? video_url.replace('.mp4', '_thumb.jpg') : '/uploads/processed/default_thumb.jpg';
    const duration_seconds = 45; // Mocked

    const cleanTags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);

    const newReel = await db.query(
      `INSERT INTO videos (author_id, title, description, video_url, thumbnail_url, duration_seconds, linked_paper_id, timestamps, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [author_id, title, description, video_url || '', thumbnail_url, duration_seconds, linked_paper_id || null, JSON.stringify(timestamps || []), cleanTags]
    );

    res.status(201).json({
      success: true,
      message: 'Processing started. You will be notified when live.',
      data: newReel.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Video upload processing failed' });
  }
};

// Toggle Reaction on Reel
exports.reactToReel = async (req, res) => {
  const { video_id, reaction_type } = req.body;
  const user_id = req.user.id;

  try {
    if (!video_id) {
      return res.status(400).json({ success: false, message: 'video_id is required' });
    }

    // Register like/reaction in analytics
    await analyticsService.trackEvent({
      user_id,
      event_type: 'like_video',
      entity_id: video_id,
      entity_type: 'video',
      metadata: { reaction_type: reaction_type || 'like' }
    });

    res.status(200).json({ success: true, message: 'Reel reaction recorded' });
  } catch (error) {
    console.error('Failed to react to reel:', error);
    res.status(500).json({ success: false, message: 'Reel reaction failed' });
  }
};

// Track video view
exports.viewReel = async (req, res) => {
  const { video_id } = req.body;
  const user_id = req.user ? req.user.id : null;

  try {
    if (!video_id) {
      return res.status(400).json({ success: false, message: 'video_id is required' });
    }

    await analyticsService.trackEvent({
      user_id,
      event_type: 'view_video',
      entity_id: video_id,
      entity_type: 'video'
    });

    res.status(200).json({ success: true, message: 'View recorded' });
  } catch (error) {
    console.error('Failed to record video view:', error);
    res.status(500).json({ success: false, message: 'Failed to record view' });
  }
};

