const { dataStore, isAuthorized, clientKey, checkRateLimit, clearRateLimit, json } = require('./_shared');

// Failed password attempts are limited per client IP: 5 tries per 15
// minutes, then a 15-minute lockout, to make brute-forcing the single
// shared admin password impractical.
const LOGIN_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const store = dataStore(event);
  const id = clientKey(event);
  const rate = await checkRateLimit(store, 'admin-login', id, LOGIN_RATE_LIMIT);
  if (rate.limited) {
    return json(429, {
      error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 60000)} minute(s).`,
    });
  }

  if (!isAuthorized(event)) return json(401, { error: 'Incorrect password' });

  // Correct password — this client is no longer counted toward the limit.
  await clearRateLimit(store, 'admin-login', id);
  return json(200, { ok: true });
};
