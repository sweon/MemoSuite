import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SyncModal, ThreadableList, useColorTheme, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Log } from '../../db';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiRefreshCw, FiMinus, FiFolder } from 'react-icons/fi';

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
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.surface};
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

interface SidebarProps {
  onCloseMobile: () => void;
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
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'model-desc' | 'model-asc' | 'comment-desc'>('date-desc');

  // Expansion state (now collapsed by default)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [justUnpinnedIds, setJustUnpinnedIds] = useState<Map<number, Date>>(new Map());

  const toggleThread = (threadId: string) => {
    const newSet = new Set(expandedThreads);
    if (newSet.has(threadId)) newSet.delete(threadId);
    else newSet.add(threadId);
    setExpandedThreads(newSet);
  };
  const { theme, mode, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useColorTheme();
  const { currentFolderId, currentFolder, setShowFolderList } = useFolder();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Handle folder switching: if current log doesn't belong to folder, go back to root
  useEffect(() => {
    if (id && currentFolderId !== null) {
      db.logs.get(Number(id)).then(log => {
        if (log && log.folderId !== currentFolderId) {
          navigate('/', { replace: true });
        }
      });
    }
  }, [currentFolderId, id, navigate]);

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
    if (needRefresh) {
      setToastMessage(t.sidebar.update_found);
    }
  }, [needRefresh, t.sidebar.update_found]);

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
          setToastMessage(language === 'ko' ? "새 버전을 다운로드하고 있습니다..." : "Downloading new version...");
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
      filtered = filtered.filter(l => l.folderId === currentFolderId);
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
  }, [allLogs, allModels, allComments, searchQuery, sortBy, expandedThreads, justUnpinnedIds]);

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

    if (destination?.droppableId.startsWith('folder-')) {
      const folderId = parseInt(destination.droppableId.replace('folder-', ''));
      // ThreadableList usually uses itemId as draggableId. 
      // check getItemId: if single -> log.id, if header -> `thread-header-${id}`, etc.

      if (!isNaN(folderId)) {
        // Parse the draggableId correctly
        let targetLogId: number | null = null;
        let isThreadHeader = false;

        if (draggableId.startsWith('thread-header-')) {
          targetLogId = Number(draggableId.replace('thread-header-', ''));
          isThreadHeader = true;
        } else if (draggableId.startsWith('thread-child-')) {
          targetLogId = Number(draggableId.replace('thread-child-', ''));
        } else {
          targetLogId = Number(draggableId);
        }

        if (targetLogId && !isNaN(targetLogId)) {
          const log = await db.logs.get(targetLogId);
          if (log) {
            if (isThreadHeader && log.threadId) {
              // Move entire thread
              const siblings = await db.logs.where('threadId').equals(log.threadId).toArray();
              for (const s of siblings) {
                await db.logs.update(s.id!, { folderId, updatedAt: new Date() });
              }
            } else {
              // Move single log
              await db.logs.update(targetLogId, { folderId, updatedAt: new Date() });
            }
            setToastMessage(language === 'ko' ? '로그를 이동했습니다.' : 'Moved log.');
            return;
          }
        }
      }
    }

    const parseLogId = (dId: string) => {
      if (dId.startsWith('thread-header-')) return Number(dId.replace('thread-header-', ''));
      if (dId.startsWith('thread-child-')) return Number(dId.replace('thread-child-', ''));
      return Number(dId);
    };

    const updateThreadOrder = async (threadId: string, logIds: number[]) => {
      await db.transaction('rw', db.logs, async () => {
        for (let i = 0; i < logIds.length; i++) {
          await db.logs.update(logIds[i], { threadId, threadOrder: i });
        }
      });
    };

    if (combine) {
      const sourceId = parseLogId(draggableId);
      const targetId = parseLogId(combine.draggableId);
      if (sourceId === targetId) {
        return;
      }

      const [sourceLog, targetLog] = await Promise.all([
        db.logs.get(sourceId),
        db.logs.get(targetId)
      ]);

      if (!sourceLog || !targetLog) {
        return;
      }

      // If dropped on its own thread member (header or child), treat as extraction
      if (sourceLog.threadId && sourceLog.threadId === targetLog.threadId) {
        await db.logs.update(sourceId, { threadId: undefined, threadOrder: undefined });
        return;
      }

      if (targetLog.threadId) {
        const tid = targetLog.threadId;
        const members = await db.logs.where('threadId').equals(tid).sortBy('threadOrder');
        const newIds = members.filter(m => m.id !== sourceId).map(m => m.id!);
        newIds.push(sourceId);
        await updateThreadOrder(tid, newIds);
      } else {
        const newThreadId = crypto.randomUUID();
        await updateThreadOrder(newThreadId, [targetId, sourceId]);
      }
      return;
    }

    if (!destination) {
      return;
    }
    if (source.index === destination.index) {
      return;
    }

    const movedFlatItem = flatItems[source.index];
    if (!movedFlatItem) {
      return;
    }

    const logId = movedFlatItem.log.id!;
    const nextList = [...flatItems];
    const [removed] = nextList.splice(source.index, 1);
    nextList.splice(destination.index, 0, removed);

    const prevItem = nextList[destination.index - 1];

    // Determine if the dropped position should join a thread
    let targetThreadId: string | undefined = undefined;

    // SMART JOIN LOGIC:
    // 1. If dropped after a thread header: 
    //    - If we are a single log or a child from another thread, join this thread.
    //    - If we are already a header, we stay standalone (don't merge via reorder).
    // 2. If dropped after a thread child: 
    //    - Only join if we were ALREADY in that thread (reordering within thread).
    //    - If we move a child to another thread's children, it extracts.
    // This makes extraction much easier: just drag a child log away from its thread items.
    if (prevItem && (prevItem.type === 'thread-header' || prevItem.type === 'thread-child')) {
      const isSameThread = movedFlatItem.log.threadId === prevItem.threadId;

      if (isSameThread) {
        targetThreadId = prevItem.threadId;
      }
    }
    // Otherwise: targetThreadId remains undefined → extract from thread (or stay standalone)

    if (targetThreadId) {
      // Update the log to join the thread
      await db.logs.update(logId, { threadId: targetThreadId });

      // Get all thread members from the simulated nextList in their new order
      // Filter by log ID instead of type/threadId to catch the dragged item
      const threadLogIds = new Set<number>();

      // First, get all existing thread members
      const existingMembers = await db.logs.where('threadId').equals(targetThreadId).toArray();
      existingMembers.forEach(log => threadLogIds.add(log.id!));

      // Add the dragged item
      threadLogIds.add(logId);

      // Now extract IDs in the order they appear in nextList
      const ids: number[] = [];
      nextList.forEach(item => {
        if (item.type !== 'single' && item.type !== 'thread-header' && item.type !== 'thread-child') return;
        const itemLogId = item.log.id!;
        if (threadLogIds.has(itemLogId) && !ids.includes(itemLogId)) {
          ids.push(itemLogId);
        }
      });

      // Update all thread members with their new order
      await updateThreadOrder(targetThreadId, ids);
    } else {
      await db.logs.update(logId, { threadId: undefined, threadOrder: undefined });
    }
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
      setToastMessage(language === 'ko' ? '로그를 이동했습니다.' : 'Log moved successfully');
    } catch (err) {
      console.error('Failed to move log', err);
      setToastMessage(language === 'ko' ? '이동 실패' : 'Failed to move log');
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
      <ScrollableArea id="sidebar-scrollable-area">
        <BrandArea style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <BrandHeader>
            <AppTitle>LLMemo</AppTitle>
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
                onCloseMobile();
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
                onCloseMobile();
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
              <option value="date-desc">{t.sidebar.newest}</option>
              <option value="date-asc">{t.sidebar.oldest}</option>
              <option value="model-desc">{t.sidebar.model_newest}</option>
              <option value="model-asc">{t.sidebar.model_oldest}</option>
              <option value="comment-desc">{t.sidebar.last_commented}</option>
            </select>
          </div>
        </BrandArea>

        <Header style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <TopActions>
            <Button
              onClick={() => {
                navigate('/new');
                onCloseMobile();
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
                  onClick={onCloseMobile}
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
                  onLogClick={onCloseMobile}
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
                  onClick={onCloseMobile}
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
    </SidebarContainer >
  );
});

Sidebar.displayName = 'Sidebar';