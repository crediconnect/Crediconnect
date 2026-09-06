const { dataStore, isAuthorizedAsync, isTrustedOrigin, appendAuditLog, json } = require('./_shared');

const DEFAULTS = [
  { initials: 'CEO', name: 'Gloria', role: 'Chief Executive Officer', short: 'Sets company direction and represents CrediConnect to financial partners.' },
  { initials: 'COO', name: 'Shiela', role: 'Chief Operating Officer', short: 'Oversees day-to-day operations and coordination across departments.' },
  { initials: 'HRM', name: 'Ashley', role: 'HR Manager', short: 'Leads recruitment, onboarding, and employee relations.' },
  { initials: 'OM', name: 'Sophia', role: 'Operations Manager', short: 'Manages staffing, scheduling, and floor performance.' },
  { initials: 'TM', name: 'Juvielyn', role: 'Training Manager', short: 'Designs and runs new-hire and upskilling programs.' },
  { initials: 'FO', name: 'Carla', role: 'Finance Officer', short: 'Handles budgeting, payroll, and financial reporting.' },
  { initials: 'MM', name: 'Aira', role: 'Marketing Manager', short: 'Runs recruitment marketing and social channels.' },
  { initials: 'QAM', name: 'Nash', role: 'Quality Assurance Manager', short: 'Audits calls and drives service standards.' },
  { initials: 'ITM', name: 'Tymothy', role: 'IT Manager', short: 'Keeps systems, tools, and connectivity running.' },
  { initials: 'CSM', name: 'Khrizlyn', role: 'Customer Service Manager', short: 'Owns customer service policy and escalation handling.' },
];

exports.handler = async (event) => {
  const store = dataStore(event);

  if (event.httpMethod === 'GET') {
    const data = await store.get('leadership', { type: 'json' });
    return json(200, data && data.length ? data : DEFAULTS);
  }

  if (event.httpMethod === 'POST') {
    if (!isTrustedOrigin(event)) return json(403, { error: 'Request origin not allowed' });
    if (!(await isAuthorizedAsync(event))) return json(401, { error: 'Unauthorized' });
    let body;
    try {
      body = JSON.parse(event.body || '[]');
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    if (!Array.isArray(body)) return json(400, { error: 'Expected an array of leaders' });
    await store.setJSON('leadership', body);
    await appendAuditLog(store, { action: 'update', section: 'leadership', count: body.length });
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
};
