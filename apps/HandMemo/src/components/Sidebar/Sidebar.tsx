import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SyncModal, ThreadableList, useColorTheme, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Memo } from '../../db';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiRefreshCw, FiMinus, FiPenTool, FiFolder } from 'react-icons/fi';
import { BsKeyboard } from 'react-icons/bs';
import { RiTable2 } from 'react-icons/ri';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Tooltip } from '../UI/Tooltip';

import { Toast } from '../UI/Toast';

import { useSearch } from '../../contexts/SearchContext';
import { SidebarMemoItem } from './SidebarMemoItem';
import { handMemoSyncAdapter } from '../../utils/backupAdapter';
import type { DropResult } from '@hello-pangea/dnd';

import { useFolder } from '../../contexts/FolderContext';

import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ConfirmModal } from '../UI/ConfirmModal';
import pkg from '../../../package.json';

const ScrollableArea = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  
  /* Hide scrollbar for cleaner look if desired, or keep default */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 3px;
  }
`;

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.colors.surface};
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;

const Header = styled.div`
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.surface};
`;

const SearchInputWrapper = styled.div`
  position: relative;
  margin-bottom: 0;
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.7;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 36px;
  border-radius: ${({ theme }) => theme.radius.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.75rem;
  transition: ${({ theme }) => theme.effects.transition};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.full};
  transition: ${({ theme }) => theme.effects.transition};
  
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background-color: ${({ theme }) => theme.colors.border};
  }
`;

const Button = styled.button<{ $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center; // Center align looks better with emphasized icon
  // width: 26px;
  height: 26px;
  padding: 0 8px;
  font-size: 12px; // Adjusted to 12px
  font-weight: 600;
  gap: 4px; // Reduce gap
  border-radius: ${({ theme }) => theme.radius.small};
  border: none;
  cursor: pointer;
  background: ${({ theme, $color }) => $color || theme.colors.primary};
  color: white;
  white-space: nowrap;
  transition: ${({ theme }) => theme.effects.transition};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  svg {
    width: 15px; // Larger icon
    height: 15px;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.small};
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(0);
  }

  flex: auto;
`;

const TopActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.medium};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${({ theme }) => theme.effects.transition};
  
  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
  }
`;

const FolderChip = styled.div<{ $isReadOnly?: boolean }>`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme, $isReadOnly }) => $isReadOnly ? '#f59e0b' : theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 4px;
  padding: 6px 12px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme, $isReadOnly }) => $isReadOnly ? '#fff7ed' : `${theme.colors.primary}11`};
    color: ${({ theme, $isReadOnly }) => $isReadOnly ? '#d97706' : theme.colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  span {
    line-height: 1.2;
    padding: 2px 0;
  }
`;

const BrandArea = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.sm}`};
  gap: 8px;
`;

const BrandHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const AppTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #9C640C;
`;

