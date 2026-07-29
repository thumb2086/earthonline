import React, { createContext, useContext, useState, useCallback } from 'react';
import { getTranslation } from './i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children, initialRegion }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('eo_lang');
    return saved || (initialRegion === 'asia' ? 'zh' : 'en');
  });

  const setLang = useCallback((lang) => {
    localStorage.setItem('eo_lang', lang);
    setLanguage(lang);
  }, []);

  const t = useCallback((key) => getTranslation(language, key), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
