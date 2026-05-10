import fs from "node:fs";
import path from "node:path";

function collectTopLevelKeys(text) {
  const keys = [];
  const duplicates = [];
  const counts = new Map();
  let depth = 0;
  let index = 0;

  function skipWhitespace() {
    while (index < text.length && /\s/.test(text[index])) {
      index += 1;
    }
  }

  function parseString() {
    let value = "";
    index += 1;
    while (index < text.length) {
      const char = text[index];
      if (char === "\\") {
        value += char;
        index += 1;
        if (index < text.length) {
          value += text[index];
          index += 1;
        }
        continue;
      }
      if (char === '"') {
        index += 1;
        return JSON.parse(`"${value}"`);
      }
      value += char;
      index += 1;
    }
    throw new Error("Unterminated string literal");
  }

  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      const currentDepth = depth;
      const parsed = parseString();
      if (currentDepth === 1) {
        skipWhitespace();
        if (text[index] === ":") {
          keys.push(parsed);
          const count = (counts.get(parsed) ?? 0) + 1;
          counts.set(parsed, count);
          if (count === 2) {
            duplicates.push(parsed);
          }
        }
      }
      continue;
    }
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    }
    index += 1;
  }

  return { keys, duplicates };
}

const i18nDir = path.join(process.cwd(), "public", "i18n");
const localeFiles = fs
  .readdirSync(i18nDir)
  .filter((file) => /^[a-z]{2}\.json$/.test(file))
  .sort();

const referenceFile = "en.json";
const referencePath = path.join(i18nDir, referenceFile);
const referenceText = fs.readFileSync(referencePath, "utf8");
const referenceData = JSON.parse(referenceText);
const referenceKeys = Object.keys(referenceData);

function collectHtmlI18nKeys(text) {
  const keys = [];
  const pattern = /data-i18n(?:-[a-z]+)?="([^"]+)"/g;

  for (const match of text.matchAll(pattern)) {
    keys.push(match[1]);
  }

  return [...new Set(keys)].sort();
}

let hasErrors = false;

const htmlReferencePath = path.join(process.cwd(), "public", "index.html");
const htmlReferenceText = fs.readFileSync(htmlReferencePath, "utf8");
const missingHtmlKeys = collectHtmlI18nKeys(htmlReferenceText).filter((key) => !(key in referenceData));

if (missingHtmlKeys.length) {
  hasErrors = true;
  console.error(`\n${referenceFile}`);
  console.error(`  missing HTML keys from public/index.html (${missingHtmlKeys.length}): ${missingHtmlKeys.join(", ")}`);
}

for (const file of localeFiles) {
  const filePath = path.join(i18nDir, file);
  const text = fs.readFileSync(filePath, "utf8");
  const { duplicates } = collectTopLevelKeys(text);
  const data = JSON.parse(text);
  const missing = referenceKeys.filter((key) => !(key in data));
  const extra = Object.keys(data).filter((key) => !(key in referenceData));

  if (duplicates.length || missing.length || extra.length) {
    hasErrors = true;
    console.error(`\n${file}`);
    if (duplicates.length) {
      console.error(`  duplicates: ${duplicates.join(", ")}`);
    }
    if (missing.length) {
      console.error(`  missing (${missing.length}): ${missing.join(", ")}`);
    }
    if (extra.length) {
      console.error(`  extra (${extra.length}): ${extra.join(", ")}`);
    }
  }
}

if (hasErrors) {
  process.exitCode = 1;
} else {
  console.log(`All ${localeFiles.length} locale files match ${referenceFile}.`);
}