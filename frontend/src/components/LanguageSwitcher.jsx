import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = () => {
  const { language, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'tr', name: 'Türkçe' }
  ];

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
      >
        <span className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center">
          {language === 'en' ? 'EN' : 'TR'}
        </span>
        <span>{language === 'en' ? 'EN' : 'TR'}</span>
        <i className="bi bi-chevron-down text-xs"></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${
                  language === lang.code ? 'bg-slate-700 text-blue-400' : 'text-white'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;