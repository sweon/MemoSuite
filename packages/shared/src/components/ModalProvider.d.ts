import React from 'react';
export interface ConfirmOptions {
    message: string;
    confirmText?: string;
    cancelText?: string | null;
    neutralText?: string;
    isDestructive?: boolean;
}
export interface PromptOptions {
    message: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
}
type ChoiceResult = 'confirm' | 'cancel' | 'neutral';
interface ModalContextType {
    confirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
    prompt: (messageOrOptions: string | PromptOptions) => Promise<string | null>;
    choice: (options: ConfirmOptions) => Promise<ChoiceResult>;
}
export declare const ModalProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useModal: () => ModalContextType;
export declare const useConfirm: () => ModalContextType;
export {};
