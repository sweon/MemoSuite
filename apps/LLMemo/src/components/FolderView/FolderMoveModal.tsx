import React, { useState } from 'react';
import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Log } from '../../db';
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
  gap: 2px;
`;

const FolderItem = styled.button<{ $isSelected: boolean; $isCurrent: boolean; $level: number }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  padding-left: ${({ $level, theme }) => `calc(${theme.spacing.md} + ${$level * 24}px)`};
  background: ${({ theme, $isSelected }) => $isSelected ? theme.colors.primary + '15' : 'transparent'};
  border: 1px solid ${({ theme, $isSelected, $isCurrent }) =>
        $isSelected ? theme.colors.primary :
            $isCurrent ? WARNING_COLOR :
                'transparent'};
  border-radius: ${({ theme }) => theme.radius.medium};
  cursor: ${({ $isCurrent }) => $isCurrent ? 'not-allowed' : 'pointer'};
  opacity: ${({ $isCurrent }) => $isCurrent ? 0.6 : 1};
  width: 100%;
  text-align: left;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme, $isSelected }) => $isSelected ? theme.colors.primary + '20' : theme.colors.background};
    border-color: ${({ theme, $isCurrent, $isSelected }) => ($isCurrent ? WARNING_COLOR : ($isSelected ? theme.colors.primary : theme.colors.border))};
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
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme, $isReadOnly }) => $isReadOnly ? WARNING_COLOR + '20' : theme.colors.primary + '20'};
  color: ${({ $isReadOnly, theme }) => $isReadOnly ? WARNING_COLOR : theme.colors.primary};
`;

const FolderItemInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FolderItemName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
`;

const FolderItemMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.background};
  padding: 2px 6px;
  border-radius: 10px;
`;

