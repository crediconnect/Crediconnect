const { dataStore, clientKey, checkRateLimit, json, sendTelegramMessage } = require('./_shared');

// This endpoint is public and unauthenticated by design (any site visitor
// can trigger it after submitting a form) — which also means anyone could
// call it directly to spam the staff Telegram bot. Cap it per client IP.
const NOTIFY_RATE_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  const store = dataStore(event);
  const rate = await checkRateLimit(store, 'notify-telegram', clientKey(event), NOTIFY_RATE_LIMIT);
  if (rate.limited) return json(429, { error: 'Too many requests. Please try again later.' });

  // Kept deliberately minimal: this alert exists so staff know to go check
  // the Netlify dashboard, not to carry the visitor's personal details
  // through a third-party chat app. Name/email/company live only in the
  // actual form submission (Netlify Forms), which staff view there.
  const { type, position } = body;
  let text;
  if (type === 'contact') {
    text = '📩 New contact inquiry received — check the Netlify dashboard for details.';
  } else if (type === 'careers') {
    const role = position ? ` for ${String(position).slice(0, 80)}` : '';
    text = `🧑‍💼 New job application received${role} — check the Netlify dashboard for details.`;
  } else {
    return json(400, { error: 'Unknown notification type' });
  }

  const result = await sendTelegramMessage(text);
  if (!result.ok) return json(502, { error: result.error });

  return json(200, { ok: true });
};
