import React from 'react';
import { useLanguage } from '@memosuite/shared';

import styled, { keyframes } from 'styled-components';
import { FiTrash2, FiFileText, FiX } from 'react-icons/fi';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  animation: ${fadeIn} 0.2s ease-out;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${slideUp} 0.2s ease-out;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Message = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChoiceButton = styled.button<{ $variant?: 'danger' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $variant }) =>
    $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : theme.colors.surface};
  color: ${({ theme, $variant }) =>
    $variant === 'danger' ? theme.colors.danger : theme.colors.text};
  cursor: pointer;
  font-weight: 600;
  text-align: left;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme, $variant }) =>
    $variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' : theme.colors.border};
    transform: translateY(-1px);
  }

  svg {
    font-size: 1.25rem;
  }
`;

interface DeleteChoiceModalProps {
  onClose: () => void;
  onDeleteLogOnly: () => void;
  onDeleteThread?: () => void;
  isThreadHead: boolean;
}

export const DeleteChoiceModal: React.FC<DeleteChoiceModalProps> = ({
  onClose,
  onDeleteLogOnly,
  onDeleteThread,
  isThreadHead
}) => {
  const { t } = useLanguage();

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <h3>{t.log_detail.delete}</h3>
          <CloseButton onClick={onClose}><FiX /></CloseButton>
        </Header>
        <Message>
          {isThreadHead ? t.log_detail.delete_thread_confirm : t.log_detail.delete_confirm}
        </Message>
        <ButtonGroup>
          {isThreadHead && onDeleteThread && (
            <ChoiceButton onClick={onDeleteThread} $variant="danger">
              <FiTrash2 />
              <div>
                <div style={{ fontSize: '1rem' }}>{t.log_detail.delete_thread_entire}</div>
              </div>
            </ChoiceButton>
          )}
          <ChoiceButton onClick={onDeleteLogOnly} $variant={isThreadHead ? undefined : 'danger'}>
            {isThreadHead ? <FiFileText /> : <FiTrash2 />}
            <div>
              <div style={{ fontSize: '1rem' }}>
                {isThreadHead ? t.log_detail.delete_log_only : t.log_detail.delete}
              </div>
            </div>
          </ChoiceButton>
        </ButtonGroup>
      </Modal>
    </Overlay>
  );
};