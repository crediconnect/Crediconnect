const crypto = require('crypto');
const { dataStore, json, sendEmail } = require('./_shared');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const LABELS = {
  admin: 'Staff Portal sign-in',
  contact: 'Contact form',
  careers: 'Careers application',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  const purpose = body.purpose;
  if (!LABELS[purpose]) return json(400, { error: 'Unknown purpose' });

  let targetEmail;
  if (purpose === 'admin') {
    // Admin codes always go to the fixed staff inbox, never to a value the caller supplies.
    targetEmail = process.env.ADMIN_EMAIL;
    if (!targetEmail) {
      return json(500, { error: 'ADMIN_EMAIL is not configured, so admin email verification is unavailable.' });
    }
  } else {
    targetEmail = body.email;
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return json(400, { error: 'A valid email address is required.' });
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const store = dataStore();
  await store.setJSON(`otp:${purpose}:${targetEmail.toLowerCase()}`, {
    code,
    expires: Date.now() + OTP_TTL_MS,
  });

  const result = await sendEmail({
    to: targetEmail,
    subject: `Your CrediConnect verification code: ${code}`,
    html: `<div style="font-family:sans-serif">
      <p>Your CrediConnect Solutions verification code for the ${LABELS[purpose]} is:</p>
      <h2 style="letter-spacing:4px">${code}</h2>
      <p style="color:#667">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>`,
  });
  if (!result.ok) return json(502, { error: result.error });

  return json(200, { ok: true, sentTo: maskEmail(targetEmail) });
};

function maskEmail(e) {
  const [user, domain] = String(e).split('@');
  if (!domain) return e;
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
}
