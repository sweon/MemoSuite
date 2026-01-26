import React, { createContext, useContext, useState } from 'react';
import { translations } from '../translations';
import type { Language, TranslationKeys } from '../translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('bookmemo-language');
        if (saved === 'en' || saved === 'ko') return saved;
        const browserLang = navigator.language.toLowerCase();
        return browserLang.startsWith('ko') ? 'ko' : 'en';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('bookmemo-language', lang);
    };

    const t = translations[language];

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
