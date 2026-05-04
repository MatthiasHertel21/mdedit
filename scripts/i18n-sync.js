import fs from "node:fs";
import path from "node:path";

const i18nDir = path.join(process.cwd(), "public", "i18n");
const localeFiles = fs
  .readdirSync(i18nDir)
  .filter((file) => /^[a-z]{2}\.json$/.test(file))
  .sort();

const referenceFile = "en.json";
const referencePath = path.join(i18nDir, referenceFile);
const referenceData = JSON.parse(fs.readFileSync(referencePath, "utf8"));
const referenceKeys = Object.keys(referenceData);

let changedFiles = 0;

for (const file of localeFiles) {
  const filePath = path.join(i18nDir, file);
  const currentData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const normalizedData = {};

  for (const key of referenceKeys) {
    normalizedData[key] = key in currentData ? currentData[key] : referenceData[key];
  }

  const normalizedText = `${JSON.stringify(normalizedData, null, 2)}\n`;
  const previousText = fs.readFileSync(filePath, "utf8");
  const missingCount = referenceKeys.filter((key) => !(key in currentData)).length;
  const extraCount = Object.keys(currentData).filter((key) => !(key in referenceData)).length;

  if (previousText !== normalizedText) {
    fs.writeFileSync(filePath, normalizedText, "utf8");
    changedFiles += 1;
  }

  console.log(`${file}: missing=${missingCount} extra=${extraCount}`);
}

console.log(`Normalized ${changedFiles} locale files against ${referenceFile}.`);