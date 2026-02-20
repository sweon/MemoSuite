import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES } from './types';
import { flattenObject, unflattenObject, deepMerge } from './utils';
import { en as sharedEn } from './locales/en';
import { ko as sharedKo } from './locales/ko';
const LanguageContext = createContext(undefined);
export const LanguageProvider = ({ children, appName, initialTranslations }) => {
    // Merge shared translations into initialTranslations
    const baseTranslations = React.useMemo(() => ({
        ...initialTranslations,
        en: deepMerge(JSON.parse(JSON.stringify(sharedEn)), initialTranslations.en),
        ko: deepMerge(JSON.parse(JSON.stringify(sharedKo)), initialTranslations.ko || {}),
    }), [initialTranslations]);
    const STORAGE_KEY_LANG = `${appName}-language`;
    const STORAGE_KEY_CUSTOM = `${appName}-custom-translations`;
    // 1. Language State
    const [language, setLanguageState] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_LANG);
            if (SUPPORTED_LANGUAGES.some(l => l.code === saved))
                return saved;
        }
        catch (e) {
            console.warn("localStorage not accessible:", e);
        }
        const browserLang = navigator.language.toLowerCase();
        // Special case for Chinese
        if (browserLang.startsWith('zh')) {
            return (browserLang.includes('tw') || browserLang.includes('hk')) ? 'zh-TW' : 'zh-CN';
        }
        // Generic prefix matching (e.g., 'en-US' -> 'en')
        const shortLang = browserLang.split('-')[0];
        if (SUPPORTED_LANGUAGES.some(l => l.code === shortLang)) {
            return shortLang;
        }
        return 'en';
    });
    const setLanguage = (lang) => {
        setLanguageState(lang);
        try {
            localStorage.setItem(STORAGE_KEY_LANG, lang);
        }
        catch (e) {
            console.warn("Failed to set language in localStorage:", e);
        }
    };
    // 2. Translations State
    // We keep a state of "custom overrides" loaded from local storage
    const [customTranslations, setCustomTranslations] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CUSTOM);
            return saved ? JSON.parse(saved) : {};
        }
        catch (e) {
            console.error("Failed to load custom translations", e);
            return {};
        }
    });
    // Save custom translations whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customTranslations));
        }
        catch (e) {
            console.warn("Failed to save custom translations to localStorage:", e);
        }
    }, [customTranslations, STORAGE_KEY_CUSTOM]);
    // 3. Merged Translations (The Source of Truth)
    // We start with initialTranslations (usually just en and maybe ko)
    // Then we merge custom overrides on top.
    // If a language doesn't have initial translations, we might fall back to English structure (empty strings or English values)
    const getMergedTranslations = useCallback(() => {
        const merged = { ...baseTranslations };
        // Ensure all supported languages exist in the map, defaulting to empty or copy of EN structure if needed
        // For the purpose of "editing", we want them to exist.
        SUPPORTED_LANGUAGES.forEach(lang => {
            if (!merged[lang.code]) {
                merged[lang.code] = {}; // Start empty
            }
        });
        // Merge custom
        Object.keys(customTranslations).forEach(lang => {
            if (!merged[lang])
                merged[lang] = {};
            // Deep merge custom on top of initial
            // We need a stable deep merge. For simplicity, let's use a simple one or just spread if flat.
            // Since we have 'deepMerge' util:
            const initial = merged[lang] ? JSON.parse(JSON.stringify(merged[lang])) : {};
            merged[lang] = deepMerge(initial, customTranslations[lang]);
        });
        return merged;
    }, [baseTranslations, customTranslations]);
    const allTranslations = getMergedTranslations();
    // 4. Current Translation Object (t)
    // Fallback logic: If a key is missing in current lang, fall back to English
    const currentT = React.useMemo(() => {
        const target = allTranslations[language] || {};
        const fallback = allTranslations['en'] || {};
        // Return a proxy or just a merged object?
        // Merged object is safer for React rendering.
        // We acturally want to Deep Merge: Fallback (EN) <- Target (Current)
        // So that missing keys in Target are filled by Fallback.
        return deepMerge(JSON.parse(JSON.stringify(fallback)), target);
    }, [allTranslations, language]);
    // 5. Actions
    const updateTranslation = (lang, key, value) => {
        setCustomTranslations(prev => {
            const langPrev = prev[lang] || {};
            // We need to unflatten this single update to merge it correctly
            // Or easier: maintain custom translations as flattened in storage? 
            // No, keeping them structured is better for export/import compatibility with existing files.
            // Construct a nested object from this single key-value
            const patch = unflattenObject({ [key]: value });
            const newLang = deepMerge(JSON.parse(JSON.stringify(langPrev)), patch);
            return {
                ...prev,
                [lang]: newLang
            };
        });
    };
    const updateTranslations = (lang, updates) => {
        setCustomTranslations(prev => {
            const langPrev = prev[lang] || {};
            // Work on a flattened version for easy merging of multiple updates
            const flatLang = flattenObject(langPrev);
            Object.assign(flatLang, updates);
            const newLang = unflattenObject(flatLang);
            return {
                ...prev,
                [lang]: newLang
            };
        });
    };
    const importTranslations = (lang, data) => {
        setCustomTranslations(prev => {
            const currentBaseFlat = flattenObject(baseTranslations.en || {});
            const importedFlat = flattenObject(data);
            const filteredFlat = {};
            // "최대한 match되는 것만" - Only import keys that exist in our base translation
            Object.keys(importedFlat).forEach(key => {
                if (key in currentBaseFlat) {
                    filteredFlat[key] = importedFlat[key];
                }
            });
            const filteredData = unflattenObject(filteredFlat);
            return {
                ...prev,
                [lang]: filteredData
            };
        });
    };
    const resetTranslations = (lang) => {
        setCustomTranslations(prev => {
            const next = { ...prev };
            delete next[lang];
            return next;
        });
    };
    return (_jsx(LanguageContext.Provider, { value: {
            language,
            setLanguage,
            t: currentT,
            allTranslations,
            updateTranslation,
            updateTranslations,
            importTranslations,
            resetTranslations,
            availableLanguages: SUPPORTED_LANGUAGES
        }, children: children }));
};
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
