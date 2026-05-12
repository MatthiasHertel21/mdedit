#!/usr/bin/env node
/**
 * scripts/gsc-index-check.js
 *
 * Checks indexing status of all important mdedit.io URLs via the
 * Search Console URL Inspection API, and submits the sitemap.
 *
 * Usage:
 *   npm run stats:index-check
 *   GSC_OAUTH_TOKENS=~/gsc-oauth-tokens.json npm run stats:index-check
 *
 * Requires tokens obtained with "webmasters" scope (not readonly).
 * Run "npm run stats:search-console-auth" to refresh tokens if needed.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const OAUTH_TOKENS_FILE = process.env.GSC_OAUTH_TOKENS
  || path.join(os.homedir(), 'gsc-oauth-tokens.json');
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:mdedit.io';
const SITEMAP_URL = process.env.GSC_SITEMAP_URL || 'https://mdedit.io/sitemap.xml';

const URLS_TO_CHECK = [
  'https://mdedit.io/',
  'https://mdedit.io/thesis-writing/',
  'https://mdedit.io/self-hosted-markdown-editor/',
  'https://mdedit.io/markdown-citations-bibtex-csl/',
  'https://mdedit.io/help-en.html',
];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
async function getAccessToken() {
  let t;
  try {
    t = JSON.parse(fs.readFileSync(OAUTH_TOKENS_FILE, 'utf8'));
  } catch (err) {
    console.error(`Cannot read ${OAUTH_TOKENS_FILE}: ${err.message}`);
    console.error('Run: npm run stats:search-console-auth');
    process.exit(1);
  }

  const res = await fetch(t.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: t.client_id,
      client_secret: t.client_secret,
      refresh_token: t.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const json = await res.json();
  if (json.error) {
    if (json.error === 'invalid_scope') {
      console.error('Token scope insufficient. Re-authenticating with full scope…');
      console.error('Run: npm run stats:search-console-auth');
      process.exit(1);
    }
    throw new Error(`Token refresh failed: ${json.error} – ${json.error_description}`);
  }
  return json.access_token;
}

// ---------------------------------------------------------------------------
// URL Inspection API
// ---------------------------------------------------------------------------
async function inspectUrl(accessToken, url) {
  const res = await fetch(
    'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL }),
    }
  );

  if (res.status === 403) {
    const text = await res.text();
    if (text.includes('invalid_scope') || text.includes('PERMISSION_DENIED')) {
      return { error: 'scope_insufficient' };
    }
  }

  if (!res.ok) {
    const text = await res.text();
    return { error: `HTTP ${res.status}: ${text.slice(0, 120)}` };
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Sitemap submit
// ---------------------------------------------------------------------------
async function submitSitemap(accessToken) {
  const encoded = encodeURIComponent(SITE_URL);
  const feedEncoded = encodeURIComponent(SITEMAP_URL);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encoded}/sitemaps/${feedEncoded}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.status; // 204 = success
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
function verdictLine(result) {
  if (result.error) return `  ✗  ERROR: ${result.error}`;

  const ri = result.inspectionResult;
  if (!ri) return '  ?  No inspection result returned';

  const idx = ri.indexStatusResult;
  if (!idx) return '  ?  No index status';

  const verdict = idx.verdict || '?';
  const coverage = idx.coverageState || '';
  const crawl = idx.lastCrawlTime ? idx.lastCrawlTime.slice(0, 10) : 'never crawled';
  const mobile = ri.mobileUsabilityResult?.verdict || '?';

  const icon = verdict === 'PASS' ? '✓' : verdict === 'NEUTRAL' ? '~' : '✗';
  return `  ${icon}  ${verdict.padEnd(8)}  ${coverage.padEnd(35)} crawled: ${crawl}  mobile: ${mobile}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const accessToken = await getAccessToken();

  // Submit sitemap first
  process.stdout.write(`Submitting sitemap ${SITEMAP_URL}… `);
  const sitemapStatus = await submitSitemap(accessToken);
  if (sitemapStatus === 204 || sitemapStatus === 200) {
    console.log('✓ submitted');
  } else if (sitemapStatus === 403) {
    console.log('✗ 403 – tokens need webmasters scope (run: npm run stats:search-console-auth)');
  } else {
    console.log(`status ${sitemapStatus}`);
  }

  console.log(`\nURL Indexing Status for ${SITE_URL}:`);
  console.log('─'.repeat(75));

  let needsReauth = false;

  for (const url of URLS_TO_CHECK) {
    process.stdout.write(`  ${url}\n`);
    const result = await inspectUrl(accessToken, url);
    const line = verdictLine(result);
    console.log(line);
    if (result.error === 'scope_insufficient') {
      needsReauth = true;
      break;
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('─'.repeat(75));

  if (needsReauth) {
    console.log('\n⚠  URL Inspection requires re-authentication with full scope.');
    console.log('   Run: npm run stats:search-console-auth');
    console.log('   (The sitemap submission above already has the correct scope.)');
  } else {
    console.log('\nVerdicts: PASS = indexed  NEUTRAL = discovered/not indexed  FAIL = not indexed');
    console.log('\nTo request indexing for a specific URL, use Google Search Console:');
    console.log('  https://search.google.com/search-console → URL-Prüfung → URL eingeben → Indexierung beantragen');
  }
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
