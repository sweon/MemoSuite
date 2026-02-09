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
  overflow-x: hidden;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 480px) {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 480px) {
    gap: 8px;
  }
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
  box-sizing: border-box;

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
  box-sizing: border-box;
  min-width: 0;
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
    padding: 6px 10px;
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

  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const FolderGrid = styled.div<{ $viewMode: ViewMode }>`
  display: grid;
  grid-template-columns: ${({ $viewMode }) =>
        $viewMode === 'grid'
            ? 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))'
            : 'minmax(0, 1fr)'};
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
`;

const FolderCard = styled.div<{ $viewMode: ViewMode; $isActive?: boolean; $isReadOnly?: boolean }>`
  display: flex;
  flex-direction: ${({ $viewMode }) => $viewMode === 'single-line' ? 'row' : 'column'};
  align-items: ${({ $viewMode }) => $viewMode === 'single-line' ? 'center' : 'stretch'};
  padding: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? '12px 16px' : theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.large};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  gap: ${({ $viewMode, theme }) => $viewMode === 'single-line' ? theme.spacing.md : 0};
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;

  @media (max-width: 480px) {
    padding: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? '8px 12px' : theme.spacing.md};
    gap: ${({ $viewMode, theme }) => $viewMode === 'single-line' ? theme.spacing.sm : 0};
  }

  ${({ $isReadOnly, theme }) => $isReadOnly && `
    background: ${theme.colors.background};
    border-style: dashed;
  `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.medium};
    transform: ${({ $viewMode }) => $viewMode === 'single-line' ? 'scale(1.01)' : 'translateY(-2px)'};
  }
`;

const FolderHeader = styled.div<{ $viewMode?: ViewMode }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? 0 : theme.spacing.sm};
  flex: ${({ $viewMode }) => $viewMode === 'single-line' ? 1 : 'none'};
  min-width: 0;

  @media (max-width: 480px) {
    gap: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? theme.spacing.xs : theme.spacing.sm};
  }
`;

const FolderIcon = styled.div<{ $viewMode?: ViewMode; $isReadOnly?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $viewMode }) => $viewMode === 'single-line' ? '32px' : '40px'};
  height: ${({ $viewMode }) => $viewMode === 'single-line' ? '32px' : '40px'};
  border-radius: ${({ theme }) => theme.radius.medium};
  background: ${({ theme, $isReadOnly }) => $isReadOnly ? WARNING_COLOR + '20' : theme.colors.primary + '20'};
  color: ${({ $isReadOnly, theme }) => $isReadOnly ? WARNING_COLOR : theme.colors.primary};
  flex-shrink: 0;

  svg {
    width: ${({ $viewMode }) => $viewMode === 'single-line' ? '16px' : '20px'};
    height: ${({ $viewMode }) => $viewMode === 'single-line' ? '16px' : '20px'};
  }

  @media (max-width: 480px) {
    display: ${({ $viewMode }) => $viewMode === 'single-line' ? 'none' : 'flex'};
    width: ${({ $viewMode }) => $viewMode === 'single-line' ? '24px' : '32px'};
    height: ${({ $viewMode }) => $viewMode === 'single-line' ? '24px' : '32px'};
    svg {
      width: ${({ $viewMode }) => $viewMode === 'single-line' ? '14px' : '16px'};
      height: ${({ $viewMode }) => $viewMode === 'single-line' ? '14px' : '16px'};
    }
  }
`;

const FolderName = styled.div`
  flex: 1;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  white-space: normal;
  word-break: break-all;
  min-width: 0;
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
  min-width: 0;
  
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
  margin-bottom: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? 0 : theme.spacing.sm};
  white-space: nowrap;
  flex-shrink: 0;

  @media (max-width: 600px) {
    display: ${({ $viewMode }) => $viewMode === 'single-line' ? 'none' : 'flex'};
  }
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
  margin-top: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? 0 : theme.spacing.sm};
  padding-top: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? 0 : theme.spacing.sm};
  border-top: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? 'none' : `1px solid ${theme.colors.border}`};
  flex-shrink: 0;

  @media (max-width: 480px) {
    display: ${({ $viewMode }) => $viewMode === 'single-line' ? 'none' : 'flex'};
    gap: ${({ theme, $viewMode }) => $viewMode === 'single-line' ? '2px' : theme.spacing.xs};
  }
`;

const FolderEditActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
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

  @media (max-width: 480px) {
    padding: 4px;
  }

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
type ViewMode = 'single-line' | 'grid' | 'preview';

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
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem('folder_viewMode');
        if (saved === "single-line" || saved === "one-line" || saved === "single-column") return 'single-line';
        if (saved === 'double-column') return 'grid';
        return (saved as ViewMode) || 'grid';
    });
    const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
    const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [newFolderId, setNewFolderId] = useState<number | null>(null);
    const [justUnpinnedIds, setJustUnpinnedIds] = useState<Map<number, Date>>(new Map());

    const folders = useLiveQuery(() => db.folders.toArray());
    const allMemos = useLiveQuery(() => db.memos.toArray());
    const allComments = useLiveQuery(() => db.comments.toArray());

    // Calculate memo counts and last edited times per folder
    const folderStats = useMemo(() => {
        const stats: Record<number, { count: number; lastEdited: number; lastCommented: number }> = {};

        if (!allMemos || !allComments) return stats;

        // Build comment map for last commented time
        const memoLastCommented: Record<number, number> = {};
        allComments.forEach(c => {
            const time = c.updatedAt?.getTime() || c.createdAt.getTime();
            if (!memoLastCommented[c.memoId] || time > memoLastCommented[c.memoId]) {
                memoLastCommented[c.memoId] = time;
            }
        });

        allMemos.forEach(memo => {
            const fid = memo.folderId || 0;
            if (!stats[fid]) {
                stats[fid] = { count: 0, lastEdited: 0, lastCommented: 0 };
            }
            stats[fid].count++;
            const editedTime = memo.updatedAt.getTime();
            if (editedTime > stats[fid].lastEdited) {
                stats[fid].lastEdited = editedTime;
            }
            const commentTime = memoLastCommented[memo.id!] || 0;
            if (commentTime > stats[fid].lastCommented) {
                stats[fid].lastCommented = commentTime;
            }
        });

        return stats;
    }, [allMemos, allComments]);

    // Find the latest memo for each folder for preview mode
    const folderPreviews = useMemo(() => {
        const previews: Record<number, any> = {};
        if (!allMemos) return previews;

        allMemos.forEach(memo => {
            const fid = memo.folderId || 0;
            if (!previews[fid] || memo.updatedAt.getTime() > previews[fid].updatedAt.getTime()) {
                previews[fid] = memo;
            }
        });
        return previews;
    }, [allMemos]);

    // Sort folders
    const sortedFolders = useMemo(() => {
        if (!folders) return [];

        const items = [...folders];

        items.sort((a, b) => {

            const aPinnedAt = a.pinnedAt || (a.id ? justUnpinnedIds.get(a.id) : undefined);
            const bPinnedAt = b.pinnedAt || (b.id ? justUnpinnedIds.get(b.id) : undefined);

            // Pinned logic: pinned items always come first, sorted by pinnedAt desc
            if (aPinnedAt && bPinnedAt) return bPinnedAt.getTime() - aPinnedAt.getTime();
            if (aPinnedAt) return -1;
            if (bPinnedAt) return 1;

            switch (sortBy) {
                case 'last-edited':
                    const aTimeE = folderStats[a.id!]?.lastEdited || 0;
                    const bTimeE = folderStats[b.id!]?.lastEdited || 0;
                    return bTimeE - aTimeE;
                case 'last-commented':
                    const aTimeC = folderStats[a.id!]?.lastCommented || 0;
                    const bTimeC = folderStats[b.id!]?.lastCommented || 0;
                    return bTimeC - aTimeC;
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'created-asc':
                    return a.createdAt.getTime() - b.createdAt.getTime();
                case 'created-desc':
                    return b.createdAt.getTime() - a.createdAt.getTime();
                default:
                    return 0;
            }
        });

        // Ensure current year folder is treated as default if needed, or just rely on name
        return items;
    }, [folders, sortBy, folderStats, justUnpinnedIds]);

    const handleTogglePin = async (folder: Folder) => {
        if (folder.pinnedAt) {
            // preserve position for 500ms
            const oldPinnedAt = folder.pinnedAt;
            setJustUnpinnedIds(prev => {
                const next = new Map(prev);
                next.set(folder.id!, oldPinnedAt);
                return next;
            });
            setTimeout(() => {
                setJustUnpinnedIds(prev => {
                    if (!prev.has(folder.id!)) return prev;
                    const next = new Map(prev);
                    next.delete(folder.id!);
                    return next;
                });
            }, 1000);
        } else {
            // If pinning, make sure it's removed from recently unpinned list
            setJustUnpinnedIds(prev => {
                if (!prev.has(folder.id!)) return prev;
                const next = new Map(prev);
                next.delete(folder.id!);
                return next;
            });
        }

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

        const searchableFolderIds = (folders || [])
            .filter(f => !f.excludeFromGlobalSearch)
            .map(f => f.id!);

        const matchingMemos = (allMemos || []).filter(memo => {
            if (!searchableFolderIds.includes(memo.folderId!)) return false;

            if (isTagSearch) {
                return memo.tags?.some(t => t.toLowerCase().includes(searchTerm));
            }

            return (
                memo.title.toLowerCase().includes(searchTerm) ||
                memo.content.toLowerCase().includes(searchTerm) ||
                memo.tags?.some(t => t.toLowerCase().includes(searchTerm))
            );
        });

        // For now, just log results. Later we can show them in a modal or navigate.
        console.log('Global search results:', matchingMemos);
        // TODO: Show search results UI
    };

    const handleAddFolder = async () => {
        const now = new Date();

        // Find next available year
        const currentYear = now.getFullYear();
        let nextYear = currentYear;
        const existingNames = new Set(folders?.map(f => f.name));

        while (existingNames.has(nextYear.toString())) {
            nextYear++;
        }

        const newName = nextYear.toString();

        const newId = await db.folders.add({
            name: newName,
            isReadOnly: false,
            excludeFromGlobalSearch: false,
            createdAt: now,
            updatedAt: now
        });

        setEditingFolderId(newId);
        setEditingName(newName);
        setNewFolderId(newId);
    };

    const handleCancelEdit = async () => {
        if (newFolderId !== null) {
            await db.folders.delete(newFolderId);
        }
        setEditingFolderId(null);
        setEditingName('');
        setNewFolderId(null);
    };

    const handleRenameFolder = async (folderId: number) => {
        const name = editingName.trim();
        if (!name) return;

        // Validate Year Format (YYYY)
        if (!/^\d{4}$/.test(name)) {
            alert(language === 'ko'
                ? '폴더 이름은 4자리 연도(예: 2026)여야 합니다.'
                : 'Folder name must be a 4-digit year (e.g. 2026).');
            return;
        }

        // Check for duplicates
        const exists = folders?.some(f => f.name === name && f.id !== folderId);
        if (exists) {
            alert(language === 'ko'
                ? '이미 존재하는 연도입니다.'
                : 'This year folder already exists.');
            return;
        }

        await db.folders.update(folderId, {
            name: name,
            updatedAt: new Date()
        });

        setEditingFolderId(null);
        setEditingName('');
        setNewFolderId(null);
    };

    const handleDeleteFolder = async (folder: Folder) => {
        const memoCount = folderStats[folder.id!]?.count || 0;

        if (memoCount > 0) {
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
        searchPlaceholder: language === 'ko' ? '전체 검색... (태그검색 tag:)' : 'Search all... (tags tag:)',
        addFolder: language === 'ko' ? '폴더 추가' : 'Add Folder',
        memoCount: language === 'ko' ? '개 항목' : ' items',
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
            single: language === 'ko' ? '리스트' : 'List',
            grid: language === 'ko' ? '그리드 보기' : 'Grid',
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
            cannotRenameCurrentYear: language === 'ko' ? '현재 연도 폴더의 이름은 변경할 수 없습니다.' : 'Cannot rename the current year folder.',
            cannotReadOnlyDefault: language === 'ko' ? '기본 폴더는 읽기 전용으로 설정할 수 없습니다.' : 'Cannot set the default folder as read-only.',
        }
    };

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <Title>{t.title}</Title>
                    <ViewModeRow>
                        <ViewModeButton
                            $active={viewMode === 'single-line'}
                            onClick={() => setViewMode('single-line')}
                            title={t.viewMode.single}
                        >
                            <FiList size={18} />
                        </ViewModeButton>
                        <ViewModeButton
                            $active={viewMode === 'grid'}
                            onClick={() => setViewMode('grid')}
                            title={t.viewMode.grid}
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
                </HeaderLeft>
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
                        const stats = folderStats[folder.id!] || { count: 0 };
                        const isEditing = editingFolderId === folder.id;
                        const isCurrentYear = folder.name === currentYear;
                        const isDefault = folder.name === '기본 폴더' || folder.name === 'Default Folder';
                        const previewMemo = folderPreviews[folder.id!];

                        return (
                            <Droppable key={folder.id} droppableId={`folder-${folder.id}`}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }} // Maintain layout structure
                                    >
                                        <FolderCard
                                            $isActive={currentFolderId === folder.id}
                                            $isReadOnly={folder.isReadOnly}
                                            $viewMode={viewMode}
                                            style={{
                                                borderColor: snapshot.isDraggingOver ? '#0072B2' : undefined,
                                                background: snapshot.isDraggingOver ? 'rgba(0, 114, 178, 0.05)' : undefined,
                                                transform: snapshot.isDraggingOver ? 'scale(1.01)' : undefined
                                            }}
                                            onClick={() => {
                                                if (!isEditing) {
                                                    onSelectFolder(folder.id!);
                                                }
                                            }}
                                        >
                                            <FolderHeader $viewMode={viewMode}>
                                                <FolderIcon $isReadOnly={folder.isReadOnly} $viewMode={viewMode}>
                                                    {folder.isReadOnly ? <FiLock /> : <FiFolder />}
                                                </FolderIcon>

                                                {isEditing ? (
                                                    <FolderNameInput
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleRenameFolder(folder.id!);
                                                            if (e.key === 'Escape') {
                                                                handleCancelEdit();
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <FolderName>{isDefault ? t.defaultFolder : folder.name}</FolderName>
                                                )}

                                                {isEditing && (
                                                    <FolderEditActions>
                                                        <ActionButton
                                                            $variant="success"
                                                            onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder.id!); }}
                                                        >
                                                            <FiCheck size={16} />
                                                        </ActionButton>
                                                        <ActionButton
                                                            onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                                                        >
                                                            <FiX size={16} />
                                                        </ActionButton>
                                                    </FolderEditActions>
                                                )}
                                            </FolderHeader>

                                            <FolderMeta $viewMode={viewMode}>
                                                <span>{stats.count}{t.memoCount}</span>
                                            </FolderMeta>

                                            {viewMode !== 'single-line' && (
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

                                            {viewMode === 'preview' && previewMemo && (
                                                <PreviewContainer>
                                                    <PreviewTitle>{previewMemo.title || '(Untitled)'}</PreviewTitle>
                                                    <div style={{ opacity: 0.8 }}>
                                                        <MarkdownView content={previewMemo.content} />
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
                                                        if (isCurrentYear) {
                                                            alert(t.tooltips.cannotRenameCurrentYear);
                                                            return;
                                                        }
                                                        setEditingFolderId(folder.id!);
                                                        setEditingName(folder.name);
                                                    }}
                                                    disabled={isDefault || isCurrentYear}
                                                    title={isCurrentYear ? t.tooltips.cannotRenameCurrentYear : t.tooltips.rename}
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
