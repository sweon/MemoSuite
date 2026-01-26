import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
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

const Dialog = styled.div`
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

const Content = styled.div`
  padding: 24px 20px 20px;
  text-align: center;
`;

const Message = styled.div`
  color: #000;
  font-size: 1rem;
  line-height: 1.4;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  border-top: 1px solid #e0e0e0;
`;

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
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

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={e => e.stopPropagation()}>
        <Content>
          <Message>{message}</Message>
        </Content>
        <ButtonGroup>
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button onClick={onConfirm} $primary $danger={isDestructive}>
            {confirmText}
          </Button>
        </ButtonGroup>
      </Dialog>
    </Overlay>
  );
};
