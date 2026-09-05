const { dataStore, isAuthorizedAsync, json } = require('./_shared');

const DEFAULTS = [
  { title: 'Customer Service Representative', description: 'Front-line financial account and billing support.' },
  { title: 'Team Leader', description: 'Coaches representatives and manages a service pod.' },
  { title: 'Quality Analyst', description: 'Audits calls against the QA scorecard and identifies trends.' },
  { title: 'IT Support', description: 'Keeps systems, tools and connectivity running for the floor.' },
  { title: 'HR Specialist', description: 'Supports recruitment, onboarding and employee relations.' },
];

exports.handler = async (event) => {
  const store = dataStore(event);

  if (event.httpMethod === 'GET') {
    const data = await store.get('jobs', { type: 'json' });
    return json(200, data && data.length ? data : DEFAULTS);
  }

  if (event.httpMethod === 'POST') {
    if (!(await isAuthorizedAsync(event))) return json(401, { error: 'Unauthorized' });
    let body;
    try {
      body = JSON.parse(event.body || '[]');
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    if (!Array.isArray(body)) return json(400, { error: 'Expected an array of jobs' });
    await store.setJSON('jobs', body);
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
};
