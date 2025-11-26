import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Translations } from '../types/language';
import { ko } from '../locales/ko';
import { en } from '../locales/en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, initialLanguage = 'ko' }) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    // Fetch initial language from server settings
    const fetchLanguage = async () => {
      try {
        const response = await fetch('/api/settings/language');
        if (response.ok) {
          const data = await response.json();
          if (data.language) {
            setLanguageState(data.language);
          }
        }
      } catch (error) {
        console.error('Failed to fetch language setting', error);
      }
    };
    fetchLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    // API call to save to env
    try {
      await fetch('/api/settings/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
    } catch (error) {
      console.error('Failed to save language setting', error);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translations = language === 'ko' ? ko : en;
    
    // Handle dot notation for nested keys (e.g., 'settingsPage.korean')
    const keys = key.split('.');
    let value: any = translations.common;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if not found
      }
    }

    if (typeof value !== 'string') {
      return key; // Return key if result is not a string
    }

    let text = value;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(`{${paramKey}}`, String(paramValue));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
