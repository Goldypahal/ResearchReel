/**
 * Standard API Success Response (Section 3 + backwards compatible fields for client/test suites)
 */
const sendSuccess = (res, data = {}, message = 'Operation successful', statusCode = 200) => {
  const payload = {
    success: true,
    data,
    message
  };

  // Backwards-compatible convenience top-level fields
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.user) payload.user = data.user;
    if (data.email) payload.email = data.email;
    if (data.token) payload.token = data.token;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Standard API Error Response (Section 3 + top-level message fallback)
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', req = null) => {
  const requestId = req?.id || 'req_unknown';
  return res.status(statusCode).json({
    success: false,
    message, // Backwards-compatibility for existing tests/clients
    error: {
      code,
      message
    },
    requestId
  });
};

module.exports = {
  sendSuccess,
  sendError
};
