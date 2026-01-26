import 'styled-components';
import { ColorPalette } from './theme/types';

declare module 'styled-components' {
    export interface DefaultTheme {
        mode: 'light' | 'dark';
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
}
