import React from 'react';
import "@fortune-sheet/react/dist/index.css";
interface SpreadsheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    onAutosave?: (data: any) => void;
    initialData?: any;
    language?: 'en' | 'ko';
}
export declare const SpreadsheetModal: React.FC<SpreadsheetModalProps>;
export {};
