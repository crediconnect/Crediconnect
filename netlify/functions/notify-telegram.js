const { json } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    // Not configured — the caller (script.js) treats this as a no-op, not an error.
    return json(500, { error: 'Telegram notifications are not configured yet.' });
  }

  const { type, name, email, company, position } = body;
  let text;
  if (type === 'contact') {
    text = `📩 New contact inquiry — CrediConnect Solutions\n\nName: ${name || 'not given'}\nCompany: ${company || 'not given'}\nEmail: ${email || 'not given'}`;
  } else if (type === 'careers') {
    text = `🧑‍💼 New job application — CrediConnect Solutions\n\nName: ${name || 'not given'}\nPosition: ${position || 'not given'}\nEmail: ${email || 'not given'}`;
  } else {
    return json(400, { error: 'Unknown notification type' });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json(502, { error: `Telegram rejected the request: ${detail || res.status}` });
    }
  } catch {
    return json(502, { error: 'Could not reach Telegram.' });
  }

  return json(200, { ok: true });
};
