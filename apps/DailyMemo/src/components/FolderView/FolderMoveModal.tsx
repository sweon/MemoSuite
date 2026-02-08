import React, { useState } from 'react';
import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Memo } from '../../db';
import { useLanguage } from '@memosuite/shared';
import { FiFolder, FiX, FiArrowRight, FiCopy } from 'react-icons/fi';

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

const ModeSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ModeButton = styled.button<{ $isActive: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $isActive }) => $isActive ? 'white' : theme.colors.text};
  border: 2px solid ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
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

const FolderItemMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
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

const InfoText = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.small};
`;

interface FolderMoveModalProps {
    memoId: number;
    currentFolderId: number | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export const FolderMoveModal: React.FC<FolderMoveModalProps> = ({
    memoId,
    currentFolderId,
    onClose,
    onSuccess
}) => {
    const { language } = useLanguage();
    const [mode, setMode] = useState<'move' | 'copy'>('move');
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const folders = useLiveQuery(() => db.folders.toArray());
    const memo = useLiveQuery(() => db.memos.get(memoId), [memoId]);
    const allMemos = useLiveQuery(() => db.memos.toArray());

    // Calculate memo counts per folder
    const folderMemoCounts = React.useMemo(() => {
        const counts: Record<number, number> = {};
        (allMemos || []).forEach(m => {
            const fid = m.folderId || 0;
            counts[fid] = (counts[fid] || 0) + 1;
        });
        return counts;
    }, [allMemos]);

    const handleMoveOrCopy = async () => {
        if (!selectedFolderId || !memo) return;

        setIsProcessing(true);

        try {
            if (mode === 'move') {
                // If this memo is part of a thread and is the header, move the entire thread
                if (memo.threadId) {
                    const threadMemos = await db.memos.where('threadId').equals(memo.threadId).toArray();
                    const isHeader = threadMemos.length > 1 &&
                        threadMemos.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0))[0].id === memoId;

                    if (isHeader) {
                        // Move entire thread
                        await db.memos.where('threadId').equals(memo.threadId).modify({
                            folderId: selectedFolderId
                        });
                        onSuccess(language === 'ko'
                            ? `스레드 전체가 이동되었습니다 (${threadMemos.length}개 메모)`
                            : `Thread moved (${threadMemos.length} memos)`);
                    } else {
                        // Move single memo
                        await db.memos.update(memoId, { folderId: selectedFolderId });
                        onSuccess(language === 'ko' ? '메모가 이동되었습니다' : 'Memo moved');
                    }
                } else {
                    await db.memos.update(memoId, { folderId: selectedFolderId });
                    onSuccess(language === 'ko' ? '메모가 이동되었습니다' : 'Memo moved');
                }
            } else {
                // Copy mode
                const now = new Date();

                // Copy the memo
                const comments = await db.comments.where('memoId').equals(memoId).toArray();

                // Create new memo without id
                const newMemo: Omit<Memo, 'id'> = {
                    folderId: selectedFolderId,
                    title: memo.title,
                    content: memo.content,
                    tags: [...memo.tags],
                    createdAt: now,
                    updatedAt: now,
                    // Don't copy threadId - copied memo starts fresh
                    type: memo.type
                };

                const newMemoId = await db.memos.add(newMemo as Memo);

                // Copy comments
                for (const comment of comments) {
                    await db.comments.add({
                        memoId: newMemoId,
                        content: comment.content,
                        createdAt: now,
                        updatedAt: now
                    });
                }

                onSuccess(language === 'ko' ? '메모가 복사되었습니다' : 'Memo copied');
            }

            onClose();
        } catch (error) {
            console.error('Failed to move/copy memo:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const t = {
        title: language === 'ko' ? '폴더로 이동/복사' : 'Move/Copy to Folder',
        move: language === 'ko' ? '이동' : 'Move',
        copy: language === 'ko' ? '복사' : 'Copy',
        cancel: language === 'ko' ? '취소' : 'Cancel',
        confirm: language === 'ko' ? '확인' : 'Confirm',
        currentFolder: language === 'ko' ? '현재 폴더' : 'Current folder',
        selectFolder: language === 'ko' ? '대상 폴더를 선택하세요' : 'Select a destination folder',
        threadMoveNote: language === 'ko'
            ? '스레드의 첫 번째 메모를 이동하면 스레드 전체가 이동됩니다.'
            : 'Moving the first memo of a thread will move the entire thread.',
        memoCount: (count: number) => language === 'ko' ? `${count}개 메모` : `${count} memos`,
    };

    const isThreadHeader = memo?.threadId && allMemos?.some(m =>
        m.threadId === memo.threadId && m.id !== memoId && (m.threadOrder || 0) > (memo.threadOrder || 0)
    );

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
                    <ModeSelector>
                        <ModeButton $isActive={mode === 'move'} onClick={() => setMode('move')}>
                            <FiArrowRight size={18} />
                            {t.move}
                        </ModeButton>
                        <ModeButton $isActive={mode === 'copy'} onClick={() => setMode('copy')}>
                            <FiCopy size={18} />
                            {t.copy}
                        </ModeButton>
                    </ModeSelector>

                    {mode === 'move' && isThreadHeader && (
                        <InfoText>
                            ⚠️ {t.threadMoveNote}
                        </InfoText>
                    )}

                    <p style={{ fontSize: '0.9rem', color: 'inherit', marginBottom: '12px' }}>
                        {t.selectFolder}
                    </p>

                    <FolderListWrapper>
                        {(folders || []).map(folder => {
                            const isCurrent = folder.id === currentFolderId;
                            const isSelected = folder.id === selectedFolderId;
                            const memoCount = folderMemoCounts[folder.id!] || 0;

                            return (
                                <FolderItem
                                    key={folder.id}
                                    $isSelected={isSelected}
                                    $isCurrent={isCurrent}
                                    disabled={isCurrent && mode === 'move'}
                                    onClick={() => {
                                        if (!(isCurrent && mode === 'move')) {
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
                                        <FolderItemMeta>{t.memoCount(memoCount)}</FolderItemMeta>
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
                        onClick={handleMoveOrCopy}
                        disabled={!selectedFolderId || isProcessing}
                    >
                        {mode === 'move' ? <FiArrowRight size={16} /> : <FiCopy size={16} />}
                        {mode === 'move' ? t.move : t.copy}
                    </ActionButton>
                </Footer>
            </Modal>
        </Overlay>
    );
};
