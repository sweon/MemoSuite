import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState } from 'react';
import { translations } from '../translations';
const LanguageContext = createContext(undefined);
export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        const saved = localStorage.getItem('handmemo-language');
        if (saved === 'en' || saved === 'ko')
            return saved;
        const browserLang = navigator.language.toLowerCase();
        return browserLang.startsWith('ko') ? 'ko' : 'en';
    });
    const setLanguage = (lang) => {
        setLanguageState(lang);
        localStorage.setItem('handmemo-language', lang);
    };
    const t = translations[language];
    return (_jsx(LanguageContext.Provider, { value: { language, setLanguage, t }, children: children }));
};
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
