import React, { useState } from 'react';
import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useLanguage } from '@memosuite/shared';
import { FiFolder, FiX, FiArrowRight } from 'react-icons/fi';

// Warning color constant (amber)
const WARNING_COLOR = '#f59e0b';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.large};
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadows.large};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.small};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const FolderListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FolderItem = styled.button<{ $isSelected: boolean; $isCurrent: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme, $isSelected }) => $isSelected ? theme.colors.primary + '15' : theme.colors.background};
  border: 2px solid ${({ theme, $isSelected, $isCurrent }) =>
        $isSelected ? theme.colors.primary :
            $isCurrent ? WARNING_COLOR :
                theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.medium};
  cursor: ${({ $isCurrent }) => $isCurrent ? 'not-allowed' : 'pointer'};
  opacity: ${({ $isCurrent }) => $isCurrent ? 0.6 : 1};
  width: 100%;
  text-align: left;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $isCurrent }) => $isCurrent ? WARNING_COLOR : theme.colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const FolderItemIcon = styled.div<{ $isReadOnly?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme, $isReadOnly }) => $isReadOnly ? WARNING_COLOR + '20' : theme.colors.primary + '20'};
  color: ${({ $isReadOnly, theme }) => $isReadOnly ? WARNING_COLOR : theme.colors.primary};
`;

const FolderItemInfo = styled.div`
  flex: 1;
`;

const FolderItemName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'cancel' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ theme, $variant }) =>
        $variant === 'primary' ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $variant }) =>
        $variant === 'primary' ? theme.colors.primary : 'transparent'};
  color: ${({ theme, $variant }) =>
        $variant === 'primary' ? 'white' : theme.colors.text};

  &:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

interface BookMoveModalProps {
    bookId: number;
    currentFolderId: number | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export const BookMoveModal: React.FC<BookMoveModalProps> = ({
    bookId,
    currentFolderId,
    onClose,
    onSuccess
}) => {
    const { language } = useLanguage();
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const folders = useLiveQuery(() => db.folders.toArray());

    const handleMove = async () => {
        if (!selectedFolderId) return;

        setIsProcessing(true);

        try {
            await db.books.update(bookId, { folderId: selectedFolderId });
            onSuccess(language === 'ko' ? '책이 이동되었습니다' : 'Book moved');
            onClose();
        } catch (error) {
            console.error('Failed to move book:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const t = {
        title: language === 'ko' ? '폴더로 이동' : 'Move to Folder',
        cancel: language === 'ko' ? '취소' : 'Cancel',
        confirm: language === 'ko' ? '이동' : 'Move',
        currentFolder: language === 'ko' ? '현재 폴더' : 'Current folder',
        selectFolder: language === 'ko' ? '대상 폴더를 선택하세요' : 'Select a destination folder',
    };

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Header>
                    <Title>{t.title}</Title>
                    <CloseButton onClick={onClose}>
                        <FiX size={20} />
                    </CloseButton>
                </Header>

                <Body>
                    <p style={{ fontSize: '0.9rem', color: 'inherit', marginBottom: '12px' }}>
                        {t.selectFolder}
                    </p>

                    <FolderListWrapper>
                        {(folders || []).map(folder => {
                            const isCurrent = folder.id === currentFolderId;
                            const isSelected = folder.id === selectedFolderId;

                            return (
                                <FolderItem
                                    key={folder.id}
                                    $isSelected={isSelected}
                                    $isCurrent={isCurrent}
                                    disabled={isCurrent}
                                    onClick={() => {
                                        if (!isCurrent) {
                                            setSelectedFolderId(folder.id!);
                                        }
                                    }}
                                >
                                    <FolderItemIcon $isReadOnly={folder.isReadOnly}>
                                        <FiFolder size={18} />
                                    </FolderItemIcon>
                                    <FolderItemInfo>
                                        <FolderItemName>
                                            {folder.name}
                                            {isCurrent && ` (${t.currentFolder})`}
                                        </FolderItemName>
                                    </FolderItemInfo>
                                </FolderItem>
                            );
                        })}
                    </FolderListWrapper>
                </Body>

                <Footer>
                    <ActionButton onClick={onClose}>
                        {t.cancel}
                    </ActionButton>
                    <ActionButton
                        $variant="primary"
                        onClick={handleMove}
                        disabled={!selectedFolderId || isProcessing}
                    >
                        <FiArrowRight size={16} />
                        {t.confirm}
                    </ActionButton>
                </Footer>
            </Modal>
        </Overlay>
    );
};
