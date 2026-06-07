import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation } from './i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children, initialRegion }) => {
  const [language, setLanguage] = useState(initialRegion === 'asia' ? 'zh' : 'en');
  
  useEffect(() => {
    setLanguage(initialRegion === 'asia' ? 'zh' : 'en');
  }, [initialRegion]);

  const t = (key) => getTranslation(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
