/**
 * Parses ?limit and ?cursor query params into safe values.
 * Cursors are ISO timestamps (created_at of the last item in the previous page).
 */
const parsePage = (query, defaultLimit = 20, maxLimit = 50) => {
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = defaultLimit;
  limit = Math.min(limit, maxLimit);

  let cursor = null;
  if (query.cursor) {
    const d = new Date(query.cursor);
    if (!Number.isNaN(d.getTime())) cursor = d.toISOString();
  }
  return { limit, cursor };
};

const nextCursorOf = (rows, limit, field = 'created_at') => {
  if (!rows.length || rows.length < limit) return null;
  const last = rows[rows.length - 1][field];
  return last ? new Date(last).toISOString() : null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

module.exports = { parsePage, nextCursorOf, isUuid };
