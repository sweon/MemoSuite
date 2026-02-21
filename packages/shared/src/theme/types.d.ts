import type { DefaultTheme } from 'styled-components';
export interface ColorPalette {
    background: string;
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
    primaryHover: string;
    danger: string;
    success: string;
    accent?: string;
    glassBackground?: string;
    glassBorder?: string;
    shadowColor?: string;
}
export interface ColorTheme {
    id: string;
    name: string;
    mode: 'light' | 'dark';
    colors: ColorPalette;
}
export type ThemeMode = 'light' | 'dark';
export interface Theme extends DefaultTheme {
    mode: ThemeMode;
    fontSize: number;
    themeName: string;
    colors: ColorPalette;
    radius: {
        small: string;
        medium: string;
        large: string;
        full: string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    shadows: {
        small: string;
        medium: string;
        large: string;
        glass: string;
    };
    effects: {
        blur: string;
        transition: string;
    };
}
