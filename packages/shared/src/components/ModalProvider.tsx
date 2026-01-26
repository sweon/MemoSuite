import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { PromptModal } from './PromptModal';

export interface ConfirmOptions {
    message: string;
    confirmText?: string;
    cancelText?: string | null;
    isDestructive?: boolean;
}

export interface PromptOptions {
    message: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
}

interface ModalContextType {
    confirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
    prompt: (messageOrOptions: string | PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        options: { message: '' },
        resolve: null
    });

    const [promptState, setPromptState] = useState<{
        isOpen: boolean;
        options: PromptOptions;
        resolve: ((value: string | null) => void) | null;
    }>({
        isOpen: false,
        options: { message: '' },
        resolve: null
    });

    const confirm = useCallback((messageOrOptions: string | ConfirmOptions) => {
        const options = typeof messageOrOptions === 'string'
            ? { message: messageOrOptions }
            : messageOrOptions;

        return new Promise<boolean>((resolve) => {
            setConfirmState({
                isOpen: true,
                options,
                resolve
            });
        });
    }, []);

    const prompt = useCallback((messageOrOptions: string | PromptOptions) => {
        const options = typeof messageOrOptions === 'string'
            ? { message: messageOrOptions }
            : messageOrOptions;

        return new Promise<string | null>((resolve) => {
            setPromptState({
                isOpen: true,
                options,
                resolve
            });
        });
    }, []);

    const handleConfirmClose = (result: boolean) => {
        if (confirmState.resolve) {
            confirmState.resolve(result);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };

    const handlePromptClose = (result: string | null) => {
        if (promptState.resolve) {
            promptState.resolve(result);
        }
        setPromptState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };

    return (
        <ModalContext.Provider value={{ confirm, prompt }}>
            {children}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                message={confirmState.options.message}
                confirmText={confirmState.options.confirmText}
                cancelText={confirmState.options.cancelText}
                isDestructive={confirmState.options.isDestructive}
                onConfirm={() => handleConfirmClose(true)}
                onCancel={() => handleConfirmClose(false)}
            />
            <PromptModal
                isOpen={promptState.isOpen}
                message={promptState.options.message}
                defaultValue={promptState.options.defaultValue}
                placeholder={promptState.options.placeholder}
                confirmText={promptState.options.confirmText}
                cancelText={promptState.options.cancelText}
                onConfirm={(val) => handlePromptClose(val)}
                onCancel={() => handlePromptClose(null)}
            />
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal must be used within ModalProvider');
    return context;
};

// Legacy Export for backward compatibility
export const useConfirm = useModal;
