import React from 'react';
interface ThemeSettingsProps {
    t: {
        light_modes: string;
        dark_modes: string;
        current_theme: string;
        names?: Record<string, string>;
    };
}
export declare const ThemeSettings: React.FC<ThemeSettingsProps>;
export {};
