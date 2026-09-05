const crypto = require('crypto');
const { dataStore, json } = require('./_shared');

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — admin staff-portal session

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

  const expectedPw = process.env.ADMIN_PASSWORD;
  if (!expectedPw || body.password !== expectedPw) {
    return json(401, { error: 'Incorrect password.' });
  }

  try {
    const store = dataStore(event);
    const key = 'otp:admin';
    const record = await store.get(key, { type: 'json' });
    if (!record || record.code !== String(code) || record.expires < Date.now()) {
      return json(401, { error: 'That code is incorrect or has expired.' });
    }
    await store.delete(key);

    const token = crypto.randomBytes(24).toString('hex');
    await store.setJSON(`session:${token}`, { expires: Date.now() + SESSION_TTL_MS });
    return json(200, { ok: true, token });
  } catch (err) {
    return json(500, { error: `Could not verify the code (${err.message || 'storage error'}).` });
  }
};
