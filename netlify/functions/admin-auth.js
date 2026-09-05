const { isAuthorized, json } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAuthorized(event)) return json(401, { error: 'Incorrect password' });
  return json(200, { ok: true });
};
