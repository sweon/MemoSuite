import React from 'react';
import { useLanguage } from '@memosuite/shared';

import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  padding: 1.5rem;
  border-radius: 12px;
  width: 90%;
  max-width: 320px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Message = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  line-height: 1.5;
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: center;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  border: 1px solid ${({ theme, $variant }) => $variant === 'secondary' ? theme.colors.border : 'transparent'};
  background: ${({ theme, $variant }) => $variant === 'secondary' ? 'transparent' : theme.colors.primary};
  color: ${({ theme, $variant }) => $variant === 'secondary' ? theme.colors.text : 'white'};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;

  &:hover {
    filter: brightness(0.95);
    background: ${({ theme, $variant }) => $variant === 'secondary' ? theme.colors.border : theme.colors.primary};
  }
`;

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <Overlay onClick={onCancel}>
      <Modal onClick={e => e.stopPropagation()}>
        <Message>{message}</Message>
        <ButtonGroup>
          <Button $variant="secondary" onClick={onCancel}>
            {language === 'ko' ? '취소' : 'Cancel'}
          </Button>
          <Button onClick={onConfirm}>
            {language === 'ko' ? '확인' : 'OK'}
          </Button>
        </ButtonGroup>
      </Modal>
    </Overlay>
  );
};