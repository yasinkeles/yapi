import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, isRTL } from '../translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  const applyLanguage = (lang) => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setLanguage(savedLanguage);
    applyLanguage(savedLanguage);
    setTranslationsLoaded(true);
  }, []);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    applyLanguage(newLanguage);
  };

  const t = (key) => {
    if (!translationsLoaded || !translations[language]) return key;
    return translations[language][key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    translationsLoaded,
    isRTL: isRTL(language),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;
