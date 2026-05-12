#!/usr/bin/env node
/**
 * scripts/search-console-sync.js
 *
 * Pulls query-level data from Google Search Console and writes it into
 * data/marketing-stats.json (same format used by the /stats page).
 *
 * Authentication: Google Service Account (no OAuth flow needed)
 *
 * One-time setup:
 *   1. https://console.cloud.google.com → IAM & Admin → Service Accounts
 *      → Create service account → Keys → Add key → JSON → download
 *   2. Google Search Console → Settings → Users and permissions
 *      → Add user: <service-account-email> with "Restricted" role
 *   3. Copy config/gsc-queries.example.json → config/gsc-queries.json
 *      and edit the query list you want to track.
 *   4. Set env vars (see .env.example) and run:
 *        GSC_KEY_FILE=/path/to/sa-key.json npm run stats:search-console-sync
 *
 * Env vars:
 *   GSC_KEY_FILE          Path to service account JSON key file  (required)
 *   GSC_SITE_URL          SC property, e.g. sc-domain:mdedit.io  (required)
 *   GSC_QUERIES_FILE      JSON array of queries to track          (optional, default: config/gsc-queries.json)
 *   GSC_DAYS              Look-back window in days                (optional, default: 28)
 *   GSC_TOP_N             Max queries to store in topQueries      (optional, default: 25)
 *   MARKETING_STATS_FILE  Output file path                        (optional, default: data/marketing-stats.json)
 */

import { createSign } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const KEY_FILE = process.env.GSC_KEY_FILE;
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:mdedit.io';
const QUERIES_FILE = process.env.GSC_QUERIES_FILE
  ? path.resolve(process.env.GSC_QUERIES_FILE)
  : path.join(ROOT, 'config', 'gsc-queries.json');
const DAYS = Math.max(1, parseInt(process.env.GSC_DAYS || '28', 10));
const TOP_N = Math.max(1, parseInt(process.env.GSC_TOP_N || '25', 10));
const OUT_FILE = process.env.MARKETING_STATS_FILE
  ? path.resolve(process.env.MARKETING_STATS_FILE)
  : path.join(ROOT, 'data', 'marketing-stats.json');

// ---------------------------------------------------------------------------
// JWT / token helpers
// ---------------------------------------------------------------------------

/**
 * Build a signed JWT and exchange it for a Google OAuth2 access token.
 * Uses the service account private key (RS256) – no extra npm package needed.
 */
async function getAccessToken(keyData) {
  const now = Math.floor(Date.now() / 1000);

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: keyData.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const signingInput = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput, 'utf8');
  const sig = sign.sign(keyData.private_key, 'base64url');

  const jwt = `${signingInput}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.access_token;
}

function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

// ---------------------------------------------------------------------------
// Search Console API
// ---------------------------------------------------------------------------

async function fetchSearchAnalytics(accessToken, siteUrl, startDate, endDate, rowLimit = 1000) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit,
      startRow: 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Search Console API error (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.rows || [];
}

// ---------------------------------------------------------------------------
// Date helpers  (SC has ~3 day data lag)
// ---------------------------------------------------------------------------
function isoDate(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Stats aggregation
// ---------------------------------------------------------------------------

/**
 * Impression-weighted average position (same formula as Search Console uses).
 */
function impressionWeightedAvgPos(rows) {
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  if (totalImpressions === 0) return null;
  return rows.reduce((s, r) => s + r.position * r.impressions, 0) / totalImpressions;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Validate required config
  if (!KEY_FILE) {
    console.error('Error: GSC_KEY_FILE is not set.\n');
    console.error('Setup instructions:');
    console.error('  1. https://console.cloud.google.com → IAM & Admin → Service Accounts');
    console.error('     → Create → Keys → Add key → JSON → download the file');
    console.error('  2. Google Search Console → Settings → Users and permissions');
    console.error('     → Add user: <service-account-email>  (role: Restricted)');
    console.error('  3. Set GSC_KEY_FILE=/path/to/key.json  (add to .env or pass inline)');
    console.error('  4. npm run stats:search-console-sync');
    process.exit(1);
  }

  // Read service account key
  let keyData;
  try {
    keyData = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  } catch (err) {
    console.error(`Cannot read key file ${KEY_FILE}: ${err.message}`);
    process.exit(1);
  }

  if (keyData.type !== 'service_account') {
    console.error('GSC_KEY_FILE does not look like a service account JSON (missing type: service_account).');
    process.exit(1);
  }

  // Optional query filter
  let queryFilter = null;
  if (fs.existsSync(QUERIES_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
      if (Array.isArray(raw) && raw.length > 0) {
        queryFilter = new Set(raw.map(q => String(q).toLowerCase().trim()));
        console.log(`Query filter: ${queryFilter.size} queries from ${path.relative(ROOT, QUERIES_FILE)}`);
      }
    } catch (err) {
      console.warn(`Warning: cannot parse ${QUERIES_FILE}: ${err.message}. Fetching all queries.`);
    }
  } else {
    console.log(`No query filter file at ${path.relative(ROOT, QUERIES_FILE)} – fetching all queries.`);
  }

  // Date range  (SC data lags ~3 days)
  const LAG = 3;
  const endDate = isoDate(LAG);
  const startDate = isoDate(DAYS + LAG);

  console.log(`Authenticating as ${keyData.client_email}…`);
  const accessToken = await getAccessToken(keyData);

  console.log(`Fetching ${SITE_URL}  (${startDate} → ${endDate})…`);
  let rows = await fetchSearchAnalytics(accessToken, SITE_URL, startDate, endDate);
  console.log(`  ${rows.length} query rows returned from Search Console.`);

  // Apply query filter
  if (queryFilter) {
    const before = rows.length;
    rows = rows.filter(r => queryFilter.has(r.keys[0].toLowerCase()));
    console.log(`  After filter: ${rows.length} rows (filtered out ${before - rows.length}).`);
  }

  // Aggregate
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const rawAvgPos = impressionWeightedAvgPos(rows);
  const avgPosition = rawAvgPos != null ? round1(rawAvgPos) : null;

  // Sort by clicks desc and take top N
  rows.sort((a, b) => b.clicks - a.clicks);
  const topQueries = rows.slice(0, TOP_N).map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr != null ? round1(r.ctr * 100) : null,  // as percent
    position: round1(r.position),
  }));

  // Merge with existing snapshot (preserve backlinks etc. from other sources)
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    console.log(`Merging into existing ${path.relative(ROOT, OUT_FILE)}.`);
  } catch (_) {
    console.log(`Creating new ${path.relative(ROOT, OUT_FILE)}.`);
  }

  const result = {
    ...existing,
    updatedAt: new Date().toISOString().slice(0, 10),
    source: `Google Search Console ${startDate} – ${endDate}`,
    organicClicks30d: totalClicks,
    organicImpressions30d: totalImpressions,
    avgPosition,
    topQueries,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2) + '\n');

  console.log(`\nDone. Written to ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`  Clicks:        ${totalClicks}`);
  console.log(`  Impressions:   ${totalImpressions}`);
  console.log(`  Avg Position:  ${avgPosition ?? '-'}`);
  console.log(`  Top queries:   ${topQueries.length}`);
  if (topQueries.length > 0) {
    console.log('\n  Top 5 queries:');
    topQueries.slice(0, 5).forEach((q, i) =>
      console.log(`    ${i + 1}. "${q.query}"  pos ${q.position}  clicks ${q.clicks}`)
    );
  }
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
