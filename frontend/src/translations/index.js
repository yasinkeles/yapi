import { enTranslations } from './en';
import { trTranslations } from './tr';
import { ruTranslations } from './ru';
import { azTranslations } from './az';
import { faTranslations } from './fa';
import { arTranslations } from './ar';

export const translations = {
  en: enTranslations,
  tr: trTranslations,
  ru: ruTranslations,
  az: azTranslations,
  fa: faTranslations,
  ar: arTranslations,
};

export const getTranslation = (language, key) => {
  if (!translations[language]) return key;
  return translations[language][key] || key;
};

export const getLanguageName = (language) => {
  const languageNames = {
    en: 'English',
    tr: 'Türkçe',
    ru: 'Русский',
    az: 'Azərbaycan',
    fa: 'فارسی',
    ar: 'العربية',
  };
  return languageNames[language] || language;
};

// RTL languages
export const rtlLanguages = ['ar', 'fa'];
export const isRTL = (language) => rtlLanguages.includes(language);