const AppVersion = styled.span`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
  letter-spacing: 0.05em;
  background: ${({ theme }) => theme.colors.background};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export interface SidebarRef {
  handleDragEnd: (result: DropResult) => Promise<void>;
}

interface SidebarProps {
  onCloseMobile: (skipHistory?: boolean) => void;
  isEditing?: boolean;
  movingMemoId?: number | null;
  setMovingMemoId?: (id: number | null) => void;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({
  onCloseMobile,
  isEditing = false,
  movingMemoId,
  setMovingMemoId
}, ref) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'last-edited' | 'last-commented'>(() => {
    return (localStorage.getItem('sidebar_sortBy') as any) || 'last-edited';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_sortBy', sortBy);
  }, [sortBy]);

  /* Expose handleDragEnd to parent (MainLayout) */
  useImperativeHandle(ref, () => ({
    handleDragEnd: async (result: DropResult) => {
      // Direct call to onDragEnd defined below
      await onDragEnd(result);
    }
  }));

  const { mode, toggleTheme, theme, fontSize, increaseFontSize, decreaseFontSize } = useColorTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();


  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => { } });
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  const [justUnpinnedIds, setJustUnpinnedIds] = useState<Map<number, Date>>(new Map());

  const toggleThread = (id: string) => {
    setCollapsedThreads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const needRefreshRef = useRef(false);

  const handleSafeNavigation = (action: () => void) => {
    // With memo-first approach, we rarely need confirmation to switch unless we are in complex state.
    // Logic for unsaved changes is mostly in MemoDetail/Layout guard.
    // So we can simplify this or keep generic check.
    action();
  };

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: false,
    onRegistered() {
      console.log('SW Registered');
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    needRefreshRef.current = needRefresh;
  }, [needRefresh]);

  useEffect(() => {
    // Check for updates automatically on app startup if enabled
    const autoUpdate = localStorage.getItem('auto_update_enabled') === 'true';
    if (autoUpdate) {
      handleUpdateCheck(true);
    }
  }, []);

  const handleUpdateCheck = async (isSilent = false) => {
    const installUpdate = () => {
      setToastMessage(t.sidebar.install_update);
      setTimeout(() => {
        updateServiceWorker(true);
        setTimeout(() => window.location.reload(), 3000);
      }, 500);
    };

    if (needRefresh) {
      installUpdate();
      return;
    }

    if (isCheckingUpdate) return;

    if (!isSilent) {
      setIsCheckingUpdate(true);
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();

          // Small delay to let the hook catch up
          await new Promise(resolve => setTimeout(resolve, 1500));

          if (registration.waiting || needRefreshRef.current) {
            installUpdate();
          } else if (!isSilent) {
            setToastMessage(t.sidebar.up_to_date);
          }
        } else if (!isSilent) {
          setToastMessage(t.sidebar.check_failed);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
        if (!isSilent) setToastMessage(t.sidebar.check_failed);
      }
    } else if (!isSilent) {
      setToastMessage(t.sidebar.pwa_not_supported);
    }

    if (!isSilent) setIsCheckingUpdate(false);
  };


  const allMemos = useLiveQuery(() => db.memos.toArray());
  const allComments = useLiveQuery(() => db.comments.toArray());

  const { currentFolderId, currentFolder, setShowFolderList } = useFolder();

  const lastCommentMap = React.useMemo(() => {
    const map: Record<number, number> = {};
    if (!allComments) return map;
    allComments.forEach(c => {
      const time = c.updatedAt?.getTime() || c.createdAt.getTime();
      if (!map[c.memoId] || time > map[c.memoId]) {
        map[c.memoId] = time;
      }
    });
    return map;
  }, [allComments]);

  const sortedMemos = React.useMemo(() => {
    if (!allMemos) return [];

    // Filter by current folder
    let memos = currentFolderId
      ? allMemos.filter(m => m.folderId === currentFolderId)
      : [...allMemos];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (q.startsWith('tag:')) {
        const tagToSearch = q.slice(4).trim();
        if (tagToSearch) {
          memos = memos.filter(m =>
            m.tags && m.tags.some(t => t.toLowerCase().includes(tagToSearch))
          );
        }
      } else {
        memos = memos.filter(m =>
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          (m.tags && m.tags.some(t => t.toLowerCase().includes(q)))
        );
      }
    }

    return memos.sort((a, b) => {
      const aPinnedAt = a.pinnedAt || (a.id ? justUnpinnedIds.get(a.id) : undefined);
      const bPinnedAt = b.pinnedAt || (b.id ? justUnpinnedIds.get(b.id) : undefined);

      // Pinned logic: pinned items always come first, sorted by pinnedAt desc
      if (aPinnedAt && bPinnedAt) return bPinnedAt.getTime() - aPinnedAt.getTime();
      if (aPinnedAt) return -1;
      if (bPinnedAt) return 1;

      if (sortBy === 'date-desc') return b.createdAt.getTime() - a.createdAt.getTime();
      if (sortBy === 'date-asc') return a.createdAt.getTime() - b.createdAt.getTime();
      if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'last-edited') return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (sortBy === 'last-commented') {
        const aLast = lastCommentMap[a.id!] || 0;
        const bLast = lastCommentMap[b.id!] || 0;
        if (aLast !== bLast) return bLast - aLast;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [allMemos, searchQuery, sortBy, currentFolderId, lastCommentMap, justUnpinnedIds]);

  const handleTogglePin = async (memoId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const memo = await db.memos.get(memoId);
    if (memo) {
      if (memo.pinnedAt) {
        // preserve position for 500ms
        const oldPinnedAt = memo.pinnedAt;
        setJustUnpinnedIds(prev => {
          const next = new Map(prev);
          next.set(memoId, oldPinnedAt);
          return next;
        });
        setTimeout(() => {
          setJustUnpinnedIds(prev => {
            if (!prev.has(memoId)) return prev;
            const next = new Map(prev);
            next.delete(memoId);
            return next;
          });
        }, 1000);
      } else {
        // If pinning, make sure it's removed from recently unpinned list
        setJustUnpinnedIds(prev => {
          if (!prev.has(memoId)) return prev;
          const next = new Map(prev);
          next.delete(memoId);
          return next;
        });
      }

      await db.memos.update(memoId, {
        pinnedAt: memo.pinnedAt ? undefined : new Date()
      });
    }
  };

  const groupedItems = React.useMemo(() => {
    if (!sortedMemos || !allMemos) return [];

    const items: Array<{
      type: 'memo';
      memo: Memo;
      isThreadHead?: boolean;
      isThreadChild?: boolean;
      threadId?: string;
      childCount?: number;
    }> = [];
    const processedMemos = new Set<number>();

    sortedMemos.forEach(memo => {
      if (processedMemos.has(memo.id!)) return;

      if (memo.threadId) {
        // Find all memos in this thread
        const threadMemos = allMemos.filter(m => m.threadId === memo.threadId)
          .sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0));

        if (threadMemos.length > 1) {
          const isCollapsed = collapsedThreads.has(memo.threadId);
          // Header
          items.push({
            type: 'memo',
            memo: threadMemos[0],
            isThreadHead: true,
            threadId: memo.threadId,
            childCount: threadMemos.length - 1
          });
          processedMemos.add(threadMemos[0].id!);

          if (!isCollapsed) {
            // Children
            for (let i = 1; i < threadMemos.length; i++) {
              items.push({
                type: 'memo',
                memo: threadMemos[i],
                isThreadChild: true,
                threadId: memo.threadId
              });
              processedMemos.add(threadMemos[i].id!);
            }
          } else {
            // Skip children in processed set so we don't render them separately
            threadMemos.slice(1).forEach(tm => processedMemos.add(tm.id!));
          }
        } else {
          items.push({ type: 'memo', memo });
          processedMemos.add(memo.id!);
        }
      } else {
        items.push({ type: 'memo', memo });
        processedMemos.add(memo.id!);
      }
    });

    return items;
  }, [sortedMemos, allMemos, collapsedThreads]);

  const activeId = location.pathname.split('/').pop();
  useEffect(() => {
    if (!activeId || activeId === 'new' || activeId === 'settings') return;

    const activeMemoId = parseInt(activeId);
    if (!isNaN(activeMemoId)) {
      const isVisible = groupedItems.some(it => it.memo.id === activeMemoId);
      if (!isVisible && searchQuery) {
        const exists = allMemos?.some(m => m.id === activeMemoId);
        if (exists) {
          setSearchQuery('');
          return;
        }
      }
    }

    const timer = setTimeout(() => {
      const element = document.querySelector(`[data-memo-id="${activeId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [location.pathname, groupedItems.length]);

  const onDragEnd = async (result: DropResult) => {
    const { combine, draggableId, destination } = result;

    // Handle Combining (Joining Threads)
    if (combine) {
      const sourceId = parseInt(draggableId);
      const targetId = parseInt(combine.draggableId);

      if (isNaN(sourceId) || isNaN(targetId)) return;
      if (sourceId === targetId) return;

      const sourceMemo = await db.memos.get(sourceId);
      const targetMemo = await db.memos.get(targetId);

      if (!sourceMemo || !targetMemo) return;

      const newThreadId = targetMemo.threadId || uuidv4();

      if (!targetMemo.threadId) {
        await db.memos.update(targetId, {
          threadId: newThreadId,
          threadOrder: 0
        });
      }

      if (sourceMemo.threadId && sourceMemo.threadId !== newThreadId) {
        const sourceThreadMemos = await db.memos.where('threadId').equals(sourceMemo.threadId).toArray();
        const targetThreadMemos = await db.memos.where('threadId').equals(newThreadId).toArray();
        let maxOrder = Math.max(...targetThreadMemos.map(m => m.threadOrder || 0), -1);

        for (const sm of sourceThreadMemos) {
          maxOrder++;
          await db.memos.update(sm.id!, {
            threadId: newThreadId,
            threadOrder: maxOrder
          });
        }
      } else {
        const targetThreadMemos = await db.memos.where('threadId').equals(newThreadId).toArray();
        const maxOrder = Math.max(...targetThreadMemos.map(m => m.threadOrder || 0), -1);
        await db.memos.update(sourceId, {
          threadId: newThreadId,
          threadOrder: maxOrder + 1
        });
      }
      return;
    }

    // Handle Reordering / Extraction / Move to Folder
    if (!destination) return;

    const sourceMemoId = parseInt(draggableId);
    if (isNaN(sourceMemoId)) return;

    // Check if dropping onto a folder
    if (destination.droppableId.startsWith('folder-')) {
      const folderId = parseInt(destination.droppableId.replace('folder-', ''));
      if (isNaN(folderId)) return;

      const sourceMemo = await db.memos.get(sourceMemoId);
      if (!sourceMemo) return;

      // Check if it's a thread head
      const isHeader = groupedItems.find(it => it.memo.id === sourceMemoId)?.isThreadHead;

      if (isHeader && sourceMemo.threadId) {
        // Move entire thread
        const threadMemos = await db.memos.where('threadId').equals(sourceMemo.threadId).toArray();
        for (const tm of threadMemos) {
          await db.memos.update(tm.id!, { folderId, updatedAt: new Date() });
        }
        setToastMessage(language === 'ko' ? '스레드 전체를 이동했습니다.' : 'Moved entire thread.');
      } else {
        // Just move this memo
        await db.memos.update(sourceMemoId, {
          folderId,
          threadId: undefined,
          threadOrder: undefined,
          updatedAt: new Date()
        });
        setToastMessage(language === 'ko' ? '메모를 이동했습니다.' : 'Moved memo.');
      }
      return;
    }

    const sourceMemo = await db.memos.get(sourceMemoId);
    if (!sourceMemo) return;

    const sourceIndex = result.source.index;
    const destIndex = destination.index;
    if (sourceIndex === destIndex) return;

    const items = groupedItems;
    const targetItem = items[destIndex];
    if (!targetItem) return;

    // Generic "Sort Reordering" using updatedAt calculation
    let newTime: number;
    if (destIndex === 0) {
      newTime = items[0].memo.updatedAt.getTime() + 60000; // 1 min later
    } else if (destIndex === items.length - 1) {
      newTime = items[items.length - 1].memo.updatedAt.getTime() - 60000;
    } else {
      const beforeIndex = destIndex < sourceIndex ? destIndex - 1 : destIndex;
      const afterIndex = destIndex < sourceIndex ? destIndex : destIndex + 1;

      const t1 = items[beforeIndex].memo.updatedAt.getTime();
      const t2 = items[afterIndex].memo.updatedAt.getTime();
      newTime = (t1 + t2) / 2;
    }

    // Pattern: Drag child and drop ABOVE its own header or BELOW its own thread block -> Extract
    if (sourceMemo.threadId) {
      const headerItem = items.find(it => it.isThreadHead && it.threadId === sourceMemo.threadId);
      if (headerItem) {
        const headerIdx = items.indexOf(headerItem);
        // If moved above the header, extract
        if (destIndex <= headerIdx) {
          await db.memos.update(sourceMemoId, {
            threadId: undefined,
            threadOrder: undefined,
            updatedAt: new Date(newTime)
          });
          return;
        }

        // If moved far below the thread (past all siblings), extract
        const threadMemos = items.filter(it => it.threadId === sourceMemo.threadId);
        const lastThreadIdx = items.indexOf(threadMemos[threadMemos.length - 1]);
        if (destIndex > lastThreadIdx) {
          await db.memos.update(sourceMemoId, {
            threadId: undefined,
            threadOrder: undefined,
            updatedAt: new Date(newTime)
          });
          return;
        }
      }
    }

    await db.memos.update(sourceMemoId, { updatedAt: new Date(newTime) });
  };

  const handleMove = async (targetMemoId: number) => {
    if (!movingMemoId || !setMovingMemoId) return;
    if (movingMemoId === targetMemoId) return;

    try {
      // Get the target memo to see its threadId
      const targetMemo = await db.memos.get(targetMemoId);
      if (!targetMemo) return;

      // If target is already a child, we should use its parent's threadId 
      // OR just make it a child of the target.
      // Usually "threadId" is assigned to all memos in a group, and they are ordered by threadOrder.
      // Wait, in HandMemo's ThreadableList, threadId is common for all siblings.

      const threadId = targetMemo.threadId || uuidv4();

      // If target was not in a thread, we need to update it too
      if (!targetMemo.threadId) {
        await db.memos.update(targetMemoId, { threadId, threadOrder: 0 });
      }

      // Find max order in this thread
      const siblings = await db.memos.where('threadId').equals(threadId).toArray();
      const maxOrder = siblings.reduce((max, m) => Math.max(max, m.threadOrder || 0), 0);

      await db.memos.update(movingMemoId, {
        threadId,
        threadOrder: maxOrder + 1,
        updatedAt: new Date()
      });

      setMovingMemoId(null);
      setToastMessage(t.sidebar.move_success || "Memo moved successfully");
    } catch (err) {
      console.error('Failed to move memo', err);
      setToastMessage(t.sidebar.move_failed || "Failed to move memo");
    }
  };

  return (
    <SidebarContainer>
      {movingMemoId && (
        <div style={{
          padding: '12px',
          background: theme.colors.primary,
          color: 'white',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 10
        }}>
          <span>{t.sidebar.select_target || "Select target memo"}</span>
          <button
            onClick={() => setMovingMemoId?.(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {t.common?.cancel || "Cancel"}
          </button>
        </div>
      )}
      <ScrollableArea id="sidebar-scrollable-area">
        <BrandArea>
          <BrandHeader>
            <AppTitle>HandMemo</AppTitle>
            <AppVersion>v{pkg.version}</AppVersion>
          </BrandHeader>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingBottom: '4px' }}>
            <Tooltip content={t.sidebar.decrease_font}>
              <IconButton onClick={decreaseFontSize} disabled={fontSize <= 12}>
                <FiMinus size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip content={t.sidebar.increase_font}>
              <IconButton onClick={increaseFontSize} disabled={fontSize >= 24}>
                <FiPlus size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip content={t.sidebar.sync_data}>
              <IconButton onClick={() => {
                setIsSyncModalOpen(true);
                onCloseMobile(true);
              }}>
                <FiRefreshCw size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip content={mode === 'light' ? t.sidebar.switch_dark : t.sidebar.switch_light}>
              <IconButton onClick={toggleTheme}>
                {mode === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
              </IconButton>
            </Tooltip>

            <Tooltip content={t.sidebar.settings}>
              <IconButton onClick={() => {
                handleSafeNavigation(() => {
                  navigate('/settings', { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                });
              }}>
                <FiSettings size={18} />
              </IconButton>
            </Tooltip>

          </div>

          {currentFolder && (
            <FolderChip
              $isReadOnly={currentFolder.isReadOnly}
              onClick={() => {
                setShowFolderList(true);
                navigate('/folders', { replace: true, state: { isGuard: true } });
                onCloseMobile(true);
              }}
              title={language === 'ko' ? '폴더 변경' : 'Change Folder'}
            >
              <FiFolder size={13} style={{ flexShrink: 0 }} />
              <span>{(currentFolder.name === '기본 폴더' || currentFolder.name === 'Default Folder') ? (language === 'ko' ? '기본 폴더' : 'Default Folder') : currentFolder.name}</span>
              {currentFolder.isReadOnly && (
                <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '2px' }}>
                  ({language === 'ko' ? '읽기 전용' : 'Read-only'})
                </span>
              )}
            </FolderChip>
          )}

          <SearchInputWrapper>
            <SearchIcon size={16} />
            <SearchInput
              placeholder={t.sidebar.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <ClearButton onClick={() => setSearchQuery('')}>
                <FiX size={14} />
              </ClearButton>
            )}
          </SearchInputWrapper>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                flex: 1,
                padding: window.innerWidth <= 768 ? '8px' : '0.5rem',
                fontSize: window.innerWidth <= 768 ? '13px' : '0.75rem',
                borderRadius: '6px',
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.surface,
                color: theme.colors.text
              }}
            >
              <option value="last-edited">{t.sidebar.last_memoed}</option>
              <option value="last-commented">{t.sidebar.last_commented}</option>
              <option value="date-desc">{t.sidebar.newest}</option>
              <option value="date-asc">{t.sidebar.oldest}</option>
              <option value="title-asc">{t.sidebar.title_asc}</option>
            </select>
          </div>
        </BrandArea>

        <Header style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <TopActions>
            <Button
              $color="#0072B2"
              onClick={() => {
                handleSafeNavigation(() => {
                  navigate(`/memo/new?t=${Date.now()}`, { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                });
              }}>
              <BsKeyboard />
              {language === 'ko' ? '글' : 'Text'}
            </Button>
            <Button
              $color="#D55E00"
              onClick={() => {
                handleSafeNavigation(() => {
                  navigate(`/memo/new?drawing=true&t=${Date.now()}`, { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                });
              }}>
              <FiPenTool />
              {language === 'ko' ? '그리기' : 'Drawing'}
            </Button>
            <Button
              $color="#009E73"
              onClick={() => {
                handleSafeNavigation(() => {
                  navigate(`/memo/new?spreadsheet=true&t=${Date.now()}`, { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                });
              }}>
              <RiTable2 />
              {language === 'ko' ? '시트' : 'Sheet'}
            </Button>
          </TopActions>
        </Header>

        <ThreadableList
          items={groupedItems}
          droppableId="sidebar-memos"
          onDragEnd={onDragEnd}
          useExternalContext={true}
          getItemId={(item) => item.memo.id!}
          renderItem={(item, _index, isCombineTarget) => (

            <SidebarMemoItem
              key={item.memo.id}
              memo={item.memo}
              isActive={id !== undefined && id !== 'new' && id !== 'settings' && String(id) === String(item.memo.id)}
              onClick={(skipHistory) => {
                if (movingMemoId) {
                  handleMove(item.memo.id!);
                } else {
                  onCloseMobile(skipHistory);
                }
              }}
              formatDate={(date) => format(date, language === 'ko' ? 'yyyy.MM.dd' : 'MMM d, yyyy')}
              untitledText={t.sidebar.untitled}
              inThread={item.isThreadChild}
              isThreadHead={item.isThreadHead}
              childCount={item.childCount}
              collapsed={collapsedThreads.has(item.threadId || '')}
              isMovingMode={!!movingMemoId}
              onToggle={toggleThread}
              threadId={item.threadId}
              collapseText={t.sidebar.collapse}
              moreText={t.sidebar.more_memos}
              isCombineTarget={isCombineTarget}
              onTogglePin={handleTogglePin}
            />
          )}

          style={{
            flex: 1,
            padding: '0.5rem',
          }}
        />
      </ScrollableArea>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        adapter={handMemoSyncAdapter}
        t={t}
        language={language}
      />
      {
        toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )
      }

    </SidebarContainer >
  );
});

Sidebar.displayName = 'Sidebar';