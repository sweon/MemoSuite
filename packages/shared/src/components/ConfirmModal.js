import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
  width: 300px;
  max-width: 85vw;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
`;
const Content = styled.div `
  padding: 24px 20px 20px;
  text-align: center;
`;
const Message = styled.div `
  color: ${({ theme }) => theme.colors.text || '#000'};
  font-size: 0.9rem;
  line-height: 1.4;
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
  font-size: 0.9rem;
  font-weight: ${({ $primary }) => $primary ? '600' : '400'};
  color: ${({ theme, $danger, $primary }) => $danger ? (theme.colors.danger || '#ff3b30') :
    $primary ? (theme.colors.primary || '#007aff') :
        (theme.colors.primary || '#007aff') // iOS style: Cancel is also blue typically, but let's keep it primary
};
  cursor: pointer;
  
  &:last-child {
    border-right: none;
  }
  
  &:active {
    background: ${({ theme }) => theme?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  }
`;
export const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, onNeutral, confirmText = 'OK', cancelText = 'Cancel', neutralText, isDestructive = false }) => {
    if (!isOpen)
        return null;
    return (_jsx(Overlay, { onClick: onCancel, children: _jsxs(Dialog, { onClick: e => e.stopPropagation(), children: [_jsx(Content, { children: _jsx(Message, { children: message }) }), _jsxs(ButtonGroup, { children: [cancelText && _jsx(Button, { onClick: onCancel, children: cancelText }), neutralText && onNeutral && _jsx(Button, { onClick: onNeutral, children: neutralText }), _jsx(Button, { onClick: onConfirm, "$primary": true, "$danger": isDestructive, children: confirmText })] })] }) }));
};
