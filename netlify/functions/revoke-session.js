const { revokeSession, json } = require('./_shared');

// Lets the admin UI explicitly sign out, deleting the session token from
// storage immediately rather than leaving it valid until it naturally
// expires up to 2 hours later.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const token = event.headers['x-admin-session'] || event.headers['X-Admin-Session'];
  await revokeSession(event, token);
  return json(200, { ok: true });
};
