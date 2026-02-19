import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SyncModal, ThreadableList, useColorTheme, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Memo, type Folder } from '../../db';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiRefreshCw, FiMinus, FiPenTool, FiCornerDownRight, FiArrowUp } from 'react-icons/fi';
import { BsKeyboard } from 'react-icons/bs';
import { RiTable2 } from 'react-icons/ri';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Tooltip } from '../UI/Tooltip';
import { BreadcrumbNav } from '../UI/BreadcrumbNav';

import { Toast } from '../UI/Toast';

import { useSearch } from '../../contexts/SearchContext';
import { SidebarMemoItem } from './SidebarMemoItem';
import { SidebarFolderItem } from './SidebarFolderItem';
import { dailyMemoSyncAdapter } from '../../utils/backupAdapter';
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
  padding: 6px 0.5rem 0.5rem;
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

const BrandArea = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 1rem 6px;
  gap: 8px;
`;

const ScrollTopButton = styled.button<{ $visible: boolean }>`
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.full};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.medium};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '20px')});
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  z-index: 100;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary};
    filter: brightness(1.1);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
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
  color: #cc79a7;
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

interface SidebarProps {
  onCloseMobile: (skipHistory?: boolean) => void;
  isEditing?: boolean;
  movingMemoId?: number | null;
  setMovingMemoId?: (id: number | null) => void;
}


