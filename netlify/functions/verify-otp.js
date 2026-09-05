const crypto = require('crypto');
const { dataStore, json } = require('./_shared');

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — admin staff-portal session
const VERIFIED_TTL_MS = 30 * 60 * 1000; // 30 minutes — contact/careers verified-email token

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  const { purpose, code } = body;
  if (!code || !/^\d{6}$/.test(String(code))) {
    return json(400, { error: 'Enter the 6-digit code.' });
  }

  const store = dataStore();

  if (purpose === 'admin') {
    const expectedPw = process.env.ADMIN_PASSWORD;
    if (!expectedPw || body.password !== expectedPw) {
      return json(401, { error: 'Incorrect password.' });
    }
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return json(500, { error: 'ADMIN_EMAIL is not configured.' });

    const key = `otp:admin:${adminEmail.toLowerCase()}`;
    const record = await store.get(key, { type: 'json' });
    if (!record || record.code !== String(code) || record.expires < Date.now()) {
      return json(401, { error: 'That code is incorrect or has expired.' });
    }
    await store.delete(key);

    const token = crypto.randomBytes(24).toString('hex');
    await store.setJSON(`session:${token}`, { expires: Date.now() + SESSION_TTL_MS });
    return json(200, { ok: true, token });
  }

  if (purpose === 'contact' || purpose === 'careers') {
    const email = body.email;
    if (!email) return json(400, { error: 'Email is required.' });

    const key = `otp:${purpose}:${String(email).toLowerCase()}`;
    const record = await store.get(key, { type: 'json' });
    if (!record || record.code !== String(code) || record.expires < Date.now()) {
      return json(401, { error: 'That code is incorrect or has expired.' });
    }
    await store.delete(key);

    const token = crypto.randomBytes(16).toString('hex');
    await store.setJSON(`verified:${purpose}:${String(email).toLowerCase()}`, {
      token,
      expires: Date.now() + VERIFIED_TTL_MS,
    });
    return json(200, { ok: true, token });
  }

  return json(400, { error: 'Unknown purpose' });
};
