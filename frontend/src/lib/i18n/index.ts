'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import ukTranslations from './uk.json';
import enTranslations from './en.json';

export type Locale = 'uk' | 'en';
export const DEFAULT_LOCALE: Locale = 'uk';
export const LOCALES: Record<Locale, string> = { uk: 'Українська', en: 'English' };

const translations: Record<Locale, Record<string, unknown>> = {
  uk: ukTranslations,
  en: enTranslations,
};

function resolve(obj: Record<string, unknown>, path: string): string {
  const result = path.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    obj
  );
  return typeof result === 'string' ? result : path;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem('dots-locale') as Locale | null;
    if (stored && (stored === 'uk' || stored === 'en')) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('dots-locale', newLocale);
  }, []);

  const t = useCallback((key: string): string => {
    return resolve(translations[locale] as Record<string, unknown>, key);
  }, [locale]);

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, setLocale, t } },
    children
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within LocaleProvider');
  return context;
}