export interface SidebarRef {
  handleDragEnd: (result: DropResult) => Promise<void>;
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
  const { id: paramsId } = useParams<{ id: string }>();
  // In v6, useParams in a parent layout might not see child params. 
  // We fall back to parsing the path.
  const id = paramsId || (location.pathname.includes('/memo/') ? location.pathname.split('/memo/')[1].split('?')[0] : undefined);



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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 300);
  };

  const scrollToTop = () => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleThread = (id: string) => {
    setCollapsedThreads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAllThreads = () => {
    const threadIds = new Set<string>();
    allMemos?.forEach(m => {
      if (m.threadId) threadIds.add(m.threadId);
    });
    setCollapsedThreads(threadIds);
  };

  const needRefreshRef = useRef(false);
  const isNavigatingRef = useRef(false);

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
      }, 1000);
    };

    if (needRefresh) {
      installUpdate();
      return;
    }

    if (isCheckingUpdate) return;
    if (!isSilent) setIsCheckingUpdate(true);

    if (!('serviceWorker' in navigator)) {
      if (!isSilent) setToastMessage(t.sidebar.pwa_not_supported);
      if (!isSilent) setIsCheckingUpdate(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        if (!isSilent) setToastMessage(t.sidebar.check_failed);
        if (!isSilent) setIsCheckingUpdate(false);
        return;
      }

      await registration.update();

      // Give it a tiny bit of time for state changes to propagate
      await new Promise(resolve => setTimeout(resolve, 800));

      if (registration.waiting || needRefreshRef.current) {
        installUpdate();
      } else if (registration.installing) {
        if (!isSilent) {
          setToastMessage(t.sidebar.downloading_update);
        }

        const worker = registration.installing;
        if (worker) {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
              installUpdate();
            }
          });
        }
      } else if (!isSilent) {
        setToastMessage(t.sidebar.up_to_date);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      if (!isSilent) setToastMessage(t.sidebar.check_failed);
    } finally {
      if (!isSilent) setIsCheckingUpdate(false);
    }
  };


  const allMemos = useLiveQuery(() => db.memos.toArray());
  const allComments = useLiveQuery(() => db.comments.toArray());

  const {
    currentFolderId,
    homeFolder,
    currentFolder,
    subfolders,
    breadcrumbs,
    setShowFolderList,
    navigateToHome,
    navigateToFolder,
    navigateUp,
    allFolders
  } = useFolder();


  // Handle folder switching: if current memo doesn't belong to folder, go back to root
  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }
    let active = true;
    if (id && currentFolderId !== null) {
      db.memos.get(Number(id)).then(memo => {
        if (active && memo && memo.folderId !== currentFolderId) {
          navigate('/', { replace: true });
        }
      });
    }
    return () => { active = false; };
  }, [id, currentFolderId, navigate]);

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
    let memos = [...allMemos];
    if (currentFolderId !== null) {
      const isHome = homeFolder && currentFolderId === homeFolder.id;
      memos = memos.filter(m => isHome ? (m.folderId === currentFolderId || !m.folderId) : m.folderId === currentFolderId);
    }

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
      if (aPinnedAt && bPinnedAt) return new Date(bPinnedAt).getTime() - new Date(aPinnedAt).getTime();
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
  }, [allMemos, searchQuery, sortBy, currentFolderId, homeFolder, lastCommentMap, justUnpinnedIds]);

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
      type: 'memo' | 'folder' | 'folder-up';
      memo?: Memo;
      folder?: Folder;
      isThreadHead?: boolean;
      isThreadChild?: boolean;
      threadId?: string;
      childCount?: number;
      memoCount?: number;
      subfolderCount?: number;
    }> = [];

    // Add "Go Up" button if not in Home folder
    if (currentFolderId !== null && homeFolder && currentFolder && !currentFolder.isHome) {
      items.push({ type: 'folder-up' });
    }

    // Add subfolders
    if (subfolders && subfolders.length > 0) {
      subfolders.forEach(f => {
        const mCount = allMemos?.filter(m => m.folderId === f.id).length || 0;
        const sCount = allFolders?.filter(folder => folder.parentId === f.id).length || 0;
        items.push({ type: 'folder', folder: f, memoCount: mCount, subfolderCount: sCount });
      });
    }

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
  }, [sortedMemos, allMemos, collapsedThreads, currentFolderId, homeFolder, currentFolder, subfolders]);

  const activeId = location.pathname.split('/').pop();
  useEffect(() => {
    if (!activeId || activeId === 'new' || activeId === 'settings') return;

    const activeMemoId = parseInt(activeId);
    if (!isNaN(activeMemoId)) {
      const isVisible = groupedItems.some(it => it.type === 'memo' && it.memo?.id === activeMemoId);
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
      const targetItem = groupedItems.find(it => it.type === 'memo' && it.memo?.id === targetId);
      const isTargetHeader = (targetItem as any)?.isThreadHead || !targetMemo.threadId;

      await db.transaction('rw', db.memos, async () => {
        // Ensure target is in thread
        if (!targetMemo.threadId) {
          await db.memos.update(targetId, {
            threadId: newThreadId,
            threadOrder: 1 // Target moves to 1 to make room for source
          });
        }

        const existingSiblings = await db.memos.where('threadId').equals(newThreadId).toArray();
        const sortedSiblings = existingSiblings.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0));

        // Identify source items (move entire thread if dragging header)
        let sourceItems: Memo[] = [sourceMemo];
        if (sourceMemo.threadId) {
          const sSiblings = await db.memos.where('threadId').equals(sourceMemo.threadId).toArray();
          const sSorted = sSiblings.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0));
          const isSourceHeader = groupedItems.find(it => it.type === 'memo' && it.memo?.id === sourceId)?.isThreadHead;
          if (isSourceHeader) {
            sourceItems = sSorted;
          }
        }

        if (isTargetHeader) {
          // Prepend sourceItems
          const filteredTargetSiblings = sortedSiblings.filter(m => !sourceItems.some(si => si.id === m.id));
          const newList = [...sourceItems, ...filteredTargetSiblings];

          for (let i = 0; i < newList.length; i++) {
            await db.memos.update(newList[i].id!, {
              threadId: newThreadId,
              threadOrder: i
            });
          }
        } else {
          // Append sourceItems
          const filteredTargetSiblings = sortedSiblings.filter(m => !sourceItems.some(si => si.id === m.id));
          let currentMax = filteredTargetSiblings.reduce((max, m) => Math.max(max, m.threadOrder || 0), -1);

          for (const si of sourceItems) {
            currentMax++;
            await db.memos.update(si.id!, {
              threadId: newThreadId,
              threadOrder: currentMax
            });
          }
        }
        await db.memos.update(sourceId, { updatedAt: new Date() });
      });
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
      const isHeader = groupedItems.find(it => it.type === 'memo' && it.memo?.id === sourceMemoId)?.isThreadHead;

      if (isHeader && sourceMemo.threadId) {
        // Move entire thread
        const threadMemos = await db.memos.where('threadId').equals(sourceMemo.threadId).toArray();
        for (const tm of threadMemos) {
          await db.memos.update(tm.id!, { folderId, updatedAt: new Date() });
        }
        setToastMessage(t.sidebar.move_entire_thread);
      } else {
        // Just move this memo
        await db.memos.update(sourceMemoId, {
          folderId,
          threadId: undefined,
          threadOrder: undefined,
          updatedAt: new Date()
        });
        setToastMessage(t.sidebar.move_success);
      }
      return;
    }

    const sourceMemo = await db.memos.get(sourceMemoId);
    if (!sourceMemo) return;

    const items = groupedItems;
    const sourceIndex = result.source.index;
    const destIndex = destination.index;

    // Check if we should return early
    if (sourceIndex === destIndex) {
      const item = items[sourceIndex];
      // Only proceed if it's a thread item that might want extraction
      if (!item.isThreadHead && !item.isThreadChild) return;
    }

    const targetItem = items[destIndex];
    const prevItem = items[destIndex - 1];

    // --- Thread Reordering & Joining Logic ---
    let destThreadId: string | undefined = undefined;

    // Logic: If target position is a thread child, join/stay in thread.
    // If target position is a thread head, it means "above the header", so extract.
    if (targetItem?.isThreadChild) {
      destThreadId = targetItem.threadId;
    } else if (targetItem?.isThreadHead) {
      // Dropped on/above header -> extract
      destThreadId = undefined;
    } else if (prevItem?.threadId && sourceMemo.threadId === prevItem.threadId) {
      // Dropped at the very end of its own thread block
      destThreadId = prevItem.threadId;
    }

    if (destThreadId) {
      // Transactional thread update
      await db.transaction('rw', db.memos, async () => {
        const siblings = await db.memos.where('threadId').equals(destThreadId!).toArray();
        const sortedSiblings = siblings.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0));

        // Remove source from siblings if it was already there (internal reorder)
        const filteredSiblings = sortedSiblings.filter(m => m.id !== sourceMemoId);

        // Calculate relative position in thread
        const threadBlockStart = items.findIndex(it => it.type === 'memo' && it.threadId === destThreadId);
        let positionInThread = destIndex - threadBlockStart;

        // Clamp position
        positionInThread = Math.max(0, Math.min(positionInThread, filteredSiblings.length));

        const newThreadItems = [...filteredSiblings];
        newThreadItems.splice(positionInThread, 0, sourceMemo as any);

        // Reassign orders
        for (let i = 0; i < newThreadItems.length; i++) {
          await db.memos.update(newThreadItems[i].id!, {
            threadId: destThreadId,
            threadOrder: i
          });
        }

        // Update updatedAt to reflect latest change in thread
        await db.memos.update(sourceMemoId, { updatedAt: new Date() });
      });
      return;
    }

    // --- Generic Sort Reordering / Extraction ---
    // Calculate new position using updatedAt for sorting
    let newTime: number;
    const memoItems = items.filter(it => it.type === 'memo');
    if (memoItems.length === 0) {
      newTime = Date.now();
    } else if (destIndex === 0) {
      newTime = (items[0] as any).memo.updatedAt.getTime() + 60000; // 1 min later
    } else if (destIndex >= items.length - 1) {
      newTime = (items[items.length - 1] as any).memo.updatedAt.getTime() - 60000;
    } else {
      // Find nearest memos before and after
      let beforeMemo = null;
      for (let i = destIndex - 1; i >= 0; i--) {
        if (items[i].type === 'memo') {
          beforeMemo = (items[i] as any).memo;
          break;
        }
      }
      let afterMemo = null;
      for (let i = destIndex; i < items.length; i++) {
        if (items[i].type === 'memo') {
          afterMemo = (items[i] as any).memo;
          break;
        }
      }

      if (beforeMemo && afterMemo) {
        newTime = (beforeMemo.updatedAt.getTime() + afterMemo.updatedAt.getTime()) / 2;
      } else if (beforeMemo) {
        newTime = beforeMemo.updatedAt.getTime() - 60000;
      } else if (afterMemo) {
        newTime = afterMemo.updatedAt.getTime() + 60000;
      } else {
        newTime = Date.now();
      }
    }

    // If it was in a thread and moved to a non-thread position, extract it
    await db.memos.update(sourceMemoId, {
      threadId: undefined,
      threadOrder: undefined,
      updatedAt: new Date(newTime)
    });
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
      // Wait, in DailyMemo's ThreadableList, threadId is common for all siblings.

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
      <ScrollableArea id="sidebar-scrollable-area" ref={scrollAreaRef} onScroll={handleScroll}>
        <BrandArea style={{
          opacity: isEditing ? 0.5 : 1,
          pointerEvents: isEditing ? 'none' : 'auto'
        }}>
          <BrandHeader>
            <AppTitle>DailyMemo</AppTitle>
            <AppVersion>v{pkg.version}</AppVersion>
          </BrandHeader>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingBottom: '4px' }}>
            <Tooltip content={t.sidebar.collapse_all}>
              <IconButton onClick={collapseAllThreads}>
                <FiCornerDownRight size={18} />
              </IconButton>
            </Tooltip>

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', minHeight: '40px', flexWrap: 'wrap', width: '100%' }}>
            {breadcrumbs.length > 0 && (
              <BreadcrumbNav
                items={breadcrumbs}
                onNavigate={(folderId) => {
                  isNavigatingRef.current = true;
                  navigateToFolder(folderId);
                  setShowFolderList(true);
                  navigate('/folders', { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                }}
                onNavigateHome={() => {
                  isNavigatingRef.current = true;
                  navigateToHome();
                  setShowFolderList(true);
                  navigate('/folders', { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                }}
              />
            )}
          </div>


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

        <Header style={{
          opacity: isEditing ? 0.5 : 1,
          pointerEvents: isEditing ? 'none' : 'auto'
        }}>
          <TopActions>
            <Button
              $color="#0072B2"
              onClick={() => {
                handleSafeNavigation(() => {
                  // Save current memo ID for Exit navigation
                  if (id && id !== 'new' && id !== 'settings') {
                    localStorage.setItem('dailymemo_prev_memo_id', id);
                  }
                  navigate(`/memo/new?t=${Date.now()}`, { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                });
              }}>
              <BsKeyboard />
              {t.sidebar.text_memo}
            </Button>
            <Button
              $color="#D55E00"
              onClick={() => {
                handleSafeNavigation(() => {
                  // Save current memo ID for Exit navigation
                  if (id && id !== 'new' && id !== 'settings') {
                    localStorage.setItem('dailymemo_prev_memo_id', id);
                  }
                  navigate(`/memo/new?drawing=true&t=${Date.now()}`, { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                });
              }}>
              <FiPenTool />
              {t.sidebar.drawing_memo}
            </Button>
            <Button
              $color="#009E73"
              onClick={() => {
                handleSafeNavigation(() => {
                  // Save current memo ID for Exit navigation
                  if (id && id !== 'new' && id !== 'settings') {
                    localStorage.setItem('dailymemo_prev_memo_id', id);
                  }
                  navigate(`/memo/new?spreadsheet=true&t=${Date.now()}`, { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                });
              }}>
              <RiTable2 />
              {t.sidebar.sheet_memo}
            </Button>
          </TopActions>
        </Header>



        <ThreadableList
          items={groupedItems}
          droppableId="sidebar-memos"
          onDragStart={() => { }}
          onDragEnd={onDragEnd}
          useExternalContext={true}
          getItemId={(item: any) => {
            if (item.type === 'folder-up') return 'folder-up';
            if (item.type === 'folder') return `folder-${item.folder.id}`;
            return item.memo.id!;
          }}
          renderItem={(item: any, _index, isCombineTarget) => {
            if (item.type === 'folder-up') {
              return (
                <SidebarFolderItem
                  key="folder-up"
                  name=".."
                  onClick={() => navigateUp()}
                  isUp={true}
                />
              );
            }
            if (item.type === 'folder') {
              return (
                <SidebarFolderItem
                  key={`folder-${item.folder.id}`}
                  name={item.folder.name}
                  onClick={() => navigateToFolder(item.folder.id!)}
                  memoCount={item.memoCount}
                  subfolderCount={item.subfolderCount}
                />
              );
            }
            return (
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
                formatDate={(date) => format(date, language === 'ko' ? 'yyyy.MM.dd HH:mm' : 'MMM d, yyyy HH:mm')}
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
            );
          }}

          style={{
            flex: 1,
            padding: '0.5rem',
            opacity: isEditing ? 0.5 : 1,
            pointerEvents: isEditing ? 'none' : 'auto'
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
        adapter={dailyMemoSyncAdapter}
        t={t}
        language={language}
      />
      {
        toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
            duration={(toastMessage === t.sidebar.move_success || toastMessage === t.sidebar.move_entire_thread) ? 500 : 2500}
          />
        )
      }

      <ScrollTopButton $visible={showScrollTop} onClick={scrollToTop} title={t.common?.scroll_to_top || "Scroll to top"}>
        <FiArrowUp size={20} />
      </ScrollTopButton>
    </SidebarContainer >
  );
});

Sidebar.displayName = 'Sidebar';