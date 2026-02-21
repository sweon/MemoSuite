import React from 'react';
export type PageNumberPosition = 'none' | 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right';
export type PageNumberFormat = 'number' | 'dash-number' | 'page-n' | 'n-of-total';
export interface PrintMargins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface PrintSettings {
    headerLeft: string;
    headerCenter: string;
    headerRight: string;
    footerLeft: string;
    footerCenter: string;
    footerRight: string;
    pageNumber: PageNumberPosition;
    pageNumberFormat: PageNumberFormat;
    margins: PrintMargins;
    showBorder: boolean;
    includeComments: boolean;
    excludeFirstPageNumber: boolean;
}
export declare function loadPrintSettings(appName: string): PrintSettings;
export declare function executePrint(settings: PrintSettings, title?: string): void;
interface PrintSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appName: string;
    language?: 'en' | 'ko' | string;
    title?: string;
}
export declare const PrintSettingsModal: React.FC<PrintSettingsModalProps>;
export {};
