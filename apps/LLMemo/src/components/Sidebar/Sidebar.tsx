import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SyncModal, ThreadableList, useColorTheme, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Log } from '../../db';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiRefreshCw, FiMinus, FiCornerDownRight, FiArrowUp } from 'react-icons/fi';
import { BreadcrumbNav } from '../UI/BreadcrumbNav';

import { useRegisterSW } from 'virtual:pwa-register/react';
import { Tooltip } from '../UI/Tooltip';
import { useFolder } from '../../contexts/FolderContext';

import type { DropResult, DragUpdate } from '@hello-pangea/dnd';

import { Toast } from '../UI/Toast';
import { llmemoSyncAdapter } from '../../utils/backupAdapter';
import { useSearch } from '../../contexts/SearchContext';
import { format } from 'date-fns';
import { SidebarLogItem } from './SidebarLogItem';
import { SidebarThreadItem } from './SidebarThreadItem';
import pkg from '../../../package.json';

const ScrollableArea = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  
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
  color: #56B4E9;
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
  justify-content: center;
  height: 26px;
  padding: 0 12px;
  font-size: 0.75rem;
  font-weight: 600;
  gap: 6px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: none;
  cursor: pointer;
  background: ${({ theme, $color }) => $color || theme.colors.primary};
  color: white;
  white-space: nowrap;
  flex-shrink: 0;
  transition: ${({ theme }) => theme.effects.transition};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.small};
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(0);
  }
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

interface SidebarProps {
  onCloseMobile: (skipHistory?: boolean) => void;
  isEditing?: boolean;
  movingLogId?: number | null;
  setMovingLogId?: (id: number | null) => void;
}

