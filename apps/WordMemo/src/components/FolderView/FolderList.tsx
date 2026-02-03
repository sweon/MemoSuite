import React, { useState, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Folder } from '../../db';
import { useLanguage } from '@memosuite/shared';
import { FiFolder, FiPlus, FiEdit2, FiTrash2, FiSearch, FiLock, FiUnlock, FiEyeOff, FiEye, FiCheck, FiX, FiList, FiGrid, FiLayout } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import { Droppable } from '@hello-pangea/dnd';
import { MarkdownView } from '../Editor/MarkdownView';

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

  @media (max-width: 480px) {
    padding: 8px 12px;
    span { display: none; }
  }
`;

const ViewModeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  background: ${({ theme }) => theme.colors.surface};
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ViewModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: none;
  background: ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) => $active ? 'white' : theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.background};
    color: ${({ $active }) => $active ? 'white' : undefined};
  }
`;

const FolderGrid = styled.div<{ $viewMode: ViewMode }>`
  display: grid;
  grid-template-columns: ${({ $viewMode }) =>
        $viewMode === 'double-column'
            ? 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))'
            : '1fr'};
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
`;

const FolderCard = styled.div<{ $viewMode: ViewMode; $isActive?: boolean; $isReadOnly?: boolean }>`
  display: flex;
  flex-direction: ${({ $viewMode }) => $viewMode === 'single-column' ? 'row' : 'column'};
  align-items: ${({ $viewMode }) => $viewMode === 'single-column' ? 'center' : 'stretch'};
  padding: ${({ theme, $viewMode }) => $viewMode === 'single-column' ? '12px 16px' : theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.large};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  gap: ${({ $viewMode, theme }) => $viewMode === 'single-column' ? theme.spacing.md : 0};
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;

  ${({ $isReadOnly, theme }) => $isReadOnly && `
    background: ${theme.colors.background};
    border-style: dashed;
  `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.medium};
    transform: ${({ $viewMode }) => $viewMode === 'single-column' ? 'translateX(4px)' : 'translateY(-2px)'};
  }
`;

const FolderHeader = styled.div<{ $viewMode?: ViewMode }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme, $viewMode }) => $viewMode === 'single-column' ? 0 : theme.spacing.sm};
  flex: ${({ $viewMode }) => $viewMode === 'single-column' ? 1 : 'none'};
  min-width: 0;
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
  white-space: normal;
  word-break: break-all;
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

const FolderMeta = styled.div<{ $viewMode?: ViewMode }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme, $viewMode }) => $viewMode === 'single-column' ? 0 : theme.spacing.sm};
  white-space: nowrap;
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

const FolderActions = styled.div<{ $viewMode?: ViewMode }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme, $viewMode }) => $viewMode === 'single-column' ? 0 : theme.spacing.sm};
  padding-top: ${({ theme, $viewMode }) => $viewMode === 'single-column' ? 0 : theme.spacing.sm};
  border-top: ${({ theme, $viewMode }) => $viewMode === 'single-column' ? 'none' : `1px solid ${theme.colors.border}`};
`;

const PreviewContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  padding: 12px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.85rem;
  max-height: 120px;
  overflow: hidden;
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.border};

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(transparent, ${({ theme }) => theme.colors.background});
  }
`;

