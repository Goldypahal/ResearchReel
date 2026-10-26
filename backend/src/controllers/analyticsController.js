const analyticsService = require('../services/analyticsService');
const { sendError } = require('../utils/response');

/** snake_case names only; server-side event types (view_post, view_reel…) can't be forged from the client. */
const EVENT_NAME = /^[a-z][a-z0-9_]{2,49}$/;
const SERVER_ONLY = new Set(['view_post', 'view_reel', 'react_post']);

/** Ingests product telemetry from the web client into analytics_events. Works signed in or out. */
exports.trackEvent = async (req, res, next) => {
  try {
    const { eventName, payload = {}, entityId, entityType } = req.body || {};
    if (typeof eventName !== 'string' || !EVENT_NAME.test(eventName) || SERVER_ONLY.has(eventName)) {
      return sendError(res, 'Unknown or missing eventName.', 400, 'VALIDATION_ERROR', req);
    }
    const metadata = typeof payload === 'object' && payload !== null ? payload : {};
    if (JSON.stringify(metadata).length > 4000) {
      return sendError(res, 'payload is too large.', 413, 'PAYLOAD_TOO_LARGE', req);
    }

    await analyticsService.trackEvent({
      user_id: req.user ? req.user.id : null,
      event_type: eventName,
      entity_id: entityId,
      entity_type: entityType,
      metadata: { ...metadata, user_agent: (req.headers['user-agent'] || '').slice(0, 200) },
    });
    return res.status(202).json({ success: true, accepted: true });
  } catch (error) {
    next(error);
  }
};
