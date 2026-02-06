import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(2px);
`;

const Dialog = styled.div`
  background: ${({ theme }) => theme.colors.surface || '#fff'};
  width: 300px;
  max-width: 85vw;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
`;

const Content = styled.div`
  padding: 24px 20px 20px;
  text-align: center;
`;

const Message = styled.div`
  color: ${({ theme }) => theme.colors.text || '#000'};
  font-size: 0.9rem;
  line-height: 1.4;
`;

const ButtonGroup = styled.div`
  display: flex;
  border-top: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
`;

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  flex: 1;
  background: transparent;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
  padding: 14px;
  font-size: 0.9rem;
  font-weight: ${({ $primary }) => $primary ? '600' : '400'};
  color: ${({ theme, $danger, $primary }) =>
    $danger ? (theme.colors.danger || '#ff3b30') :
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

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  onNeutral?: () => void;
  confirmText?: string;
  cancelText?: string | null;
  neutralText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  onNeutral,
  confirmText = 'OK',
  cancelText = 'Cancel',
  neutralText,
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
          {cancelText && <Button onClick={onCancel}>{cancelText}</Button>}
          {neutralText && onNeutral && <Button onClick={onNeutral}>{neutralText}</Button>}
          <Button onClick={onConfirm} $primary $danger={isDestructive}>
            {confirmText}
          </Button>
        </ButtonGroup>
      </Dialog>
    </Overlay>
  );
};
