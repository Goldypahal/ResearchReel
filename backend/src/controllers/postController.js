const feedService = require('../services/feedService');
const analyticsService = require('../services/analyticsService');
const PlagiarismService = require('../services/plagiarismService');
const { moderateText } = require('../utils/moderator');

// Get All Posts (Feed Generation - Section 3.2)
exports.getFeed = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const result = await feedService.getFeed(cursor, parseInt(limit) || 20);
    res.status(200).json({
      success: true,
      count: result.posts.length,
      data: result.posts,
      nextCursor: result.nextCursor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not fetch feed' });
  }
};

// Create Post (Step-by-step creation for text, image, doc, code)
exports.createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    
    // Content Moderation check
    const modCheck = moderateText(caption);
    if (!modCheck.clean) {
      return res.status(400).json({
        success: false,
        message: `Post content violates our community guidelines (detected keyword: "${modCheck.matchedKeyword}").`
      });
    }

    const postData = {
      ...req.body,
      author_id: req.user.id
    };
    const newPost = await feedService.createPost(postData);
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Post creation failed' });
  }
};

// React to Post (Section 3.2.3)
exports.reactToPost = async (req, res) => {
  try {
    const { post_id, reaction_type } = req.body;
    const user_id = req.user.id;
    await feedService.reactToPost({ post_id, user_id, reaction_type });

    // Track reaction in analytics
    await analyticsService.trackEvent({
      user_id: user_id,
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
    // 1. Check for Plagiarism before accepting document
    // We simulate extracting text and running it through the scanner
    const mockExtractedText = req.body.summary_text || req.body.title || "Sample research text...";
    const scanResult = await PlagiarismService.scanDocument(mockExtractedText);
    
    if (!scanResult.isOriginal) {
      return res.status(400).json({ 
        success: false, 
        message: 'Document rejected due to plagiarism checks failing.',
        similarityScore: scanResult.similarityScore,
        flaggedSections: scanResult.flaggedSections
      });
    }

    const docData = {
      ...req.body,
      uploader_id: req.user.id,
      is_verified: scanResult.isOriginal
    };
    
    const newDoc = await feedService.uploadDocument(docData);
    res.status(201).json({ success: true, data: newDoc, scanResult });
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

