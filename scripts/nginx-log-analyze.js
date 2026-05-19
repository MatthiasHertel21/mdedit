#!/usr/bin/env node
/**
 * nginx-log-analyze.js
 *
 * Parst die nginx access logs für mdedit.io (access.log) und md.2b6.de
 * (2b6_access.log) und schreibt eine JSON-Zusammenfassung nach
 * data/nginx-stats.json, die der App-Container lesen kann.
 *
 * Usage (als root oder mit sudo):
 *   sudo node scripts/nginx-log-analyze.js
 *
 * Cron (alle 15 min, als root):
 *   15min: node /home/ga/md/scripts/nginx-log-analyze.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "nginx-stats.json");
// Additional output paths for other containers that mount different data dirs
const EXTRA_OUT_FILES = [
  "/home/ga/mdedit/data/nginx-stats.json",
];

const LOGS = [
  { file: "/var/log/nginx/access.log", domain: "mdedit.io" },
  { file: "/var/log/nginx/access.log.1", domain: "mdedit.io" },
  { file: "/var/log/nginx/2b6_access.log", domain: "md.2b6.de" },
  { file: "/var/log/nginx/2b6_access.log.1", domain: "md.2b6.de" },
];

const BOT_RE = /bot|crawler|spider|GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot|SemrushBot|AhrefsBot|Bingbot|DotBot|MJ12bot|PetalBot|DataForSeoBot|Censys|libredtail/i;
const SCAN_RE = /\.php|\.env|wp-|cgi-bin|phpunit|eval-stdin|\x5cthink|\.git\/|setup\.cgi|\.asp|xmlrpc/i;
const STATIC_RE = /\.(js|css|png|ico|woff|woff2|svg|map|ttf|eot|jpg|jpeg|gif|webp)(\?|$)/i;
// API paths that are high-frequency but not meaningful page views
const API_URL_RE = /^\/api\//;
const MONTH = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
const LINE_RE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]*?) \S+" (\d+) \S+ "([^"]*)" "([^"]*)"/;

const readLines = (file) => {
  try {
    return fs.readFileSync(file, "utf8").split("\n");
  } catch {
    return [];
  }
};

const parseLine = (line) => {
  const m = line.match(LINE_RE);
  if (!m) return null;
  const [, ip, timeStr, method, url, statusStr, referer, ua] = m;
  const tp = timeStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)/);
  if (!tp) return null;
  const ts = Date.UTC(+tp[3], MONTH[tp[2]], +tp[1], +tp[4], +tp[5], +tp[6]);
  return { ip, ts, method, url, status: +statusStr, referer, ua };
};

const analyzeLines = (lines, sinceMs) => {
  const ipSet = new Set();
  const urlCounts = {};
  const crawlerCounts = {};
  const statusCounts = {};
  let totalRequests = 0, botRequests = 0, scanRequests = 0;

  for (const line of lines) {
    const r = parseLine(line);
    if (!r) continue;
    if (r.ts < sinceMs) continue;

    totalRequests++;
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

    if (BOT_RE.test(r.ua)) {
      botRequests++;
      const cm = r.ua.match(/(Googlebot|GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot|SemrushBot|AhrefsBot|Bingbot|DotBot|MJ12bot|PetalBot|DataForSeoBot)/i);
      if (cm) crawlerCounts[cm[1]] = (crawlerCounts[cm[1]] || 0) + 1;
      continue;
    }
    if (SCAN_RE.test(r.url)) { scanRequests++; continue; }
    if (STATIC_RE.test(r.url)) continue;

    ipSet.add(r.ip);
    const cleanUrl = r.url.split("?")[0];
    // Count unique IPs for all human traffic, but skip API and static/vendor paths in topUrls
    if (!API_URL_RE.test(cleanUrl) && !/^\/(static|vendor)\//.test(cleanUrl)) {
      urlCounts[cleanUrl] = (urlCounts[cleanUrl] || 0) + 1;
    }
  }

  const status200 = statusCounts[200] || 0;
  const status5xx = Object.entries(statusCounts)
    .filter(([k]) => +k >= 500).reduce((s, [, v]) => s + v, 0);

  return {
    totalRequests,
    botRequests,
    scanRequests,
    uniqueHumanIps: ipSet.size,
    status200,
    status5xx,
    topUrls: Object.entries(urlCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
    topCrawlers: Object.entries(crawlerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
};

const now = Date.now();
const since24h = now - 24 * 3600 * 1000;
const since7d  = now - 7  * 24 * 3600 * 1000;
const since30d = now - 30 * 24 * 3600 * 1000;

const result = {};

for (const { file, domain } of LOGS) {
  const lines = readLines(file);
  if (!result[domain]) result[domain] = { lines24h: [], lines7d: [], lines30d: [] };
  for (const line of lines) {
    const r = parseLine(line);
    if (!r) continue;
    if (r.ts >= since30d) result[domain].lines30d.push(line);
    if (r.ts >= since7d)  result[domain].lines7d.push(line);
    if (r.ts >= since24h) result[domain].lines24h.push(line);
  }
}

const stats = {};
for (const [domain, { lines24h, lines7d, lines30d }] of Object.entries(result)) {
  stats[domain] = {
    "24h": analyzeLines(lines24h, since24h),
    "7d":  analyzeLines(lines7d,  since7d),
    "30d": analyzeLines(lines30d, since30d),
  };
}

const output = {
  generatedAt: new Date().toISOString(),
  domains: stats,
};

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
console.log(`[nginx-log-analyze] ${new Date().toISOString()} → ${OUT_FILE}`);
for (const extraPath of EXTRA_OUT_FILES) {
  try {
    fs.mkdirSync(path.dirname(extraPath), { recursive: true });
    fs.writeFileSync(extraPath, JSON.stringify(output, null, 2));
    console.log(`  also → ${extraPath}`);
  } catch (e) {
    console.warn(`  skip ${extraPath}: ${e.message}`);
  }
}
for (const [domain, windows] of Object.entries(stats)) {
  console.log(`  ${domain}: 24h=${windows["24h"].totalRequests} req, ${windows["24h"].uniqueHumanIps} human IPs, ${windows["24h"].botRequests} bots`);
}
