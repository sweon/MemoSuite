import type { ColorTheme } from './types';
export declare const lightThemes: ColorTheme[];
export declare const darkThemes: ColorTheme[];
export declare const allThemes: ColorTheme[];
export declare function getThemeById(id: string): ColorTheme | undefined;
export declare function getDefaultTheme(mode: 'light' | 'dark'): ColorTheme;
