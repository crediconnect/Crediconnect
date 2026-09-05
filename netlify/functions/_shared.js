const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'crediconnect-data';

function dataStore() {
  // On most Netlify sites, getStore(name) auto-detects the site/credentials.
  // Some sites don't get that automatic context (MissingBlobsEnvironmentError),
  // so we fall back to explicit credentials if they're set as env vars.
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }
  return getStore(STORE_NAME);
}

// Compares the password sent by the admin page against the ADMIN_PASSWORD
// environment variable set in Netlify (Site configuration -> Environment variables).
function isAuthorized(event) {
  const provided = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // fail closed if no password has been configured
  return provided === expected;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

module.exports = { dataStore, isAuthorized, json };
