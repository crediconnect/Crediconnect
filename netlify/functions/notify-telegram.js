const { json, sendTelegramMessage } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
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

  const result = await sendTelegramMessage(text);
  if (!result.ok) return json(502, { error: result.error });

  return json(200, { ok: true });
};
