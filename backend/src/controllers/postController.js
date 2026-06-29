const feedService = require('../services/feedService');
const analyticsService = require('../services/analyticsService');

// Get All Posts (Feed Generation - Section 3.2)
exports.getFeed = async (req, res) => {
  try {
    const posts = await feedService.getFeed();
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not fetch feed' });
  }
};

// Create Post (Step-by-step creation for text, image, doc, code)
exports.createPost = async (req, res) => {
  try {
    const newPost = await feedService.createPost(req.body);
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Post creation failed' });
  }
};

// React to Post (Section 3.2.3)
exports.reactToPost = async (req, res) => {
  try {
    const { post_id, user_id, reaction_type } = req.body;
    await feedService.reactToPost(req.body);

    // Track reaction in analytics
    await analyticsService.trackEvent({
      user_id: user_id || req.user?.id,
      event_type: 'react_post',
      entity_id: post_id,
      entity_type: 'post',
      metadata: { reaction_type }
    });

    res.status(200).json({ success: true, message: 'Reaction updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Reaction failed' });
  }
};

// Document Upload & Analysis (Section 4.1 / 4.2)
exports.uploadDocument = async (req, res) => {
  try {
    const newDoc = await feedService.uploadDocument(req.body);
    res.status(201).json({ success: true, data: newDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Document upload failed' });
  }
};

// Track view on post
exports.viewPost = async (req, res) => {
  const { post_id } = req.body;
  const user_id = req.user ? req.user.id : null;

  try {
    if (!post_id) {
      return res.status(400).json({ success: false, message: 'post_id is required' });
    }

    await analyticsService.trackEvent({
      user_id,
      event_type: 'view_post',
      entity_id: post_id,
      entity_type: 'post'
    });

    res.status(200).json({ success: true, message: 'Post view recorded' });
  } catch (error) {
    console.error('Failed to record post view:', error);
    res.status(500).json({ success: false, message: 'Failed to record view' });
  }
};

