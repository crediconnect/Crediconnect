const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'crediconnect-data';

function dataStore() {
  // On most Netlify sites, getStore(name) auto-detects the site/credentials.
  // Some sites don't get that automatic context (MissingBlobsEnvironmentError),
  // so we fall back to explicit credentials if they're set as env vars.
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }
  return getStore(STORE_NAME);
}

// Legacy check: compares the password sent by the admin page against the
// ADMIN_PASSWORD environment variable. Still supported so the site keeps
// working even if the Telegram OTP step below is never configured.
function isAuthorized(event) {
  const provided = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // fail closed if no password has been configured
  return provided === expected;
}

// Newer check: also accepts a short-lived session token issued by
// verify-otp.js after the admin completes password + Telegram OTP.
async function isAuthorizedAsync(event) {
  if (isAuthorized(event)) return true;
  const token = event.headers['x-admin-session'] || event.headers['X-Admin-Session'];
  if (!token) return false;
  try {
    const store = dataStore();
    const session = await store.get(`session:${token}`, { type: 'json' });
    return !!(session && session.expires > Date.now());
  } catch {
    return false;
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

// Sends a message via the Telegram Bot API. Requires TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID environment variables. Returns { ok:false, error } instead
// of throwing so callers can turn that straight into a JSON error response.
async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return { ok: false, error: 'Telegram is not configured yet (missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `Telegram rejected the request: ${detail || res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach Telegram.' };
  }
}

module.exports = { dataStore, isAuthorized, isAuthorizedAsync, json, sendTelegramMessage };
