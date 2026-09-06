const { dataStore, isAuthorizedAsync, json } = require('./_shared');

// Read-only endpoint for the admin panel's Activity Log tab. Lists recent
// content changes (leadership/kpis/jobs saves) with a timestamp, so there's
// a record of what changed and when even though everyone shares one login.
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!(await isAuthorizedAsync(event))) return json(401, { error: 'Unauthorized' });
  const store = dataStore(event);
  let log;
  try {
    log = await store.get('audit-log', { type: 'json' });
  } catch {
    log = [];
  }
  return json(200, Array.isArray(log) ? log : []);
};
