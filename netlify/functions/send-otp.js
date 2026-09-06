const crypto = require('crypto');
const { dataStore, clientKey, checkRateLimit, json, sendTelegramMessage } = require('./_shared');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Limits how often a code can be requested, so this can't be used to spam
// the staff Telegram chat or to keep generating fresh codes while brute
// forcing verify-otp.
const SEND_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  // Only the Staff Portal admin sign-in uses a code today. It's always sent
  // to the fixed staff Telegram chat, never to a value the caller supplies.
  if (body.purpose !== 'admin') return json(400, { error: 'Unknown purpose' });

  const store = dataStore(event);
  const rate = await checkRateLimit(store, 'send-otp', clientKey(event), SEND_RATE_LIMIT);
  if (rate.limited) {
    return json(429, {
      error: `Too many code requests. Try again in ${Math.ceil(rate.retryAfterMs / 60000)} minute(s).`,
    });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  try {
    await store.setJSON('otp:admin', {
      code,
      expires: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });
  } catch (err) {
    return json(500, { error: `Could not save the code (${err.message || 'storage error'}).` });
  }

  const result = await sendTelegramMessage(
    `🔐 CrediConnect Staff Portal sign-in code: ${code}\n\nExpires in 10 minutes. If you didn't request this, you can ignore it.`
  );
  if (!result.ok) return json(502, { error: result.error });

  return json(200, { ok: true, sentTo: 'the staff Telegram chat' });
};