interface FolderNode {
    id: number;
    name: string;
    parentId?: number | null;
    isReadOnly?: boolean;
    isHome?: boolean;
    children: FolderNode[];
}

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
    currentFolderId: number | null | undefined;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export const FolderMoveModal: React.FC<FolderMoveModalProps> = ({
    memoId,
    currentFolderId,
    onClose,
    onSuccess
}) => {
    const { language, t: sharedT } = useLanguage();
    const [mode, setMode] = useState<'move' | 'copy'>('move');
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const folders = useLiveQuery(() => db.folders.toArray());
    const log = useLiveQuery(() => db.logs.get(memoId), [memoId]);
    const allLogs = useLiveQuery(() => db.logs.toArray());

    // Build folder tree
    const folderTree = React.useMemo(() => {
        if (!folders) return [];

        const nodes: Record<number, FolderNode> = {};
        folders.forEach(f => {
            nodes[f.id!] = { ...f, id: f.id!, children: [] };
        });

        const rootNodes: FolderNode[] = [];
        const seenHome = new Set<string>();

        folders.forEach(f => {
            // Skip "Default Folder" as requested
            if (f.name === '기본 폴더' || f.name === 'Default Folder') return;

            if (f.parentId && nodes[f.parentId]) {
                nodes[f.parentId].children.push(nodes[f.id!]);
            } else {
                // Unique check for root Home to avoid duplicates if DB state is messy
                if (f.isHome || f.name === '홈' || f.name === 'Home') {
                    if (seenHome.has('home')) return;
                    seenHome.add('home');
                }
                rootNodes.push(nodes[f.id!]);
            }
        });

        // Ensure Home folder comes first if it exists
        return rootNodes.sort((a, b) => {
            if (a.isHome) return -1;
            if (b.isHome) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [folders]);

    // Calculate logs counts per folder
    const folderLogCounts = React.useMemo(() => {
        const counts: Record<number, number> = {};
        (allLogs || []).forEach(l => {
            const fid = l.folderId || 0;
            counts[fid] = (counts[fid] || 0) + 1;
        });
        return counts;
    }, [allLogs]);

    const handleMoveOrCopy = async () => {
        if (!selectedFolderId || !log) return;

        setIsProcessing(true);

        try {
            if (mode === 'move') {
                // If this log is part of a thread and is the header, move the entire thread
                if (log.threadId) {
                    const threadLogs = await db.logs.where('threadId').equals(log.threadId).toArray();
                    const isHeader = threadLogs.length > 1 &&
                        threadLogs.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0))[0].id === memoId;

                    if (isHeader) {
                        // Move entire thread
                        await db.logs.where('threadId').equals(log.threadId).modify({
                            folderId: selectedFolderId
                        });
                        onSuccess(language === 'ko'
                            ? `스레드 전체가 이동되었습니다 (${threadLogs.length}개 항목)`
                            : `Thread moved (${threadLogs.length} items)`);
                    } else {
                        // Move single log
                        await db.logs.update(memoId, { folderId: selectedFolderId });
                        onSuccess(language === 'ko' ? '항목이 이동되었습니다' : 'Item moved');
                    }
                } else {
                    await db.logs.update(memoId, { folderId: selectedFolderId });
                    onSuccess(language === 'ko' ? '항목이 이동되었습니다' : 'Item moved');
                }
            } else {
                // Copy mode
                const now = new Date();

                // Copy the log
                const comments = await db.comments.where('logId').equals(memoId).toArray();

                // Create new log without id
                const newLog: Omit<Log, 'id'> = {
                    folderId: selectedFolderId,
                    title: log.title,
                    content: log.content,
                    tags: [...log.tags],
                    createdAt: now,
                    updatedAt: now,
                    // Don't copy threadId - copied log starts fresh
                    modelId: log.modelId
                };

                const newLogId = await db.logs.add(newLog as Log);

                // Copy comments
                for (const comment of comments) {
                    await db.comments.add({
                        logId: newLogId,
                        content: comment.content,
                        createdAt: now,
                        updatedAt: now
                    });
                }

                onSuccess(language === 'ko' ? '항목이 복사되었습니다' : 'Item copied');
            }

            onClose();
        } catch (error) {
            console.error('Failed to move/copy log:', error);
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
        memoCount: (count: number) => language === 'ko' ? `${count}개` : `${count}`,
        home: sharedT.common.home
    };

    const isThreadHeader = log?.threadId && allLogs?.some(l =>
        l.threadId === log.threadId && l.id !== memoId && (l.threadOrder || 0) > (log.threadOrder || 0)
    );

    const renderFolderNodes = (nodes: FolderNode[], level: number = 0) => {
        return nodes.map(node => {
            const isCurrent = node.id === currentFolderId;
            const isSelected = node.id === selectedFolderId;
            const logCount = folderLogCounts[node.id] || 0;

            const content = (
                <FolderItem
                    $isSelected={isSelected}
                    $isCurrent={isCurrent}
                    $level={level}
                    disabled={isCurrent && mode === 'move'}
                    onClick={() => {
                        if (!(isCurrent && mode === 'move')) {
                            setSelectedFolderId(node.id);
                        }
                    }}
                >
                    <FolderItemIcon $isReadOnly={node.isReadOnly}>
                        <FiFolder size={16} />
                    </FolderItemIcon>
                    <FolderItemInfo>
                        <FolderItemName>
                            {node.isHome ? t.home : node.name}
                            {isCurrent && ` (${t.currentFolder})`}
                        </FolderItemName>
                        <FolderItemMeta>{t.memoCount(logCount)}</FolderItemMeta>
                    </FolderItemInfo>
                </FolderItem>
            );

            return (
                <React.Fragment key={node.id}>
                    {!isCurrent && content}
                    {node.children.length > 0 && renderFolderNodes(node.children, level + (isCurrent ? 0 : 1))}
                </React.Fragment>
            );
        });
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

                    <p style={{ fontSize: '0.9rem', color: 'inherit', marginBottom: '12px', paddingLeft: '4px' }}>
                        {t.selectFolder}
                    </p>

                    <FolderListWrapper>
                        {renderFolderNodes(folderTree)}
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
