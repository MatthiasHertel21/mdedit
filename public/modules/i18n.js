/**
 * I18N Module
 * Handles translations and localization
 */

const translations = {};
const supportedLocales = ["de", "en", "fr", "es", "it", "nl", "pl", "tr", "ru", "zh"];
const localeKey = "md-locale";

export const loadTranslations = async (locale = null) => {
  const targetLocale = locale || getLocale();
  if (!translations[targetLocale]) {
    try {
      const response = await fetch(`/i18n/${targetLocale}.json`);
      if (response.ok) {
        translations[targetLocale] = await response.json();
      } else {
        console.warn(`Translation file not found for ${targetLocale}, using English fallback`);
        if (targetLocale !== "en") {
          await loadTranslations("en");
        }
      }
    } catch (err) {
      console.error(`Failed to load translations for ${targetLocale}:`, err);
      if (targetLocale !== "en") {
        await loadTranslations("en");
      }
    }
  }
};

export const getLocale = () => {
  const saved = localStorage.getItem(localeKey);
  if (saved && saved !== "auto" && supportedLocales.includes(saved)) return saved;
  const lang = (navigator.language || "de").toLowerCase();
  const base = lang.split("-")[0];
  return supportedLocales.includes(base) ? base : "en";
};

let currentLocale = getLocale();

export const setLocale = (locale) => {
  if (locale === "auto") {
    localStorage.removeItem(localeKey);
    currentLocale = getLocale();
  } else if (supportedLocales.includes(locale)) {
    localStorage.setItem(localeKey, locale);
    currentLocale = locale;
  } else {
    console.warn(`Locale ${locale} not supported, falling back to English`);
    localStorage.setItem(localeKey, "en");
    currentLocale = "en";
  }
};

export const getCurrentLocale = () => currentLocale;

export const t = (key) => translations[currentLocale]?.[key] || translations.en?.[key] || key;

export const applyTranslations = async () => {
  await loadTranslations(currentLocale);
  if (currentLocale !== "en") {
    await loadTranslations("en");
  }
  
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
};

export const getSupportedLocales = () => supportedLocales;
