import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { GoogleGenerativeAI } from "@google/generative-ai";

const LANGUAGE_NAMES = {
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  tr: "Turkish",
  zh: "Simplified Chinese"
};

const DEFAULT_LOCALES = ["es", "fr", "it", "nl", "pl", "ru", "tr", "zh"];
const DEFAULT_BATCH_SIZE = 25;

const args = new Set(process.argv.slice(2));
const listOnly = args.has("--list") || args.has("--dry-run");

const i18nDir = path.join(process.cwd(), "public", "i18n");
const referencePath = path.join(i18nDir, "en.json");
const reference = JSON.parse(fs.readFileSync(referencePath, "utf8"));
const referenceKeys = Object.keys(reference);

const localesArg = process.env.I18N_LOCALES?.split(",")
  .map((locale) => locale.trim())
  .filter(Boolean);
const locales = (localesArg?.length ? localesArg : DEFAULT_LOCALES).filter((locale) => locale !== "en");

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function getPendingKeys(localeData) {
  return referenceKeys.filter((key) => localeData[key] === reference[key]);
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function requestGeminiTranslations({ apiKey, model, targetLanguage, sourceMap }) {
  const client = new GoogleGenerativeAI(apiKey);
  const generativeModel = client.getGenerativeModel({ model });
  const prompt = [
    `Translate the JSON values from English to ${targetLanguage}.`,
    "Return only a valid JSON object with the exact same keys.",
    "Preserve placeholders like {count}, {name}, {0}, HTML snippets, punctuation, and line breaks.",
    "Keep product names, provider names, and technical identifiers unchanged when appropriate.",
    "If a phrase is already best kept in English, return it unchanged.",
    "JSON to translate:",
    JSON.stringify(sourceMap, null, 2)
  ].join("\n\n");

  const result = await generativeModel.generateContent(prompt);
  const response = await result.response;
  return parseJsonObject(response.text());
}

async function requestOpenAiTranslations({ apiKey, model, targetLanguage, sourceMap }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            `Translate UI strings from English to ${targetLanguage}.`,
            "Return JSON only with the exact same keys.",
            "Preserve placeholders like {count}, {name}, {0}, HTML snippets, punctuation, and line breaks.",
            "Keep product names, provider names, and technical identifiers unchanged when appropriate."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify(sourceMap)
        }
      ]
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI translation request failed");
  }

  return parseJsonObject(payload?.choices?.[0]?.message?.content || "");
}

async function requestTranslations({ provider, apiKey, model, targetLanguage, sourceMap }) {
  if (provider === "openai") {
    return requestOpenAiTranslations({ apiKey, model, targetLanguage, sourceMap });
  }
  return requestGeminiTranslations({ apiKey, model, targetLanguage, sourceMap });
}

async function main() {
  const provider = process.env.I18N_TRANSLATE_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "gemini");
  const apiKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY;
  const model = process.env.I18N_TRANSLATE_MODEL || (provider === "openai" ? "gpt-4.1-mini" : "gemini-2.5-flash");
  const batchSize = Number.parseInt(process.env.I18N_TRANSLATE_BATCH_SIZE || `${DEFAULT_BATCH_SIZE}`, 10);

  const pendingByLocale = locales.map((locale) => {
    const localePath = path.join(i18nDir, `${locale}.json`);
    const localeData = JSON.parse(fs.readFileSync(localePath, "utf8"));
    return {
      locale,
      localePath,
      localeData,
      pendingKeys: getPendingKeys(localeData)
    };
  });

  for (const { locale, pendingKeys } of pendingByLocale) {
    console.log(`${locale}: pending=${pendingKeys.length}`);
  }

  if (listOnly) {
    return;
  }

  if (!apiKey) {
    throw new Error(`Missing API key for provider '${provider}'. Set ${provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY"} or run with --list.`);
  }

  for (const localeEntry of pendingByLocale) {
    if (!localeEntry.pendingKeys.length) {
      continue;
    }

    const targetLanguage = LANGUAGE_NAMES[localeEntry.locale] || localeEntry.locale;
    const batches = chunk(localeEntry.pendingKeys, batchSize);

    for (const batch of batches) {
      const sourceMap = Object.fromEntries(batch.map((key) => [key, reference[key]]));
      const translatedMap = await requestTranslations({
        provider,
        apiKey,
        model,
        targetLanguage,
        sourceMap
      });

      for (const key of batch) {
        if (typeof translatedMap[key] !== "string") {
          throw new Error(`Missing translated string for key '${key}' in locale '${localeEntry.locale}'`);
        }
        localeEntry.localeData[key] = translatedMap[key];
      }

      console.log(`${localeEntry.locale}: translated ${batch.length} keys`);
    }

    fs.writeFileSync(localeEntry.localePath, `${JSON.stringify(localeEntry.localeData, null, 2)}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});