import localeData from './locales.json' with { type: 'json' }

export const supportedLanguages = ['fr', 'en', 'es', 'ar', 'hi', 'tr', 'pt'] as const
export type Language = typeof supportedLanguages[number]
export const catalogs: Record<Language, Record<string, string>> = localeData

/** Exact message lookup preserves formulas, whitespace, and unknown program output. */
export function translate(source: string, language: Language): string {
  const key = source.trim()
  const translated = catalogs[language][key]
  return translated ? source.replace(key, () => translated) : source
}
