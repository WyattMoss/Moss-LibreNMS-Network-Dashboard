/**
 * Minimal CORS proxy for the LibreNMS API.
 *
 * Why this exists:
 * Browsers block direct cross-origin calls from the dashboard HTML page to
 * your LibreNMS server unless LibreNMS sends CORS headers (it doesn't, by
 * default). This tiny server sits in between: the dashboard talks to it,
 * and it talks to LibreNMS with your API token attached server-side, so
 * the token never has to live in the browser.
 *
 * Setup:
 *   1. npm install express node-fetch@2 cors dotenv
 *   2. Create a .env file next to this script:
 *        LIBRENMS_URL=https://librenms.example.com
 *        LIBRENMS_TOKEN=your_api_token_here
 *        PORT=3000
 *   3. node server.js
 *   4. In the dashboard's "LibreNMS Base URL" field, enter:
 *        http://localhost:3000
 *      Leave the API Token field as anything (e.g. "proxy") — the real
 *      token is injected here on the server, not sent from the browser.
 */

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const LIBRENMS_URL = (process.env.LIBRENMS_URL || '').replace(/\/+$/, '');
const LIBRENMS_TOKEN = process.env.LIBRENMS_TOKEN || '';

if (!LIBRENMS_URL || !LIBRENMS_TOKEN) {
  console.error('Missing LIBRENMS_URL or LIBRENMS_TOKEN in .env — see the comment at the top of server.js');
  process.exit(1);
}

// Allow the dashboard page to call this proxy from any origin.
// Tighten this to your dashboard's actual origin in production.
app.use(cors());

// Forward anything under /api/v0/* straight through to LibreNMS,
// attaching the real token server-side.
app.use('/api/v0', async (req, res) => {
  const targetUrl = LIBRENMS_URL + '/api/v0' + req.url;
  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: { 'X-Auth-Token': LIBRENMS_TOKEN }
    });
    const body = await upstream.text();
    res
      .status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (err) {
    res.status(502).json({ status: 'error', message: 'Proxy could not reach LibreNMS: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.send('LibreNMS proxy is running. Point the dashboard at http://localhost:' + PORT);
});

app.listen(PORT, () => {
  console.log('LibreNMS proxy listening on http://localhost:' + PORT);
  console.log('Forwarding to ' + LIBRENMS_URL);
});