const PreviewTitle = styled.div`
  font-weight: 700;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.text};
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
type ViewMode = 'single-column' | 'double-column' | 'preview';

interface FolderListProps {
    currentFolderId: number | null;
    onSelectFolder: (folderId: number) => void;
    onClose?: () => void;
}

export const FolderList: React.FC<FolderListProps> = ({
    currentFolderId,
    onSelectFolder
}) => {
    const theme = useTheme();
    const { language } = useLanguage();
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>(() =>
        (localStorage.getItem('folder_sortBy') as SortOption) || 'last-edited'
    );
    const [viewMode, setViewMode] = useState<ViewMode>(() =>
        (localStorage.getItem('folder_viewMode') as ViewMode) || 'double-column'
    );
    const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    const folders = useLiveQuery(() => db.folders.toArray());
    const allWords = useLiveQuery(() => db.words.toArray());
    const allComments = useLiveQuery(() => db.comments.toArray());
    const sources = useLiveQuery(() => db.sources.toArray());

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

    // Find the latest word for each folder for preview mode
    const folderPreviews = useMemo(() => {
        const previews: Record<number, any> = {};
        if (!allWords) return previews;

        allWords.forEach(word => {
            const fid = word.folderId || 0;
            if (!previews[fid] || word.updatedAt.getTime() > previews[fid].updatedAt.getTime()) {
                previews[fid] = word;
            }
        });
        return previews;
    }, [allWords]);

    const sortedFolders = useMemo(() => {
        if (!folders) return [];

        const items = [...folders];

        items.sort((a, b) => {
            const isDefaultA = a.name === '기본 폴더' || a.name === 'Default Folder';
            const isDefaultB = b.name === '기본 폴더' || b.name === 'Default Folder';
            if (isDefaultA) return -1;
            if (isDefaultB) return 1;

            // Pinned logic: pinned items always come first, sorted by pinnedAt desc
            if (a.pinnedAt && b.pinnedAt) return b.pinnedAt.getTime() - a.pinnedAt.getTime();
            if (a.pinnedAt) return -1;
            if (b.pinnedAt) return 1;

            switch (sortBy) {
                case 'last-edited': {
                    const aTime = wordStats[a.id!]?.lastEdited || 0;
                    const bTime = wordStats[b.id!]?.lastEdited || 0;
                    return bTime - aTime;
                }
                case 'last-commented': {
                    const aTime = wordStats[a.id!]?.lastCommented || 0;
                    const bTime = wordStats[b.id!]?.lastCommented || 0;
                    return bTime - aTime;
                }
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'created-asc': return a.createdAt.getTime() - b.createdAt.getTime();
                case 'created-desc': return b.createdAt.getTime() - a.createdAt.getTime();
                default: return 0;
            }
        });

        return items;
    }, [folders, sortBy, wordStats]);

    const handleTogglePin = async (folder: Folder) => {
        await db.folders.update(folder.id!, {
            pinnedAt: folder.pinnedAt ? undefined : new Date(),
            updatedAt: new Date()
        });
    };

    // Global search logic
    const handleGlobalSearch = async () => {
        if (!globalSearchQuery.trim()) return;

        const q = globalSearchQuery.toLowerCase();
        const isTagSearch = q.startsWith('tag:');
        const searchTerm = isTagSearch ? q.replace('tag:', '').trim() : q;

        const sourceMap = new Map(sources?.map(s => [s.id, s.name.toLowerCase()]) || []);

        const searchableFolderIds = (folders || [])
            .filter(f => !f.excludeFromGlobalSearch)
            .map(f => f.id!);

        const matchingMemos = (allWords || []).filter(log => {
            if (!searchableFolderIds.includes(log.folderId!)) return false;

            const sourceName = log.sourceId ? sourceMap.get(log.sourceId) || '' : '';

            if (isTagSearch) {
                return (
                    log.tags?.some(t => t.toLowerCase().includes(searchTerm)) ||
                    sourceName.includes(searchTerm)
                );
            }

            return (
                log.title.toLowerCase().includes(searchTerm) ||
                log.content.toLowerCase().includes(searchTerm) ||
                log.tags?.some(t => t.toLowerCase().includes(searchTerm)) ||
                sourceName.includes(searchTerm)
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

    React.useEffect(() => {
        localStorage.setItem('folder_viewMode', viewMode);
    }, [viewMode]);

    const t = {
        title: language === 'ko' ? '폴더' : 'Folders',
        searchPlaceholder: language === 'ko' ? '전체 검색... (태그/출처는 tag:)' : 'Search all... (tags/source tag:)',
        addFolder: language === 'ko' ? '폴더 추가' : 'Add Folder',
        wordCount: language === 'ko' ? '개 항목' : ' items',
        readOnly: language === 'ko' ? '읽기 전용' : 'Read-only',
        excludeSearch: language === 'ko' ? '검색 제외' : 'Exclude from search',
        defaultFolder: language === 'ko' ? '기본 폴더' : 'Default Folder',
        sort: {
            lastEdited: language === 'ko' ? '최근 편집순' : 'Last Edited',
            lastCommented: language === 'ko' ? '최근 댓글순' : 'Last Commented',
            nameAsc: language === 'ko' ? '이름순 (오름차순)' : 'Name (A-Z)',
            nameDesc: language === 'ko' ? '이름순 (내림차순)' : 'Name (Z-A)',
            createdDesc: language === 'ko' ? '폴더 생성일 (최신순)' : 'Folder Created (Newest)',
            createdAsc: language === 'ko' ? '폴더 생성일 (오래된순)' : 'Folder Created (Oldest)',
        },
        empty: language === 'ko' ? '폴더가 없습니다.' : 'No folders yet.',
        viewMode: {
            single: language === 'ko' ? '한 줄 보기' : 'Single Column',
            double: language === 'ko' ? '두 줄 보기' : 'Double Column',
            preview: language === 'ko' ? '미리보기' : 'Preview',
        },
        tooltips: {
            pin: language === 'ko' ? '상단 고정' : 'Pin to top',
            unpin: language === 'ko' ? '고정 해제' : 'Unpin',
            rename: language === 'ko' ? '이름 변경' : 'Rename',
            readOnlyOn: language === 'ko' ? '읽기 전용 설정' : 'Set as read-only',
            readOnlyOff: language === 'ko' ? '읽기 전용 해제' : 'Disable read-only',
            searchOn: language === 'ko' ? '전체 검색 포함' : 'Include in global search',
            searchOff: language === 'ko' ? '전체 검색 제외' : 'Exclude from search',
            delete: language === 'ko' ? '폴더 삭제' : 'Delete folder',
            cannotDelete: language === 'ko' ? '비어있지 않은 폴더는 삭제 불가' : 'Cannot delete non-empty folder',
            cannotPinDefault: language === 'ko' ? '기본 폴더는 고정할 수 없습니다' : 'Cannot pin the default folder',
            cannotRenameDefault: language === 'ko' ? '기본 폴더의 이름은 변경할 수 없습니다.' : 'Cannot rename the default folder.',
            cannotReadOnlyDefault: language === 'ko' ? '기본 폴더는 읽기 전용으로 설정할 수 없습니다.' : 'Cannot set the default folder as read-only.',
        }
    };

    return (
        <Container>
            <Header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Title>{t.title}</Title>
                    <ViewModeRow>
                        <ViewModeButton
                            $active={viewMode === 'single-column'}
                            onClick={() => setViewMode('single-column')}
                            title={t.viewMode.single}
                        >
                            <FiList size={18} />
                        </ViewModeButton>
                        <ViewModeButton
                            $active={viewMode === 'double-column'}
                            onClick={() => setViewMode('double-column')}
                            title={t.viewMode.double}
                        >
                            <FiGrid size={18} />
                        </ViewModeButton>
                        <ViewModeButton
                            $active={viewMode === 'preview'}
                            onClick={() => setViewMode('preview')}
                            title={t.viewMode.preview}
                        >
                            <FiLayout size={18} />
                        </ViewModeButton>
                    </ViewModeRow>
                </div>
                <AddButton onClick={handleAddFolder}>
                    <FiPlus size={16} />
                    <span>{t.addFolder}</span>
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
                <FolderGrid $viewMode={viewMode}>
                    {sortedFolders.map(folder => {
                        const stats = wordStats[folder.id!] || { count: 0 };
                        const isEditing = editingFolderId === folder.id;
                        const isDefault = folder.name === '기본 폴더' || folder.name === 'Default Folder';
                        const previewWord = folderPreviews[folder.id!];

                        return (
                            <Droppable droppableId={`folder-${folder.id}`} key={folder.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{ display: 'flex', flexDirection: 'column' }}
                                    >
                                        <FolderCard
                                            $isActive={currentFolderId === folder.id}
                                            $isReadOnly={folder.isReadOnly}
                                            $viewMode={viewMode}
                                            style={{
                                                borderColor: snapshot.isDraggingOver ? '#0070f3' : undefined,
                                                backgroundColor: snapshot.isDraggingOver ? 'rgba(0, 112, 243, 0.05)' : undefined,
                                                transform: snapshot.isDraggingOver ? 'scale(1.01)' : undefined
                                            }}
                                            onClick={() => {
                                                if (!isEditing) {
                                                    onSelectFolder(folder.id!);
                                                }
                                            }}
                                        >
                                            <FolderHeader $viewMode={viewMode}>
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
                                                    <FolderName>{isDefault ? t.defaultFolder : folder.name}</FolderName>
                                                )}

                                                {isEditing && (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
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
                                                    </div>
                                                )}
                                            </FolderHeader>

                                            <FolderMeta $viewMode={viewMode}>
                                                <span>{stats.count}{t.wordCount}</span>
                                            </FolderMeta>

                                            {viewMode !== 'single-column' && (
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
                                            )}

                                            {viewMode === 'preview' && previewWord && (
                                                <PreviewContainer>
                                                    <PreviewTitle>{previewWord.title || '(Untitled)'}</PreviewTitle>
                                                    <div style={{ opacity: 0.8 }}>
                                                        <MarkdownView content={previewWord.content} />
                                                    </div>
                                                </PreviewContainer>
                                            )}

                                            <FolderActions onClick={(e) => e.stopPropagation()} $viewMode={viewMode}>
                                                <ActionButton
                                                    onClick={() => handleTogglePin(folder)}
                                                    disabled={isDefault}
                                                    title={isDefault ? t.tooltips.cannotPinDefault : (folder.pinnedAt ? t.tooltips.unpin : t.tooltips.pin)}
                                                    style={{
                                                        color: folder.pinnedAt ? theme.colors.primary : undefined,
                                                        opacity: isDefault ? 0.3 : 1
                                                    }}
                                                >
                                                    {folder.pinnedAt ? <BsPinAngleFill size={16} /> : <BsPinAngle size={16} />}
                                                </ActionButton>

                                                <ActionButton
                                                    onClick={() => {
                                                        if (isDefault) {
                                                            alert(t.tooltips.cannotRenameDefault);
                                                            return;
                                                        }
                                                        setEditingFolderId(folder.id!);
                                                        setEditingName(folder.name);
                                                    }}
                                                    disabled={isDefault}
                                                    title={t.tooltips.rename}
                                                >
                                                    <FiEdit2 size={16} />
                                                </ActionButton>

                                                <ActionButton
                                                    onClick={() => {
                                                        if (isDefault) {
                                                            alert(t.tooltips.cannotReadOnlyDefault);
                                                            return;
                                                        }
                                                        handleToggleReadOnly(folder);
                                                    }}
                                                    disabled={isDefault}
                                                    title={folder.isReadOnly ? t.tooltips.readOnlyOff : t.tooltips.readOnlyOn}
                                                >
                                                    {folder.isReadOnly ? <FiUnlock size={16} /> : <FiLock size={16} />}
                                                </ActionButton>

                                                <ActionButton
                                                    onClick={() => handleToggleExcludeSearch(folder)}
                                                    title={folder.excludeFromGlobalSearch ? t.tooltips.searchOn : t.tooltips.searchOff}
                                                >
                                                    {folder.excludeFromGlobalSearch ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                                                </ActionButton>

                                                <ActionButton
                                                    $variant="danger"
                                                    onClick={() => handleDeleteFolder(folder)}
                                                    disabled={stats.count > 0}
                                                    title={stats.count > 0 ? t.tooltips.cannotDelete : t.tooltips.delete}
                                                >
                                                    <FiTrash2 size={16} />
                                                </ActionButton>
                                            </FolderActions>
                                        </FolderCard>
                                        <div style={{ display: 'none' }}>{provided.placeholder}</div>
                                    </div>
                                )}
                            </Droppable>
                        );
                    })}
                </FolderGrid>
            )}
        </Container>
    );
};
