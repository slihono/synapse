'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { translate, type Language } from './translations'

const LanguageContext = createContext<Language>('fr')

export function TranslationProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const language = useContext(LanguageContext)
  return useMemo(() => (source: string) => translate(source, language), [language])
}
