import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styled from 'styled-components';
const Overlay = styled.div `
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100002; /* Higher than modal */
  backdrop-filter: blur(2px);
  touch-action: none;
`;
const Dialog = styled.div `
  background: #ffffff;
  width: 95vw;
  max-width: 320px;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: popIn 0.2s ease-out;

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;
const Content = styled.div `
  padding: 24px 20px 20px;
  text-align: center;
`;
const Message = styled.div `
  color: #000;
  font-size: 1rem;
  line-height: 1.4;
`;
const ButtonGroup = styled.div `
  display: flex;
  flex-wrap: wrap;
  border-top: 1px solid #e0e0e0;
`;
const Button = styled.button `
  flex: 1 0 120px;
  background: transparent;
  border: none;
  border-right: 1px solid #e0e0e0;
  padding: 14px;
  font-size: 1rem;
  font-weight: ${({ $primary }) => $primary ? '600' : '400'};
  color: ${({ $danger }) => $danger ? '#fa5252' : '#228be6'};
  cursor: pointer;
  
  &:last-child {
    border-right: none;
  }

  @media (max-width: 250px) {
    border-right: none;
    &:first-child {
      border-bottom: 1px solid #e0e0e0;
    }
  }
  
  &:active {
    background: #f8f9fa;
  }
  
  &:hover {
    background: #f8f9fa;
  }
`;
export const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, onNeutral, confirmText = 'OK', cancelText = 'Cancel', neutralText, isDestructive = false }) => {
    if (!isOpen)
        return null;
    return (_jsx(Overlay, { onClick: onCancel, children: _jsxs(Dialog, { onClick: e => e.stopPropagation(), children: [_jsx(Content, { children: _jsx(Message, { children: message }) }), _jsxs(ButtonGroup, { children: [_jsx(Button, { onClick: onCancel, children: cancelText }), neutralText && onNeutral && (_jsx(Button, { onClick: onNeutral, children: neutralText })), _jsx(Button, { onClick: onConfirm, "$primary": true, "$danger": isDestructive, children: confirmText })] })] }) }));
};
