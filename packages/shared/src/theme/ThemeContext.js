import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightThemes, darkThemes, getThemeById, getDefaultTheme } from './colors';
const ColorThemeContext = createContext(undefined);
export const useColorTheme = () => {
    const context = useContext(ColorThemeContext);
    if (!context) {
        throw new Error('useColorTheme must be used within a ColorThemeProvider');
    }
    return context;
};
export const ColorThemeProvider = ({ children, storageKeyPrefix = 'shared', defaultLightThemeId = 'classic', defaultDarkThemeId = 'dark', GlobalStyleComponent }) => {
    const themeKey = `${storageKeyPrefix}-theme`;
    const lightThemeIdKey = `${storageKeyPrefix}-lightThemeId`;
    const darkThemeIdKey = `${storageKeyPrefix}-darkThemeId`;
    const fontSizeKey = `${storageKeyPrefix}-fontSize`;
    const [lightThemeId, setLightThemeId] = useState(() => {
        return localStorage.getItem(lightThemeIdKey) || defaultLightThemeId;
    });
    const [darkThemeId, setDarkThemeId] = useState(() => {
        return localStorage.getItem(darkThemeIdKey) || defaultDarkThemeId;
    });
    const [mode, setMode] = useState(() => {
        const saved = localStorage.getItem(themeKey);
        return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    });
    const [fontSize, setFontSize] = useState(() => {
        const saved = localStorage.getItem(fontSizeKey);
        return saved ? Number(saved) : 16;
    });
    const currentThemeId = mode === 'light' ? lightThemeId : darkThemeId;
    const colorTheme = useMemo(() => {
        const themeId = mode === 'light' ? lightThemeId : darkThemeId;
        const theme = getThemeById(themeId);
        if (theme && theme.mode === mode) {
            return theme;
        }
        return getDefaultTheme(mode);
    }, [mode, lightThemeId, darkThemeId]);
    useEffect(() => {
        localStorage.setItem(themeKey, mode);
    }, [mode, themeKey]);
    useEffect(() => {
        localStorage.setItem(lightThemeIdKey, lightThemeId);
    }, [lightThemeId, lightThemeIdKey]);
    useEffect(() => {
        localStorage.setItem(darkThemeIdKey, darkThemeId);
    }, [darkThemeId, darkThemeIdKey]);
    useEffect(() => {
        localStorage.setItem(fontSizeKey, fontSize.toString());
    }, [fontSize, fontSizeKey]);
    const toggleTheme = useCallback(() => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);
    const setThemeById = useCallback((id) => {
        const theme = getThemeById(id);
        if (!theme)
            return;
        if (theme.mode === 'light') {
            setLightThemeId(id);
            setMode('light');
        }
        else {
            setDarkThemeId(id);
            setMode('dark');
        }
    }, []);
    const increaseFontSize = useCallback(() => {
        setFontSize(prev => Math.min(prev + 1, 24));
    }, []);
    const decreaseFontSize = useCallback(() => {
        setFontSize(prev => Math.max(prev - 1, 12));
    }, []);
    const currentTheme = useMemo(() => ({
        mode,
        fontSize,
        themeName: colorTheme.name,
        colors: {
            ...colorTheme.colors,
            accent: colorTheme.colors.accent || colorTheme.colors.primary,
            glassBackground: colorTheme.colors.glassBackground || (mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.4)'),
            glassBorder: colorTheme.colors.glassBorder || (mode === 'light' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'),
            shadowColor: colorTheme.colors.shadowColor || (mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.4)'),
        },
        radius: {
            small: '4px',
            medium: '8px',
            large: '16px',
            full: '9999px',
        },
        spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
        },
        shadows: {
            small: `0 2px 4px ${mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)'}`,
            medium: `0 4px 12px ${mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.3)'}`,
            large: `0 12px 32px ${mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.5)'}`,
            glass: `0 8px 32px 0 ${mode === 'light' ? 'rgba(31, 38, 135, 0.07)' : 'rgba(0, 0, 0, 0.37)'}`,
        },
        effects: {
            blur: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
    }), [mode, fontSize, colorTheme]);
    const filteredLightThemes = useMemo(() => {
        const appPrefix = storageKeyPrefix;
        const appThemeId = `${appPrefix}_light`;
        // Find current app's default theme
        const appDefault = lightThemes.find(t => t.id === appThemeId);
        // Common themes (not starting with any app prefix)
        const commonThemes = lightThemes.filter(t => !t.id.startsWith('llmemo_') &&
            !t.id.startsWith('handmemo_') &&
            !t.id.startsWith('wordmemo_') &&
            !t.id.startsWith('bookmemo_') &&
            !t.id.startsWith('dailymemo_'));
        if (appDefault) {
            return [{ ...appDefault, name: '기본' }, ...commonThemes];
        }
        return commonThemes;
    }, [storageKeyPrefix]);
    const filteredDarkThemes = useMemo(() => {
        const appPrefix = storageKeyPrefix;
        const appThemeId = `${appPrefix}_dark`;
        // Find current app's default theme
        const appDefault = darkThemes.find(t => t.id === appThemeId);
        // Common themes
        const commonThemes = darkThemes.filter(t => !t.id.startsWith('llmemo_') &&
            !t.id.startsWith('handmemo_') &&
            !t.id.startsWith('wordmemo_') &&
            !t.id.startsWith('bookmemo_') &&
            !t.id.startsWith('dailymemo_'));
        if (appDefault) {
            return [{ ...appDefault, name: '기본' }, ...commonThemes];
        }
        return commonThemes;
    }, [storageKeyPrefix]);
    return (_jsx(ColorThemeContext.Provider, { value: {
            mode,
            toggleTheme,
            fontSize,
            setFontSize,
            increaseFontSize,
            decreaseFontSize,
            theme: currentTheme,
            currentThemeId,
            setThemeById,
            lightThemes: filteredLightThemes,
            darkThemes: filteredDarkThemes,
        }, children: _jsxs(StyledThemeProvider, { theme: currentTheme, children: [GlobalStyleComponent && _jsx(GlobalStyleComponent, { theme: currentTheme }), children] }) }));
};
