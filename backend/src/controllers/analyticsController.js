/**
 * MOCK: Ingests telemetry events from the client.
 * In production, this would stream to a Kafka topic or directly to ClickHouse.
 */
exports.trackEvent = async (req, res, next) => {
  try {
    const { eventName, payload } = req.body;
    
    // Validate required fields
    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    const userId = req.user ? req.user.id : 'anonymous';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Construct telemetry object
    const telemetryEvent = {
      event_name: eventName,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      payload_json: payload || {},
      created_at: new Date().toISOString()
    };

    // [ARCHITECTURAL MOCK]: We log the event to standard output
    // A microservice worker would pipe this to ClickHouse Engine=MergeTree
    console.log('[TELEMETRY_INGEST]', JSON.stringify(telemetryEvent));

    // Respond quickly to not block client thread
    res.status(202).json({
      status: 'accepted',
      received: true
    });
  } catch (error) {
    next(error);
  }
};
