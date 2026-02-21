import React from 'react';
import type { ReactNode } from 'react';
import type { ColorTheme, ThemeMode, Theme } from './types';
interface ColorThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    theme: Theme;
    currentThemeId: string;
    setThemeById: (id: string) => void;
    lightThemes: ColorTheme[];
    darkThemes: ColorTheme[];
}
export declare const useColorTheme: () => ColorThemeContextType;
interface ColorThemeProviderProps {
    children: ReactNode;
    storageKeyPrefix?: string;
    defaultLightThemeId?: string;
    defaultDarkThemeId?: string;
    GlobalStyleComponent?: React.ComponentType<{
        theme: Theme;
    }>;
}
export declare const ColorThemeProvider: React.FC<ColorThemeProviderProps>;
export {};
