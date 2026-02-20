import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { PromptModal } from './PromptModal';
const ModalContext = createContext(undefined);
export const ModalProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        options: { message: '' },
        resolve: null,
        isChoice: false
    });
    const [promptState, setPromptState] = useState({
        isOpen: false,
        options: { message: '' },
        resolve: null
    });
    const confirm = useCallback((messageOrOptions) => {
        const options = typeof messageOrOptions === 'string'
            ? { message: messageOrOptions }
            : messageOrOptions;
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                options,
                resolve,
                isChoice: false
            });
        });
    }, []);
    const choice = useCallback((options) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                options,
                resolve,
                isChoice: true
            });
        });
    }, []);
    const prompt = useCallback((messageOrOptions) => {
        const options = typeof messageOrOptions === 'string'
            ? { message: messageOrOptions }
            : messageOrOptions;
        return new Promise((resolve) => {
            setPromptState({
                isOpen: true,
                options,
                resolve
            });
        });
    }, []);
    const handleConfirmClose = (result) => {
        if (confirmState.resolve) {
            confirmState.resolve(result);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };
    const handlePromptClose = (result) => {
        if (promptState.resolve) {
            promptState.resolve(result);
        }
        setPromptState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };
    return (_jsxs(ModalContext.Provider, { value: { confirm, prompt, choice }, children: [children, _jsx(ConfirmModal, { isOpen: confirmState.isOpen, message: confirmState.options.message, confirmText: confirmState.options.confirmText, cancelText: confirmState.options.cancelText, neutralText: confirmState.options.neutralText, isDestructive: confirmState.options.isDestructive, onConfirm: () => handleConfirmClose(confirmState.isChoice ? 'confirm' : true), onCancel: () => handleConfirmClose(confirmState.isChoice ? 'cancel' : false), onNeutral: () => handleConfirmClose('neutral') }), _jsx(PromptModal, { isOpen: promptState.isOpen, message: promptState.options.message, defaultValue: promptState.options.defaultValue, placeholder: promptState.options.placeholder, confirmText: promptState.options.confirmText, cancelText: promptState.options.cancelText, onConfirm: (val) => handlePromptClose(val), onCancel: () => handlePromptClose(null) })] }));
};
export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context)
        throw new Error('useModal must be used within ModalProvider');
    return context;
};
// Legacy Export for backward compatibility
export const useConfirm = useModal;
