const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

const STORE_NAME = 'crediconnect-data';

function dataStore(event) {
  // On most Netlify sites, getStore(name) auto-detects the site/credentials —
  // but only for the newer function API. These functions use the classic
  // `exports.handler = async (event) => {...}` style (Lambda compatibility
  // mode), which needs an explicit connectLambda(event) call first, or
  // getStore() throws MissingBlobsEnvironmentError.
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }
  if (event) connectLambda(event);
  return getStore(STORE_NAME);
}

// Constant-time string comparison so an attacker can't use response-time
// differences to guess the admin password one character at a time. Both
// inputs are hashed to a fixed length first so timingSafeEqual never throws
// on a length mismatch (which would itself leak the real password's length).
function safeEqual(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const bufB = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

// Legacy check: compares the password sent by the admin page against the
// ADMIN_PASSWORD environment variable. Still supported so the site keeps
// working even if the Telegram OTP step below is never configured.
function isAuthorized(event) {
  const provided = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // fail closed if no password has been configured
  if (!provided) return false;
  return safeEqual(provided, expected);
}

// Best-effort client identifier for rate limiting. Netlify sets
// x-nf-client-connection-ip; we fall back to the (spoofable) forwarded
// header, and finally to a shared bucket if neither is present so limits
// still apply rather than being silently skipped.
function clientKey(event) {
  const h = event.headers || {};
  return (
    h['x-nf-client-connection-ip'] ||
    (h['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

// Generic fixed-window rate limiter backed by Netlify Blobs. Tracks attempts
// per key; once `maxAttempts` is hit within `windowMs`, further calls are
// rejected for `lockoutMs` (defaults to the remainder of the window).
// Returns { limited: boolean, retryAfterMs, remaining }.
async function checkRateLimit(store, bucket, id, { maxAttempts = 5, windowMs = 15 * 60 * 1000, lockoutMs } = {}) {
  const key = `ratelimit:${bucket}:${id}`;
  const now = Date.now();
  let record;
  try {
    record = await store.get(key, { type: 'json' });
  } catch {
    record = null;
  }
  if (!record || record.windowStart + windowMs < now) {
    record = { windowStart: now, count: 0, lockedUntil: 0 };
  }
  if (record.lockedUntil && record.lockedUntil > now) {
    return { limited: true, retryAfterMs: record.lockedUntil - now, remaining: 0 };
  }
  record.count += 1;
  if (record.count > maxAttempts) {
    record.lockedUntil = now + (lockoutMs ?? windowMs);
    try { await store.setJSON(key, record); } catch { /* fail open on storage errors */ }
    return { limited: true, retryAfterMs: record.lockedUntil - now, remaining: 0 };
  }
  try { await store.setJSON(key, record); } catch { /* fail open on storage errors */ }
  return { limited: false, retryAfterMs: 0, remaining: maxAttempts - record.count };
}

// Clears rate-limit tracking for a key — call after a *successful* auth so a
// legitimate admin isn't stuck counting toward the limit from earlier typos.
async function clearRateLimit(store, bucket, id) {
  try { await store.delete(`ratelimit:${bucket}:${id}`); } catch { /* best effort */ }
}

// Appends an entry to a capped audit log (most recent MAX_AUDIT_ENTRIES kept)
// so content changes to the live site are traceable after the fact, even
// though the site only has one shared admin credential rather than per-user
// accounts.
const MAX_AUDIT_ENTRIES = 200;
async function appendAuditLog(store, entry) {
  const key = 'audit-log';
  let log;
  try {
    log = await store.get(key, { type: 'json' });
  } catch {
    log = null;
  }
  if (!Array.isArray(log)) log = [];
  log.unshift({ ...entry, at: new Date().toISOString() });
  if (log.length > MAX_AUDIT_ENTRIES) log.length = MAX_AUDIT_ENTRIES;
  try { await store.setJSON(key, log); } catch { /* best effort — never block the save on this */ }
}

// Defense-in-depth CSRF check for the admin write endpoints. The admin app
// authenticates with an explicit header (X-Admin-Session / X-Admin-Password)
// rather than an ambient cookie, so a third-party site can't make Netlify
// send that header automatically — the classic CSRF vector doesn't apply
// here. This Origin check is a second layer in case that ever changes (e.g.
// a future move to cookie-based sessions).
function isTrustedOrigin(event) {
  const origin = event.headers['origin'] || event.headers['Origin'];
  if (!origin) return true; // many same-origin fetches / non-browser tools omit Origin
  const host = event.headers['host'] || event.headers['Host'] || '';
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

// Newer check: also accepts a short-lived session token issued by
// verify-otp.js after the admin completes password + Telegram OTP.
async function isAuthorizedAsync(event) {
  if (isAuthorized(event)) return true;
  const token = event.headers['x-admin-session'] || event.headers['X-Admin-Session'];
  if (!token) return false;
  try {
    const store = dataStore(event);
    const session = await store.get(`session:${token}`, { type: 'json' });
    if (!session || session.expires <= Date.now()) return false;
    // Sliding idle timeout: a session that's still being actively used gets
    // extended, but never past its absolute cap (set at issuance time).
    const IDLE_EXTENSION_MS = 30 * 60 * 1000;
    const newExpires = Math.min(session.absoluteExpires || session.expires, Date.now() + IDLE_EXTENSION_MS);
    if (newExpires > session.expires) {
      session.expires = newExpires;
      try { await store.setJSON(`session:${token}`, session); } catch { /* non-fatal */ }
    }
    return true;
  } catch {
    return false;
  }
}

// Revokes a single admin session immediately (used by the sign-out button),
// so a token can't keep working after the staff member is done with it.
async function revokeSession(event, token) {
  if (!token) return;
  try {
    const store = dataStore(event);
    await store.delete(`session:${token}`);
  } catch {
    /* best effort */
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

module.exports = {
  dataStore,
  isAuthorized,
  isAuthorizedAsync,
  revokeSession,
  json,
  sendTelegramMessage,
  safeEqual,
  clientKey,
  checkRateLimit,
  clearRateLimit,
  appendAuditLog,
  isTrustedOrigin,
};
