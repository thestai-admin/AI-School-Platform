/**
 * BHASHINI Language Definitions
 * ISO 639-1 codes for supported Indian languages
 */

import type { BhashiniLanguageCode } from './types'

export interface LanguageInfo {
  code: BhashiniLanguageCode
  name: string
  nativeName: string
  script: string
  region: string[]
}

// Currently supported languages (Hindi + English for Phase 1)
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    region: ['North India', 'Central India'],
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    region: ['Pan-India'],
  },
]

// All 22 scheduled Indian languages (for future expansion)
export const ALL_INDIAN_LANGUAGES: LanguageInfo[] = [
  ...SUPPORTED_LANGUAGES,
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    region: ['West Bengal', 'Tripura'],
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    region: ['Tamil Nadu', 'Puducherry'],
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    region: ['Andhra Pradesh', 'Telangana'],
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    region: ['Maharashtra'],
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    region: ['Gujarat'],
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    region: ['Karnataka'],
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    region: ['Kerala'],
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    region: ['Punjab'],
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
    region: ['Odisha'],
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Bengali',
    region: ['Assam'],
  },
]

// Helper functions
export function getLanguageByCode(code: BhashiniLanguageCode): LanguageInfo | undefined {
  return ALL_INDIAN_LANGUAGES.find((lang) => lang.code === code)
}

export function getLanguageName(code: BhashiniLanguageCode): string {
  return getLanguageByCode(code)?.name || code
}

export function getNativeName(code: BhashiniLanguageCode): string {
  return getLanguageByCode(code)?.nativeName || code
}

export function isLanguageSupported(code: string): code is BhashiniLanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code)
}

export function isFutureLanguage(code: string): boolean {
  return ALL_INDIAN_LANGUAGES.some((lang) => lang.code === code) && !isLanguageSupported(code)
}

// Translation pairs currently supported by BHASHINI
export const SUPPORTED_TRANSLATION_PAIRS: Array<{
  source: BhashiniLanguageCode
  target: BhashiniLanguageCode
}> = [
  { source: 'hi', target: 'en' },
  { source: 'en', target: 'hi' },
]

export function isTranslationPairSupported(
  source: BhashiniLanguageCode,
  target: BhashiniLanguageCode
): boolean {
  return SUPPORTED_TRANSLATION_PAIRS.some(
    (pair) => pair.source === source && pair.target === target
  )
}

// Default language settings
export const DEFAULT_SOURCE_LANGUAGE: BhashiniLanguageCode = 'hi'
export const DEFAULT_TARGET_LANGUAGE: BhashiniLanguageCode = 'en'
