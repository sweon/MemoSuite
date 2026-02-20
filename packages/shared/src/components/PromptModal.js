import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
const Overlay = styled.div `
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(2px);
`;
const Dialog = styled.div `
  background: ${({ theme }) => theme.colors.surface || '#fff'};
  width: 320px;
  max-width: 85vw;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
`;
const Content = styled.div `
  padding: 24px 20px 16px;
  text-align: center;
`;
const Message = styled.div `
  color: ${({ theme }) => theme.colors.text || '#000'};
  font-size: 1rem;
  line-height: 1.4;
  margin-bottom: 16px;
  font-weight: 600;
`;
const Input = styled.input `
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
  background: ${({ theme }) => theme.colors.background || '#f9f9f9'};
  color: ${({ theme }) => theme.colors.text || '#000'};
  font-size: 1rem;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary || '#007aff'};
  }
`;
const ButtonGroup = styled.div `
  display: flex;
  border-top: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
`;
const Button = styled.button `
  flex: 1;
  background: transparent;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
  padding: 14px;
  font-size: 1rem;
  font-weight: ${({ $primary }) => $primary ? '600' : '400'};
  color: ${({ theme, $primary }) => $primary ? (theme.colors.primary || '#007aff') : (theme.colors.textSecondary || '#666')};
  cursor: pointer;
  
  &:last-child {
    border-right: none;
  }
  
  &:active {
    background: ${({ theme }) => theme?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  }
`;
export const PromptModal = ({ isOpen, message, defaultValue = '', placeholder = '', onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel' }) => {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef(null);
    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, defaultValue]);
    if (!isOpen)
        return null;
    const handleConfirm = () => {
        onConfirm(value);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
        else if (e.key === 'Escape') {
            onCancel();
        }
    };
    return (_jsx(Overlay, { onClick: onCancel, children: _jsxs(Dialog, { onClick: e => e.stopPropagation(), children: [_jsxs(Content, { children: [_jsx(Message, { children: message }), _jsx(Input, { ref: inputRef, value: value, placeholder: placeholder, onChange: e => setValue(e.target.value), onKeyDown: handleKeyDown })] }), _jsxs(ButtonGroup, { children: [_jsx(Button, { onClick: onCancel, children: cancelText }), _jsx(Button, { onClick: handleConfirm, "$primary": true, children: confirmText })] })] }) }));
};
