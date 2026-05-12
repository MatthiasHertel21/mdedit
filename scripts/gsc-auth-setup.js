#!/usr/bin/env node
/**
 * scripts/gsc-auth-setup.js
 *
 * One-time OAuth2 setup for Google Search Console.
 * Run this once to obtain a refresh token, then use
 *   npm run stats:search-console-sync
 * for all future syncs (no browser needed).
 *
 * Usage:
 *   GSC_OAUTH_CLIENT=/path/to/gsc-oauth-client.json \
 *   GSC_OAUTH_TOKENS=/path/to/gsc-oauth-tokens.json \
 *   node scripts/gsc-auth-setup.js
 *
 * Defaults:
 *   GSC_OAUTH_CLIENT  ~/gsc-oauth-client.json
 *   GSC_OAUTH_TOKENS  ~/gsc-oauth-tokens.json
 */

import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_FILE = process.env.GSC_OAUTH_CLIENT
  || path.join(os.homedir(), 'gsc-oauth-client.json');
const TOKENS_FILE = process.env.GSC_OAUTH_TOKENS
  || path.join(os.homedir(), 'gsc-oauth-tokens.json');

const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const PORT = 4242;
const REDIRECT_URI = `http://localhost:${PORT}`;

// Load client credentials
let client;
try {
  const raw = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  client = raw.installed || raw.web;
} catch (err) {
  console.error(`Cannot read ${CLIENT_FILE}: ${err.message}`);
  process.exit(1);
}

// Build auth URL
const authUrl = new URL(client.auth_uri);
authUrl.searchParams.set('client_id', client.client_id);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n=== Google Search Console – One-Time Auth Setup ===\n');
console.log('Öffne diesen Link im Browser und melde dich mit dem Google-Konto an,');
console.log('das Zugang zur Search Console für mdedit.io hat:\n');
console.log(authUrl.toString());
console.log('\n(Warte auf Weiterleitung zu localhost…)\n');

// Try to open browser automatically
const openCmd = process.platform === 'darwin' ? 'open'
  : process.platform === 'win32' ? 'start'
  : 'xdg-open';
exec(`${openCmd} "${authUrl.toString()}"`, () => {});

// Local server to catch the redirect
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>Fehler: ${error}</h2><p>Bitte erneut versuchen.</p>`);
    server.close();
    console.error(`Auth abgelehnt: ${error}`);
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Warte auf Auth-Code…');
    return;
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch(client.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      throw new Error(`${tokens.error}: ${tokens.error_description}`);
    }

    if (!tokens.refresh_token) {
      throw new Error('Kein refresh_token erhalten – App war bereits autorisiert. ' +
        'Gehe zu https://myaccount.google.com/permissions und entferne den Zugang, dann nochmal.');
    }

    // Save tokens
    const save = {
      client_id: client.client_id,
      client_secret: client.client_secret,
      token_uri: client.token_uri,
      refresh_token: tokens.refresh_token,
      saved_at: new Date().toISOString(),
    };
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(save, null, 2) + '\n', { mode: 0o600 });

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>✓ Erfolgreich authentifiziert!</h2><p>Du kannst dieses Fenster schließen.</p>');

    console.log(`\n✓ Refresh Token gespeichert: ${TOKENS_FILE}`);
    console.log('\nJetzt Sync ausführen:');
    console.log(`  GSC_OAUTH_TOKENS=${TOKENS_FILE} GSC_SITE_URL=sc-domain:mdedit.io npm run stats:search-console-sync\n`);

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>Fehler beim Token-Austausch</h2><pre>${err.message}</pre>`);
    console.error(`Token exchange failed: ${err.message}`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Lokaler Auth-Server läuft auf Port ${PORT}…`);
});

server.on('error', (err) => {
  console.error(`Server-Fehler: ${err.message}`);
  console.error(`Ist Port ${PORT} bereits belegt? Beende andere Prozesse und versuche es erneut.`);
  process.exit(1);
});
