import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

const takeOption = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
};

const hasFlag = (name) => args.includes(name);

const printUsage = () => {
  console.log(`Usage: node scripts/marketing-stats-sync.js --input <source.json> [--output <target.json>] [--source <label>]

Normalizes a marketing/SEO snapshot for the /stats page.

Supported canonical keys:
  backlinks
  referringDomains
  organicClicks30d
  organicImpressions30d
  avgPosition
  indexedPages
  topQueries[]       -> { query, clicks, impressions, position }
  topReferrers[]     -> { domain, visits }

Examples:
  node scripts/marketing-stats-sync.js --input docs/examples/marketing-stats.example.json
  node scripts/marketing-stats-sync.js --input ./search-console.json --output ./data/marketing-stats.json --source "Search Console + Ahrefs"
`);
};

if (hasFlag("--help")) {
  printUsage();
  process.exit(0);
}

const inputArg = takeOption("--input");
if (!inputArg) {
  printUsage();
  process.exit(1);
}

const rootDir = process.cwd();
const inputPath = path.resolve(rootDir, inputArg);
const outputPath = path.resolve(rootDir, takeOption("--output") || path.join("data", "marketing-stats.json"));
const sourceOverride = takeOption("--source");

const parseJsonFile = (filePath) => {
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(text);
};

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const normalized = typeof value === "string"
    ? value.replace(/,/g, "").trim()
    : value;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const toTextOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const normalizeQueryRows = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const query = toTextOrNull(firstDefined(row?.query, row?.term, row?.keyword));
      if (!query) return null;
      return {
        query,
        clicks: toNumberOrNull(firstDefined(row?.clicks, row?.organicClicks, row?.visits)),
        impressions: toNumberOrNull(firstDefined(row?.impressions, row?.views)),
        position: toNumberOrNull(firstDefined(row?.position, row?.avgPosition, row?.averagePosition))
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right.clicks || 0) - (left.clicks || 0) || (right.impressions || 0) - (left.impressions || 0))
    .slice(0, 8);
};

const normalizeReferrerRows = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const domain = toTextOrNull(firstDefined(row?.domain, row?.referrer, row?.source));
      if (!domain) return null;
      return {
        domain,
        visits: toNumberOrNull(firstDefined(row?.visits, row?.sessions, row?.clicks))
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right.visits || 0) - (left.visits || 0))
    .slice(0, 8);
};

const input = parseJsonFile(inputPath);

const normalized = {
  updatedAt: toTextOrNull(firstDefined(input.updatedAt, input.updated_at, input.snapshotDate, input.date)) || new Date().toISOString().slice(0, 10),
  source: sourceOverride || toTextOrNull(firstDefined(input.source, input.provider, input.tool, input.snapshotSource)) || "Marketing snapshot import",
  backlinks: toNumberOrNull(firstDefined(input.backlinks, input.backlinkCount, input.externalBacklinks)),
  referringDomains: toNumberOrNull(firstDefined(input.referringDomains, input.refdomains, input.referring_domains, input.refDomains, input.domains)),
  organicClicks30d: toNumberOrNull(firstDefined(input.organicClicks30d, input.clicks30d, input.organicClicks, input.clicks)),
  organicImpressions30d: toNumberOrNull(firstDefined(input.organicImpressions30d, input.impressions30d, input.organicImpressions, input.impressions)),
  avgPosition: toNumberOrNull(firstDefined(input.avgPosition, input.position, input.averagePosition)),
  indexedPages: toNumberOrNull(firstDefined(input.indexedPages, input.indexed, input.indexCount)),
  topQueries: normalizeQueryRows(firstDefined(input.topQueries, input.queries)),
  topReferrers: normalizeReferrerRows(firstDefined(input.topReferrers, input.referrers))
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

console.log(`Wrote marketing snapshot to ${path.relative(rootDir, outputPath) || outputPath}`);
console.log(`  source: ${normalized.source}`);
console.log(`  updatedAt: ${normalized.updatedAt}`);
console.log(`  backlinks: ${normalized.backlinks ?? "-"}`);
console.log(`  referringDomains: ${normalized.referringDomains ?? "-"}`);
console.log(`  organicClicks30d: ${normalized.organicClicks30d ?? "-"}`);
console.log(`  organicImpressions30d: ${normalized.organicImpressions30d ?? "-"}`);
console.log(`  avgPosition: ${normalized.avgPosition ?? "-"}`);
console.log(`  indexedPages: ${normalized.indexedPages ?? "-"}`);
console.log(`  topQueries: ${normalized.topQueries.length}`);
console.log(`  topReferrers: ${normalized.topReferrers.length}`);