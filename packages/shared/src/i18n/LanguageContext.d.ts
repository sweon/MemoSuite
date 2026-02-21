import React from 'react';
import { SUPPORTED_LANGUAGES } from './types';
import type { Language, TranslationMap } from './types';
interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: any;
    allTranslations: Record<Language, TranslationMap>;
    updateTranslation: (lang: Language, key: string, value: string) => void;
    updateTranslations: (lang: Language, updates: Record<string, string>) => void;
    importTranslations: (lang: Language, data: TranslationMap) => void;
    resetTranslations: (lang: Language) => void;
    availableLanguages: typeof SUPPORTED_LANGUAGES;
}
interface LanguageProviderProps {
    children: React.ReactNode;
    appName: string;
    initialTranslations: {
        en: TranslationMap;
        ko?: TranslationMap;
        [key: string]: any;
    };
}
export declare const LanguageProvider: React.FC<LanguageProviderProps>;
export declare const useLanguage: () => LanguageContextType;
export {};
