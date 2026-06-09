import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTranslation } from './i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children, initialRegion }) => {
  const [language, setLanguage] = useState(initialRegion === 'asia' ? 'zh' : 'en');
  
  useEffect(() => {
    setLanguage(initialRegion === 'asia' ? 'zh' : 'en');
  }, [initialRegion]);

  const t = useCallback((key) => getTranslation(language, key), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
