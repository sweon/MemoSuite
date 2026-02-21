import React from 'react';
import type { Language, TranslationKeys } from '../translations';
interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: TranslationKeys;
}
export declare const LanguageProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useLanguage: () => LanguageContextType;
export {};
