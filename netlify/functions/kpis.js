const { dataStore, isAuthorized, json } = require('./_shared');

// kind: "stat" renders as a big number tile; "bar" renders as a progress bar.
// width is only used for "bar" entries (0-100).
const DEFAULTS = [
  { kind: 'stat', label: 'Avg Handle Time (target 5–8 min)', value: '5.5 min', width: 0 },
  { kind: 'stat', label: 'Net Promoter Score (target 50)', value: '92', width: 0 },
  { kind: 'bar', label: 'CSAT — Customer Satisfaction', value: '91%', width: 91 },
  { kind: 'bar', label: 'FCR — First Call Resolution', value: '92%', width: 92 },
  { kind: 'bar', label: 'Attendance Rate', value: '96.5%', width: 96.5 },
  { kind: 'bar', label: 'QA — Quality Assurance', value: '91%', width: 91 },
  { kind: 'bar', label: 'Call Resolution Rate', value: '90%', width: 90 },
  { kind: 'bar', label: 'Productivity Rate', value: '93%', width: 93 },
];

exports.handler = async (event) => {
  const store = dataStore();

  if (event.httpMethod === 'GET') {
    const data = await store.get('kpis', { type: 'json' });
    return json(200, data && data.length ? data : DEFAULTS);
  }

  if (event.httpMethod === 'POST') {
    if (!isAuthorized(event)) return json(401, { error: 'Unauthorized' });
    let body;
    try {
      body = JSON.parse(event.body || '[]');
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    if (!Array.isArray(body)) return json(400, { error: 'Expected an array of KPIs' });
    await store.setJSON('kpis', body);
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
};