export interface SidebarRef {
  handleDragEnd: (result: DropResult) => Promise<void>;
  handleDragUpdate: (update: DragUpdate) => void;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ onCloseMobile, isEditing = false, movingLogId, setMovingLogId }, ref) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { t } = useLanguage();
  const {
    currentFolderId,
    homeFolder,
    breadcrumbs,
    setShowFolderList,
    navigateToHome,
    navigateToFolder
  } = useFolder();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'model-desc' | 'model-asc' | 'comment-desc'>('date-desc');

  // Expansion state (now collapsed by default)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
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

  const toggleThread = (threadId: string) => {
    const newSet = new Set(expandedThreads);
    if (newSet.has(threadId)) newSet.delete(threadId);
    else newSet.add(threadId);
    setExpandedThreads(newSet);
  };

  const collapseAllThreads = () => {
    setExpandedThreads(new Set());
  };
  const { theme, mode, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useColorTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Handle folder switching: if current log doesn't belong to folder, go back to root
  useEffect(() => {
    if (id && id !== 'new' && id !== 'settings' && currentFolderId !== null) {
      const numericId = Number(id);
      if (!isNaN(numericId)) {
        db.logs.get(numericId).then(log => {
          if (log) {
            const isHome = homeFolder && currentFolderId === homeFolder.id;
            // Root logs (no folderId) are allowed in Home folder
            const isInCurrentFolder = isHome
              ? (log.folderId === currentFolderId || !log.folderId)
              : log.folderId === currentFolderId;

            if (!isInCurrentFolder) {
              navigate('/', { replace: true });
            }
          }
        });
      }
    }
  }, [currentFolderId, id, navigate, homeFolder]);

  // Decide whether to replace history or push.
  // We only replace if we are already in a sub-page (log detail or settings).
  // If we are at root (/), we MUST push so that back button can return to root.
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const needRefreshRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Do NOT check for updates automatically on load or periodically
    // Updates will ONLY be checked when user manually clicks the update button
    immediate: false,
    onRegistered(r) {
      console.log('SW Registered: ' + r)
      // No automatic update checks here
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
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

  // Fetch raw data reactively
  const allLogs = useLiveQuery(() => db.logs.toArray());
  const allModels = useLiveQuery(() => db.models.toArray());
  const allComments = useLiveQuery(() => db.comments.toArray());

  const modelNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    allModels?.forEach(m => map.set(m.id!, m.name));
    return map;
  }, [allModels]);

  type FlatItem =
    | { type: 'single', log: Log }
    | { type: 'thread-header', log: Log, threadId: string, threadLogs: Log[] }
    | { type: 'thread-child', log: Log, threadId: string };

  const flatItems: FlatItem[] = React.useMemo(() => {
    if (!allLogs || !allModels) return [];

    let filtered = [...allLogs];

    // Filter by current folder
    if (currentFolderId !== null) {
      const isHome = homeFolder && currentFolderId === homeFolder.id;
      filtered = filtered.filter(l => isHome ? (l.folderId === currentFolderId || !l.folderId) : l.folderId === currentFolderId);
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();

      // Check if searching for a tag or model
      if (q.startsWith('tag:')) {
        const tagQuery = q.substring(4).trim();
        filtered = filtered.filter(l =>
          l.tags.some(t => t.toLowerCase().includes(tagQuery)) ||
          (l.modelId && allModels.find(m => m.id === l.modelId)?.name.toLowerCase().includes(tagQuery))
        );
      } else {
        // Regular search in title and tags
        filtered = filtered.filter(l =>
          l.title.toLowerCase().includes(q) ||
          l.tags.some(t => t.toLowerCase().includes(q))
        );
      }
    }

    // Sort models
    const modelOrderMap = new Map<number, number>();
    allModels.forEach(m => modelOrderMap.set(m.id!, m.order ?? 999));

    // Grouping
    const groups = new Map<string, Log[]>();
    const singles: Log[] = [];

    filtered.forEach(l => {
      if (l.threadId) {
        if (!groups.has(l.threadId)) groups.set(l.threadId, []);
        groups.get(l.threadId)!.push(l);
      } else {
        singles.push(l);
      }
    });

    groups.forEach(g => g.sort((a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0)));

    type SortableGroup = {
      type: 'single', log: Log, lastDate: Date
    } | {
      type: 'thread', logs: Log[], threadId: string, lastDate: Date
    };

    const sortableGroups: SortableGroup[] = [
      ...singles.map(l => ({ type: 'single' as const, log: l, lastDate: l.createdAt })),
      ...Array.from(groups.entries()).map(([tid, g]) => {
        const latest = g.reduce((p, c) => (new Date(p.createdAt) > new Date(c.createdAt) ? p : c), g[0]);
        return { type: 'thread' as const, logs: g, threadId: tid, lastDate: latest.createdAt };
      })
    ];

    sortableGroups.sort((a, b) => {
      const aLog = a.type === 'single' ? a.log : a.logs[0];
      const bLog = b.type === 'single' ? b.log : b.logs[0];

      const aPinnedAt = aLog.pinnedAt || (aLog.id ? justUnpinnedIds.get(aLog.id) : undefined);
      const bPinnedAt = bLog.pinnedAt || (bLog.id ? justUnpinnedIds.get(bLog.id) : undefined);

      // Pinned logic: pinned items always come first, sorted by pinnedAt desc
      if (aPinnedAt && bPinnedAt) return new Date(bPinnedAt).getTime() - new Date(aPinnedAt).getTime();
      if (aPinnedAt) return -1;
      if (bPinnedAt) return 1;

      if (sortBy === 'date-desc') return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      if (sortBy === 'date-asc') return new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime();

      if (sortBy === 'model-desc' || sortBy === 'model-asc') {
        const aModelOrder = aLog.modelId ? (modelOrderMap.get(aLog.modelId) ?? 999) : 999;
        const bModelOrder = bLog.modelId ? (modelOrderMap.get(bLog.modelId) ?? 999) : 999;

        if (sortBy === 'model-desc') {
          // Lower order number = higher priority = show first
          if (aModelOrder !== bModelOrder) return aModelOrder - bModelOrder;
          // Same model order: sort by date (newest first)
          return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
        } else {
          // model-asc: Higher order = show first
          if (aModelOrder !== bModelOrder) return bModelOrder - aModelOrder;
          // Same model order: sort by date (newest first)
          return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
        }
      }

      return 0;
    });

    const flat: FlatItem[] = [];
    sortableGroups.forEach(g => {
      if (g.type === 'single') {
        flat.push({ type: 'single', log: g.log });
      } else {
        const header = g.logs[0];
        flat.push({ type: 'thread-header', log: header, threadId: g.threadId, threadLogs: g.logs });
        if (expandedThreads.has(g.threadId)) {
          g.logs.slice(1).forEach(child => {
            flat.push({ type: 'thread-child', log: child, threadId: g.threadId });
          });
        }
      }
    });

    return flat;
  }, [allLogs, allModels, allComments, searchQuery, sortBy, expandedThreads, justUnpinnedIds, currentFolderId, homeFolder]);

  const handleTogglePinLog = async (logId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const log = await db.logs.get(logId);
    if (log) {
      if (log.pinnedAt) {
        // preserve position for 500ms
        const oldPinnedAt = log.pinnedAt;
        setJustUnpinnedIds(prev => {
          const next = new Map(prev);
          next.set(logId, oldPinnedAt);
          return next;
        });
        setTimeout(() => {
          setJustUnpinnedIds(prev => {
            if (!prev.has(logId)) return prev;
            const next = new Map(prev);
            next.delete(logId);
            return next;
          });
        }, 1000);
      } else {
        // If pinning, make sure it's removed from recently unpinned list
        setJustUnpinnedIds(prev => {
          if (!prev.has(logId)) return prev;
          const next = new Map(prev);
          next.delete(logId);
          return next;
        });
      }

      await db.logs.update(logId, {
        pinnedAt: log.pinnedAt ? undefined : new Date()
      });
    }
  };

  useEffect(() => {
    if (!id || id === 'new' || id === 'settings') return;

    const activeLogId = parseInt(id);
    if (!isNaN(activeLogId)) {
      const isVisible = flatItems.some(it => it.log.id === activeLogId);
      if (!isVisible && searchQuery) {
        const exists = allLogs?.some(m => m.id === activeLogId);
        if (exists) {
          setSearchQuery('');
          return;
        }
      }
    }

    const timer = setTimeout(() => {
      const element = document.querySelector(`[data-log-id="${id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [id, flatItems.length]);

  const onDragUpdate = (_update: DragUpdate) => {
    // onDragUpdate?.(update); // Original was calling undefined prop? Or just typo? 
    // In LLMemo original code: 
    // const onDragUpdate = (update: DragUpdate) => { onDragUpdate?.(update); }; 
    // Whatever, we just need to handle it or expose it.
    // ThreadableList might handle it internally? 
    // Actually, we need to expose it for MainLayout.
  };

  useImperativeHandle(ref, () => ({
    handleDragEnd: async (result: DropResult) => {
      await onDragEnd(result);
    },
    handleDragUpdate: (update: DragUpdate) => {
      onDragUpdate(update);
    }
  }));

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, combine, draggableId } = result;

    const parseLogId = (dId: string) => {
      if (dId.startsWith('thread-header-')) return Number(dId.replace('thread-header-', ''));
      if (dId.startsWith('thread-child-')) return Number(dId.replace('thread-child-', ''));
      return Number(dId);
    };

    if (!destination && !combine) return;

    const sourceId = parseLogId(draggableId);
    if (!sourceId || isNaN(sourceId)) return;

    // --- Handle Combining (Joining Threads) ---
    if (combine) {
      const targetId = parseLogId(combine.draggableId);
      if (sourceId === targetId) return;

      const [sourceLog, targetLog] = await Promise.all([
        db.logs.get(sourceId),
        db.logs.get(targetId)
      ]);

      if (!sourceLog || !targetLog) return;

      const newThreadId = targetLog.threadId || crypto.randomUUID();
      const targetItem = flatItems.find(it => it.log.id === targetId);
      const isTargetHeader = targetItem?.type === 'thread-header' || !targetLog.threadId;

      await db.transaction('rw', db.logs, async () => {
        // Prepare target if not in thread
        if (!targetLog.threadId) {
          await db.logs.update(targetId, {
            threadId: newThreadId,
            threadOrder: 1 // Target moves to 1 to make room for source
          });
        }

        const existingSiblings = await db.logs.where('threadId').equals(newThreadId).toArray();
        const sortedSiblings = existingSiblings.sort((a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0));

        // Identify source items
        let sourceItems: Log[] = [sourceLog];
        if (sourceLog.threadId) {
          const sSiblings = await db.logs.where('threadId').equals(sourceLog.threadId).toArray();
          const sSorted = sSiblings.sort((a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0));
          const isSourceHeader = draggableId.startsWith('thread-header-');
          if (isSourceHeader) {
            sourceItems = sSorted;
          }
        }

        if (isTargetHeader) {
          // Prepend
          const filteredTargetSiblings = sortedSiblings.filter(m => !sourceItems.some(si => si.id === m.id));
          const newList = [...sourceItems, ...filteredTargetSiblings];

          for (let i = 0; i < newList.length; i++) {
            await db.logs.update(newList[i].id!, {
              threadId: newThreadId,
              threadOrder: i
            });
          }
        } else {
          // Append
          const filteredTargetSiblings = sortedSiblings.filter(m => !sourceItems.some(si => si.id === m.id));
          let currentMax = filteredTargetSiblings.reduce((max, m) => Math.max(max, m.threadOrder ?? 0), -1);

          for (const si of sourceItems) {
            currentMax++;
            await db.logs.update(si.id!, {
              threadId: newThreadId,
              threadOrder: currentMax
            });
          }
        }
        await db.logs.update(sourceId, { updatedAt: new Date() });
      });
      return;
    }

    // Check if dropping onto a folder
    if (destination?.droppableId.startsWith('folder-')) {
      const folderId = parseInt(destination.droppableId.replace('folder-', ''));
      if (!isNaN(folderId)) {
        const log = await db.logs.get(sourceId);
        if (log) {
          const isThreadHeader = draggableId.startsWith('thread-header-');
          if (isThreadHeader && log.threadId) {
            // Move entire thread
            const siblings = await db.logs.where('threadId').equals(log.threadId).toArray();
            for (const s of siblings) {
              await db.logs.update(s.id!, { folderId, updatedAt: new Date() });
            }
          } else {
            // Move single log
            await db.logs.update(sourceId, {
              folderId,
              threadId: undefined,
              threadOrder: undefined,
              updatedAt: new Date()
            });
          }
          setToastMessage(t.sidebar.move_entire_thread);
          return;
        }
      }
    }

    const sourceLog = await db.logs.get(sourceId);
    if (!sourceLog) return;

    if (!destination) return; // Guaranteed by early return 

    const items = flatItems;
    const sourceIndex = source.index;
    const destIndex = destination.index;

    // Check if we should return early
    if (sourceIndex === destIndex) {
      const item = items[sourceIndex];
      // Only proceed if it's a thread item that might want extraction
      if (item.type !== 'thread-header' && item.type !== 'thread-child') return;
    }

    const targetItem = items[destIndex];
    const prevItem = items[destIndex - 1];

    // --- Thread Reordering & Joining Logic ---
    let destThreadId: string | undefined = undefined;

    if (targetItem?.type === 'thread-child') {
      destThreadId = targetItem.log.threadId;
    } else if (targetItem?.type === 'thread-header') {
      // Dropped on/above header -> extract
      destThreadId = undefined;
    } else if (prevItem?.log.threadId && sourceLog.threadId === prevItem.log.threadId) {
      destThreadId = prevItem.log.threadId;
    }

    if (destThreadId) {
      await db.transaction('rw', db.logs, async () => {
        const siblings = await db.logs.where('threadId').equals(destThreadId!).toArray();
        const sortedSiblings = siblings.sort((a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0));

        const filteredSiblings = sortedSiblings.filter(m => m.id !== sourceId);

        const threadBlockStart = items.findIndex(it => it.log.threadId === destThreadId);
        let positionInThread = destIndex - threadBlockStart;

        positionInThread = Math.max(0, Math.min(positionInThread, filteredSiblings.length));

        const newThreadItems = [...filteredSiblings];
        newThreadItems.splice(positionInThread, 0, sourceLog as any);

        for (let i = 0; i < newThreadItems.length; i++) {
          await db.logs.update(newThreadItems[i].id!, {
            threadId: destThreadId,
            threadOrder: i
          });
        }
        await db.logs.update(sourceId, { updatedAt: new Date() });
      });
      return;
    }

    // --- Generic Sort Reordering / Extraction ---
    let newTime: number;
    if (destIndex === 0) {
      newTime = items[0].log.createdAt.getTime() + 60000;
    } else if (destIndex === items.length - 1) {
      newTime = items[items.length - 1].log.createdAt.getTime() - 60000;
    } else {
      const beforeIdx = destIndex < sourceIndex ? destIndex - 1 : destIndex;
      const afterIdx = destIndex < sourceIndex ? destIndex : destIndex + 1;
      const t1 = items[beforeIdx].log.createdAt.getTime();
      const t2 = items[afterIdx].log.createdAt.getTime();
      newTime = (t1 + t2) / 2;
    }

    await db.logs.update(sourceId, {
      threadId: undefined,
      threadOrder: undefined,
      createdAt: new Date(newTime) // LLMemo uses createdAt for default sorting in many places, 
      // but let's check if it actually sorts by createdAt or updatedAt.
      // Line 516-534 says it uses lastDate which is l.createdAt (Line 491-500).
    });
  };

  const handleMove = async (targetLogId: number) => {
    if (!movingLogId || !setMovingLogId) return;
    if (movingLogId === targetLogId) return;

    try {
      const targetLog = await db.logs.get(targetLogId);
      if (!targetLog) return;

      const threadId = targetLog.threadId || crypto.randomUUID();

      if (!targetLog.threadId) {
        await db.logs.update(targetLogId, { threadId, threadOrder: 0 });
      }

      const siblings = await db.logs.where('threadId').equals(threadId).toArray();
      const maxOrder = siblings.reduce((max, m) => Math.max(max, m.threadOrder || 0), 0);

      await db.logs.update(movingLogId, {
        threadId,
        threadOrder: maxOrder + 1,
        updatedAt: new Date()
      });

      setMovingLogId(null);
      setToastMessage(t.sidebar.move_success);
    } catch (err) {
      console.error('Failed to move log', err);
      setToastMessage(t.sidebar.move_failed);
    }
  };

  return (
    <SidebarContainer>
      {movingLogId && (
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
          zIndex: 30
        }}>
          <span>{t.sidebar.select_target}</span>
          <button
            onClick={() => setMovingLogId?.(null)}
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
            {t.sidebar.cancel}
          </button>
        </div>
      )}
      <ScrollableArea id="sidebar-scrollable-area" ref={scrollAreaRef} onScroll={handleScroll}>
        <BrandArea style={{
          opacity: isEditing ? 0.5 : 1,
          pointerEvents: isEditing ? 'none' : 'auto'
        }}>
          <BrandHeader>
            <AppTitle>LLMemo</AppTitle>
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
              <IconButton onClick={() => setIsSyncModalOpen(true)}>
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
                navigate('/settings', { replace: true, state: { isGuard: true } });
                onCloseMobile(true);
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
                  navigateToFolder(folderId);
                  setShowFolderList(true);
                  navigate('/folders', { replace: true, state: { isGuard: true } });
                  onCloseMobile(true);
                }}
                onNavigateHome={() => {
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
              <option value="date-desc">{t.sidebar.newest}</option>
              <option value="date-asc">{t.sidebar.oldest}</option>
              <option value="model-desc">{t.sidebar.model_newest}</option>
              <option value="model-asc">{t.sidebar.model_oldest}</option>
              <option value="comment-desc">{t.sidebar.last_commented}</option>
            </select>
          </div>
        </BrandArea>

        <Header style={{
          opacity: isEditing ? 0.5 : 1,
          pointerEvents: isEditing ? 'none' : 'auto'
        }}>
          <TopActions>
            <Button
              onClick={() => {
                navigate('/new');
                onCloseMobile(true);
              }}
              $color="#56B4E9"
            >
              <FiPlus />
              {t.sidebar.new || 'New Log'}
            </Button>
          </TopActions>
        </Header>


        <ThreadableList
          useExternalContext={true}
          items={flatItems}
          droppableId="root"
          type="LOG_LIST"
          onDragStart={() => { }}
          onDragEnd={onDragEnd}
          // onDragUpdate is handled by ThreadableList but we can pass it if we need extra logic
          getItemId={(item) => {
            if (item.type === 'single') return item.log.id!;
            if (item.type === 'thread-header') return `thread-header-${item.log.id}`;
            if (item.type === 'thread-child') return `thread-child-${item.log.id}`;
            return '';
          }}
          renderItem={(item, _index, isCombineTarget) => {
            if (item.type === 'single') {
              const logId = item.log.id!;
              return (
                <SidebarLogItem
                  key={logId}
                  log={item.log}
                  isActive={id !== undefined && id !== 'new' && id !== 'settings' && Number(id) === logId}
                  onClick={() => onCloseMobile(true)}
                  modelName={modelNameMap.get(item.log.modelId!)}
                  formatDate={(d: Date) => format(d, 'yy.MM.dd HH:mm')}
                  untitledText={t.sidebar.untitled}
                  isCombineTarget={isCombineTarget}
                  onTogglePin={handleTogglePinLog}
                  onMove={movingLogId ? handleMove : undefined}
                />
              );
            } else if (item.type === 'thread-header') {
              return (
                <SidebarThreadItem
                  key={`header-${item.threadId}`}
                  threadId={item.threadId}
                  logs={item.threadLogs}
                  index={_index}
                  collapsed={!expandedThreads.has(item.threadId)}
                  onToggle={toggleThread}
                  activeLogId={Number(id)}
                  modelMap={modelNameMap}
                  formatDate={(d: Date) => format(d, 'yy.MM.dd HH:mm')}
                  untitledText={t.sidebar.untitled}
                  onLogClick={() => onCloseMobile(true)}
                  isCombineTarget={isCombineTarget}
                  t={t}
                  onTogglePin={handleTogglePinLog}
                  onMove={movingLogId ? handleMove : undefined}
                />
              );
            } else if (item.type === 'thread-child') {
              return (
                <SidebarLogItem
                  key={item.log.id!}
                  log={item.log}
                  isActive={id !== undefined && id !== 'new' && id !== 'settings' && Number(id) === item.log.id!}
                  onClick={() => onCloseMobile(true)}
                  modelName={modelNameMap.get(item.log.modelId!)}
                  formatDate={(d: Date) => format(d, 'yy.MM.dd HH:mm')}
                  untitledText={t.sidebar.untitled}
                  inThread={true}
                  isCombineTarget={isCombineTarget}
                  onTogglePin={handleTogglePinLog}
                  onMove={movingLogId ? handleMove : undefined}
                />
              );
            }
            return null;
          }}

          style={{
            flex: 1,
            padding: '0.5rem',
            minHeight: '200px',
            opacity: isEditing ? 0.5 : 1,
            pointerEvents: isEditing ? 'none' : 'auto'
          }}
        />
      </ScrollableArea>

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        adapter={llmemoSyncAdapter}
        t={t}
        language={useLanguage().language}
      />
      {
        toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )
      }
      <ScrollTopButton $visible={showScrollTop} onClick={scrollToTop} title={t.common?.scroll_to_top || "Scroll to top"}>
        <FiArrowUp size={20} />
      </ScrollTopButton>
    </SidebarContainer >
  );
});

Sidebar.displayName = 'Sidebar';