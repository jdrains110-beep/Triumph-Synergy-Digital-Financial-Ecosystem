"use client";

import React, { createContext, useContext, useMemo } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n/locale";

type LocaleContextValue = {
  locale: string;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key) => key,
});

export const LocaleProvider = ({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) => {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const dictionary = useMemo(() => getDictionary(safeLocale), [safeLocale]);
  const value = useMemo(
    () => ({ locale: safeLocale, t: (key: string) => dictionary[key] ?? key }),
    [dictionary, safeLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
