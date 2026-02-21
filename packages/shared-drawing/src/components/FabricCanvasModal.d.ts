import React from 'react';
interface FabricCanvasModalProps {
    initialData?: string;
    onSave: (data: string) => void;
    onAutosave?: (data: string) => void;
    onClose: () => void;
    language?: string;
}
export declare const FabricCanvasModal: React.FC<FabricCanvasModalProps>;
export {};
