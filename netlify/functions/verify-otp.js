const crypto = require('crypto');
const { dataStore, clientKey, checkRateLimit, clearRateLimit, safeEqual, json } = require('./_shared');

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — admin staff-portal session (absolute cap)
const MAX_CODE_ATTEMPTS = 5; // wrong guesses against a single issued code before it's burned

// Separate, tighter limit on top of the per-code attempt cap: even across
// multiple requested codes, a client only gets a handful of verify tries
// per window before a cooldown.
const VERIFY_RATE_LIMIT = { maxAttempts: 8, windowMs: 15 * 60 * 1000 };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  const { purpose, code } = body;
  if (purpose !== 'admin') return json(400, { error: 'Unknown purpose' });
  if (!code || !/^\d{6}$/.test(String(code))) {
    return json(400, { error: 'Enter the 6-digit code.' });
  }

  const store = dataStore(event);
  const id = clientKey(event);
  const rate = await checkRateLimit(store, 'verify-otp', id, VERIFY_RATE_LIMIT);
  if (rate.limited) {
    return json(429, {
      error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 60000)} minute(s).`,
    });
  }

  const expectedPw = process.env.ADMIN_PASSWORD;
  if (!expectedPw || !body.password || !safeEqual(body.password, expectedPw)) {
    return json(401, { error: 'Incorrect password.' });
  }

  try {
    const key = 'otp:admin';
    const record = await store.get(key, { type: 'json' });
    if (!record || record.expires < Date.now()) {
      return json(401, { error: 'That code is incorrect or has expired.' });
    }
    if ((record.attempts || 0) >= MAX_CODE_ATTEMPTS) {
      await store.delete(key);
      return json(401, { error: 'Too many incorrect attempts. Request a new code.' });
    }
    if (!safeEqual(String(code), record.code)) {
      record.attempts = (record.attempts || 0) + 1;
      try { await store.setJSON(key, record); } catch { /* best effort */ }
      return json(401, { error: 'That code is incorrect or has expired.' });
    }
    await store.delete(key);
    await clearRateLimit(store, 'verify-otp', id);

    const token = crypto.randomBytes(24).toString('hex');
    const expires = Date.now() + SESSION_TTL_MS;
    await store.setJSON(`session:${token}`, { expires, absoluteExpires: expires });
    return json(200, { ok: true, token });
  } catch (err) {
    return json(500, { error: `Could not verify the code (${err.message || 'storage error'}).` });
  }
};
