import React from 'react';
interface PromptModalProps {
    isOpen: boolean;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}
export declare const PromptModal: React.FC<PromptModalProps>;
export {};
