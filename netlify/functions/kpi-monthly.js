const { dataStore, isAuthorizedAsync, isTrustedOrigin, appendAuditLog, json } = require('./_shared');

// Twelve months of tracked KPI data, matching the fields in the team's
// "Call Center KPI Dashboard" spreadsheet. Percentages are stored as whole
// numbers (91 means 91%); AHT is in minutes; NPS is a raw score.
const DEFAULTS = [
  { month: 'January',   csat: 85, aht: 5,   fcr: 80,   nps: 70, attendance: 96,   qa: 85, callRes: 86, productivity: 92 },
  { month: 'February',  csat: 69, aht: 5.5, fcr: 79,   nps: 75, attendance: 90,   qa: 84, callRes: 87, productivity: 96 },
  { month: 'March',     csat: 68, aht: 6,   fcr: 78,   nps: 74, attendance: 89,   qa: 89, callRes: 89, productivity: 96 },
  { month: 'April',     csat: 89, aht: 5,   fcr: 89,   nps: 89, attendance: 90,   qa: 89, callRes: 90, productivity: 93 },
  { month: 'May',       csat: 81, aht: 5,   fcr: 82,   nps: 82, attendance: 91,   qa: 95, callRes: 89, productivity: 95 },
  { month: 'June',      csat: 90, aht: 5.5, fcr: 89.5, nps: 90, attendance: 93,   qa: 98, callRes: 90, productivity: 94 },
  { month: 'July',      csat: 78, aht: 6,   fcr: 80,   nps: 89, attendance: 95,   qa: 91, callRes: 91, productivity: 92 },
  { month: 'August',    csat: 73, aht: 5,   fcr: 79,   nps: 85, attendance: 96,   qa: 95, callRes: 95, productivity: 96 },
  { month: 'September', csat: 90, aht: 5,   fcr: 81,   nps: 90, attendance: 90,   qa: 90, callRes: 96, productivity: 95 },
  { month: 'October',   csat: 92, aht: 6,   fcr: 92,   nps: 85, attendance: 95,   qa: 89, callRes: 89, productivity: 91 },
  { month: 'November',  csat: 90, aht: 6,   fcr: 90,   nps: 91, attendance: 96,   qa: 91, callRes: 89, productivity: 92 },
  { month: 'December',  csat: 91, aht: 5.5, fcr: 92,   nps: 92, attendance: 96.5, qa: 91, callRes: 90, productivity: 93 },
];

exports.handler = async (event) => {
  const store = dataStore(event);

  if (event.httpMethod === 'GET') {
    const data = await store.get('kpi-monthly', { type: 'json' });
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
    if (!Array.isArray(body)) return json(400, { error: 'Expected an array of monthly entries' });
    await store.setJSON('kpi-monthly', body);
    await appendAuditLog(store, { action: 'update', section: 'kpi-monthly', count: body.length });
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
};
