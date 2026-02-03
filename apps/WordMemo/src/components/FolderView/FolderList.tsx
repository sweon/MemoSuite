import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Folder } from '../../db';
import { useLanguage } from '@memosuite/shared';
import { FiFolder, FiPlus, FiEdit2, FiTrash2, FiSearch, FiLock, FiUnlock, FiEyeOff, FiEye, FiCheck, FiX } from 'react-icons/fi';

// Warning color constant (amber)
const WARNING_COLOR = '#f59e0b';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background};
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const SearchWrapper = styled.div`
  position: relative;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 12px 12px 40px;
  border-radius: ${({ theme }) => theme.radius.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const SortRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SortSelect = styled.select`
  flex: 1;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;

const FolderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const FolderCard = styled.div<{ $isActive?: boolean; $isReadOnly?: boolean }>`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.large};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  ${({ $isReadOnly, theme }) => $isReadOnly && `
    background: ${theme.colors.background};
    border-style: dashed;
  `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.medium};
    transform: translateY(-2px);
  }
`;

const FolderHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const FolderIcon = styled.div<{ $isReadOnly?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.medium};
  background: ${({ theme, $isReadOnly }) => $isReadOnly ? WARNING_COLOR + '20' : theme.colors.primary + '20'};
  color: ${({ $isReadOnly, theme }) => $isReadOnly ? WARNING_COLOR : theme.colors.primary};
`;

const FolderName = styled.div`
  flex: 1;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const FolderNameInput = styled.input`
  flex: 1;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.small};
  padding: 4px 8px;
  
  &:focus {
    outline: none;
  }
`;

const FolderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const FolderBadges = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
`;

const Badge = styled.span<{ $variant?: 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 0.75rem;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme, $variant }) =>
        $variant === 'warning' ? WARNING_COLOR + '20' :
            $variant === 'info' ? theme.colors.primary + '20' :
                theme.colors.border};
  color: ${({ theme, $variant }) =>
        $variant === 'warning' ? WARNING_COLOR :
            $variant === 'info' ? theme.colors.primary :
                theme.colors.textSecondary};
`;

const FolderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.sm};
  padding-top: ${({ theme }) => theme.spacing.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'success' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.radius.small};
  color: ${({ theme, $variant }) =>
        $variant === 'danger' ? theme.colors.danger :
            $variant === 'success' ? theme.colors.success :
                theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

type SortOption = 'last-edited' | 'name-asc' | 'name-desc' | 'created-asc' | 'created-desc' | 'last-commented';

interface FolderListProps {
    currentFolderId: number | null;
    onSelectFolder: (folderId: number) => void;
    onClose?: () => void;
}

export const FolderList: React.FC<FolderListProps> = ({
    currentFolderId,
    onSelectFolder
}) => {
    const { language } = useLanguage();
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>(() =>
        (localStorage.getItem('folder_sortBy') as SortOption) || 'last-edited'
    );
    const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    const folders = useLiveQuery(() => db.folders.toArray());
    const allWords = useLiveQuery(() => db.words.toArray());
    const allComments = useLiveQuery(() => db.comments.toArray());

    // Calculate memo counts and last edited times per folder
    const wordStats = useMemo(() => {
        const stats: Record<number, { count: number; lastEdited: number; lastCommented: number }> = {};

        if (!allWords || !allComments) return stats;

        // Build comment map for last commented time
        const wordLastCommented: Record<number, number> = {};
        allComments.forEach(c => {
            const time = c.updatedAt?.getTime() || c.createdAt.getTime();
            if (!wordLastCommented[c.wordId] || time > wordLastCommented[c.wordId]) {
                wordLastCommented[c.wordId] = time;
            }
        });

        allWords.forEach(log => {
            const fid = log.folderId || 0;
            if (!stats[fid]) {
                stats[fid] = { count: 0, lastEdited: 0, lastCommented: 0 };
            }
            stats[fid].count++;
            const editedTime = log.updatedAt.getTime();
            if (editedTime > stats[fid].lastEdited) {
                stats[fid].lastEdited = editedTime;
            }
            const commentTime = wordLastCommented[log.id!] || 0;
            if (commentTime > stats[fid].lastCommented) {
                stats[fid].lastCommented = commentTime;
            }
        });

        return stats;
    }, [allWords, allComments]);

    // Sort folders
    const sortedFolders = useMemo(() => {
        if (!folders) return [];

        const defaultFolder = folders.find(f => f.name === '기본 폴더' || f.name === 'Default Folder');
        const others = folders.filter(f => f !== defaultFolder);

        switch (sortBy) {
            case 'last-edited':
                others.sort((a, b) => {
                    const aTime = wordStats[a.id!]?.lastEdited || 0;
                    const bTime = wordStats[b.id!]?.lastEdited || 0;
                    return bTime - aTime;
                });
                break;
            case 'last-commented':
                others.sort((a, b) => {
                    const aTime = wordStats[a.id!]?.lastCommented || 0;
                    const bTime = wordStats[b.id!]?.lastCommented || 0;
                    return bTime - aTime;
                });
                break;
            case 'name-asc':
                others.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                others.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'created-asc':
                others.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
                break;
            case 'created-desc':
                others.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                break;
        }

        return defaultFolder ? [defaultFolder, ...others] : others;
    }, [folders, sortBy, wordStats]);

    // Global search logic
    const handleGlobalSearch = async () => {
        if (!globalSearchQuery.trim()) return;

        const q = globalSearchQuery.toLowerCase();
        const searchableFolderIds = (folders || [])
            .filter(f => !f.excludeFromGlobalSearch)
            .map(f => f.id!);

        const matchingMemos = (allWords || []).filter(log => {
            if (!searchableFolderIds.includes(log.folderId!)) return false;
            return (
                log.title.toLowerCase().includes(q) ||
                log.content.toLowerCase().includes(q) ||
                log.tags?.some(t => t.toLowerCase().includes(q))
            );
        });

        // For now, just log results. Later we can show them in a modal or navigate.
        console.log('Global search results:', matchingMemos);
        // TODO: Show search results UI
    };

    const handleAddFolder = async () => {
        const now = new Date();
        const newName = language === 'ko' ? '새 폴더' : 'New Folder';

        const newId = await db.folders.add({
            name: newName,
            isReadOnly: false,
            excludeFromGlobalSearch: false,
            createdAt: now,
            updatedAt: now
        });

        setEditingFolderId(newId);
        setEditingName(newName);
    };

    const handleRenameFolder = async (folderId: number) => {
        if (!editingName.trim()) return;

        await db.folders.update(folderId, {
            name: editingName.trim(),
            updatedAt: new Date()
        });

        setEditingFolderId(null);
        setEditingName('');
    };

    const handleDeleteFolder = async (folder: Folder) => {
        const wordCount = wordStats[folder.id!]?.count || 0;

        if (wordCount > 0) {
            alert(language === 'ko'
                ? '비어 있지 않은 폴더는 삭제할 수 없습니다.'
                : 'Cannot delete a folder that is not empty.');
            return;
        }

        const confirmed = window.confirm(
            language === 'ko'
                ? `"${folder.name}" 폴더를 삭제하시겠습니까?`
                : `Delete folder "${folder.name}"?`
        );

        if (confirmed) {
            await db.folders.delete(folder.id!);
        }
    };

    const handleToggleReadOnly = async (folder: Folder) => {
        await db.folders.update(folder.id!, {
            isReadOnly: !folder.isReadOnly,
            updatedAt: new Date()
        });
    };

    const handleToggleExcludeSearch = async (folder: Folder) => {
        await db.folders.update(folder.id!, {
            excludeFromGlobalSearch: !folder.excludeFromGlobalSearch,
            updatedAt: new Date()
        });
    };

    React.useEffect(() => {
        localStorage.setItem('folder_sortBy', sortBy);
    }, [sortBy]);

    const t = {
        title: language === 'ko' ? '폴더' : 'Folders',
        searchPlaceholder: language === 'ko' ? '전체 검색...' : 'Search all folders...',
        addFolder: language === 'ko' ? '폴더 추가' : 'Add Folder',
        wordCount: language === 'ko' ? '개 항목' : ' items',
        readOnly: language === 'ko' ? '읽기 전용' : 'Read-only',
        excludeSearch: language === 'ko' ? '검색 제외' : 'Exclude from search',
        sort: {
            lastEdited: language === 'ko' ? '최근 편집순' : 'Last Edited',
            lastCommented: language === 'ko' ? '최근 댓글순' : 'Last Commented',
            nameAsc: language === 'ko' ? '이름순 (오름차순)' : 'Name (A-Z)',
            nameDesc: language === 'ko' ? '이름순 (내림차순)' : 'Name (Z-A)',
            createdDesc: language === 'ko' ? '폴더 생성일 (최신순)' : 'Folder Created (Newest)',
            createdAsc: language === 'ko' ? '폴더 생성일 (오래된순)' : 'Folder Created (Oldest)',
        },
        empty: language === 'ko' ? '폴더가 없습니다.' : 'No folders yet.',
    };

    return (
        <Container>
            <Header>
                <Title>{t.title}</Title>
                <AddButton onClick={handleAddFolder}>
                    <FiPlus size={16} />
                    {t.addFolder}
                </AddButton>
            </Header>

            <SearchWrapper>
                <SearchIcon size={18} />
                <SearchInput
                    placeholder={t.searchPlaceholder}
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                />
            </SearchWrapper>

            <SortRow>
                <SortSelect
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                    <option value="last-edited">{t.sort.lastEdited}</option>
                    <option value="last-commented">{t.sort.lastCommented}</option>
                    <option value="name-asc">{t.sort.nameAsc}</option>
                    <option value="name-desc">{t.sort.nameDesc}</option>
                    <option value="created-desc">{t.sort.createdDesc}</option>
                    <option value="created-asc">{t.sort.createdAsc}</option>
                </SortSelect>
            </SortRow>

            {sortedFolders.length === 0 ? (
                <EmptyState>
                    <FiFolder size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>{t.empty}</p>
                </EmptyState>
            ) : (
                <FolderGrid>
                    {sortedFolders.map(folder => {
                        const stats = wordStats[folder.id!] || { count: 0 };
                        const isEditing = editingFolderId === folder.id;

                        return (
                            <FolderCard
                                key={folder.id}
                                $isActive={currentFolderId === folder.id}
                                $isReadOnly={folder.isReadOnly}
                                onClick={() => {
                                    if (!isEditing) {
                                        onSelectFolder(folder.id!);
                                    }
                                }}
                            >
                                <FolderHeader>
                                    <FolderIcon $isReadOnly={folder.isReadOnly}>
                                        {folder.isReadOnly ? <FiLock size={20} /> : <FiFolder size={20} />}
                                    </FolderIcon>

                                    {isEditing ? (
                                        <FolderNameInput
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameFolder(folder.id!);
                                                if (e.key === 'Escape') {
                                                    setEditingFolderId(null);
                                                    setEditingName('');
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <FolderName>{folder.name}</FolderName>
                                    )}

                                    {isEditing && (
                                        <>
                                            <ActionButton
                                                $variant="success"
                                                onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder.id!); }}
                                            >
                                                <FiCheck size={16} />
                                            </ActionButton>
                                            <ActionButton
                                                onClick={(e) => { e.stopPropagation(); setEditingFolderId(null); setEditingName(''); }}
                                            >
                                                <FiX size={16} />
                                            </ActionButton>
                                        </>
                                    )}
                                </FolderHeader>

                                <FolderMeta>
                                    <span>{stats.count}{t.wordCount}</span>
                                </FolderMeta>

                                <FolderBadges>
                                    {folder.isReadOnly && (
                                        <Badge $variant="warning">
                                            <FiLock size={12} /> {t.readOnly}
                                        </Badge>
                                    )}
                                    {folder.excludeFromGlobalSearch && (
                                        <Badge $variant="info">
                                            <FiEyeOff size={12} /> {t.excludeSearch}
                                        </Badge>
                                    )}
                                </FolderBadges>

                                <FolderActions onClick={(e) => e.stopPropagation()}>
                                    <ActionButton
                                        onClick={() => {
                                            if (folder.name === '기본 폴더' || folder.name === 'Default Folder') {
                                                alert(language === 'ko' ? '기본 폴더의 이름은 변경할 수 없습니다.' : 'Cannot rename the default folder.');
                                                return;
                                            }
                                            setEditingFolderId(folder.id!);
                                            setEditingName(folder.name);
                                        }}
                                        disabled={folder.name === '기본 폴더' || folder.name === 'Default Folder'}
                                        title={language === 'ko' ? '이름 변경' : 'Rename'}
                                    >
                                        <FiEdit2 size={16} />
                                    </ActionButton>

                                    <ActionButton
                                        onClick={() => {
                                            if (folder.name === '기본 폴더' || folder.name === 'Default Folder') {
                                                alert(language === 'ko' ? '기본 폴더는 읽기 전용으로 설정할 수 없습니다.' : 'Cannot set the default folder as read-only.');
                                                return;
                                            }
                                            handleToggleReadOnly(folder);
                                        }}
                                        disabled={folder.name === '기본 폴더' || folder.name === 'Default Folder'}
                                        title={folder.isReadOnly
                                            ? (language === 'ko' ? '읽기 전용 해제' : 'Disable read-only')
                                            : (language === 'ko' ? '읽기 전용 설정' : 'Set as read-only')}
                                    >
                                        {folder.isReadOnly ? <FiUnlock size={16} /> : <FiLock size={16} />}
                                    </ActionButton>

                                    <ActionButton
                                        onClick={() => handleToggleExcludeSearch(folder)}
                                        title={folder.excludeFromGlobalSearch
                                            ? (language === 'ko' ? '전체 검색 포함' : 'Include in global search')
                                            : (language === 'ko' ? '전체 검색 제외' : 'Exclude from global search')}
                                    >
                                        {folder.excludeFromGlobalSearch ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                                    </ActionButton>

                                    <ActionButton
                                        $variant="danger"
                                        onClick={() => handleDeleteFolder(folder)}
                                        disabled={stats.count > 0}
                                        title={stats.count > 0
                                            ? (language === 'ko' ? '비어있지 않은 폴더는 삭제 불가' : 'Cannot delete non-empty folder')
                                            : (language === 'ko' ? '폴더 삭제' : 'Delete folder')}
                                    >
                                        <FiTrash2 size={16} />
                                    </ActionButton>
                                </FolderActions>
                            </FolderCard>
                        );
                    })}
                </FolderGrid>
            )}
        </Container>
    );
};
