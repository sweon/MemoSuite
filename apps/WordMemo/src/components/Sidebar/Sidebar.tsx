import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { SyncModal, useColorTheme, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Word, Folder } from '../../db';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiEyeOff, FiStar, FiRefreshCw, FiMinus, FiCornerDownRight, FiArrowUp } from 'react-icons/fi';
import { Tooltip } from '../UI/Tooltip';
import { BreadcrumbNav } from '../UI/BreadcrumbNav';
import { useFolder } from '../../contexts/FolderContext';
import { Droppable, type DropResult, type DragUpdate } from '@hello-pangea/dnd';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Toast } from '../UI/Toast';

import { wordMemoSyncAdapter } from '../../utils/backupAdapter';
import { useSearch } from '../../contexts/SearchContext';
import { useStudyMode } from '../../contexts/StudyModeContext';
import { format } from 'date-fns';
import { SidebarMemoItem } from './SidebarMemoItem';
import { SidebarThreadItem } from './SidebarThreadItem';
import { SidebarFolderItem } from './SidebarFolderItem';
import { StarButton } from './itemStyles';
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
  padding: 4px 0.5rem 0.5rem;
`;

const StickyHeaderArea = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
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
  color: #117864;
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

const SearchInput = styled.input<{ $hasStarred?: boolean }>`
  width: 100%;
  padding: 10px ${({ $hasStarred }) => ($hasStarred ? '60px' : '36px')} 10px 36px;
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

const StarFilterButton = styled(StarButton)`
  position: absolute;
  right: 34px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.small};
  transition: ${({ theme }) => theme.effects.transition};
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  // width: 26px;
  height: 26px;
  padding: 0 12px;
  font-size: 0.75rem;
  font-weight: 600;
  gap: 6px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: none;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
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

const WordList = styled.div`
  padding: 0.5rem;
  scrollbar-width: thin;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  min-height: 200px;
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

const StudyModeGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
`;

const StudyModeOption = styled.label<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.medium};
  border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) => $active ? `${theme.colors.primary}11` : theme.colors.background};

  /* Force text visibility */
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.textSecondary} !important;

  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: ${({ theme }) => theme.effects.transition};
  white-space: nowrap;

  /* Flexbox child handling */
  flex: 1;
  min-width: 0; /* Allow shrinking if needed, but flex:1 should distribute space */

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme, $active }) => $active ? `${theme.colors.primary}18` : theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary} !important;
  }

  svg {
    font-size: 0.95rem;
    flex-shrink: 0;
  }
`;
interface SidebarProps {
  onCloseMobile: (skipHistory?: boolean) => void;
  isEditing?: boolean;
  movingWordId?: number | null;
  setMovingWordId?: (id: number | null) => void;
}

export interface SidebarRef {
  handleDragEnd: (result: DropResult) => Promise<void>;
  handleDragStart: () => void;
  handleDragUpdate: (update: DragUpdate) => void;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ onCloseMobile, isEditing = false, movingWordId, setMovingWordId }, ref) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'source-desc' | 'source-asc' | 'comment-desc' | 'alpha' | 'starred'>('date-desc');
  const [starredOnly, setStarredOnly] = useState(false);
  const { studyMode, setStudyMode } = useStudyMode();
  const {
    currentFolderId,
    homeFolder,
    currentFolder,
    subfolders,
    breadcrumbs,
    setShowFolderList,
    navigateToHome,
    navigateToFolder,
    navigateUp
  } = useFolder();


  // Expansion state (now collapsed by default)
  const isNavigatingRef = useRef(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [combineTargetId, setCombineTargetId] = useState<string | null>(null);
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

  const { mode, theme, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useColorTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Handle folder switching: if current word doesn't belong to folder, go back to root
  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }
    let active = true;
    if (id && currentFolderId !== null) {
      db.words.get(Number(id)).then(word => {
        if (active && word && word.folderId !== currentFolderId) {
          navigate('/', { replace: true });
        }
      });
    }
    return () => { active = false; };
  }, [id, currentFolderId, navigate]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

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

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Use useRef to track the latest needRefresh boolean to avoid stale closures in timeouts
  const needRefreshRef = React.useRef(needRefresh);
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

      // Start update check
      await registration.update();

      // Give it a tiny bit of time for state changes to propagate
      await new Promise(resolve => setTimeout(resolve, 800));

      if (registration.waiting || needRefreshRef.current) {
        installUpdate();
      } else if (registration.installing) {
        // Update found and is downloading
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

  const allWords = useLiveQuery(() => db.words.toArray());
  const allSources = useLiveQuery(() => db.sources.toArray());
  const allComments = useLiveQuery(() => db.comments.toArray());

  // Auto-expand thread if active log is in one
  useEffect(() => {
    if (!id || !allWords) return;
    const activeId = Number(id);
    const activeWord = allWords.find(l => l.id === activeId);
    if (activeWord?.threadId && !expandedThreads.has(activeWord.threadId)) {
      setExpandedThreads(prev => {
        const next = new Set(prev);
        next.add(activeWord.threadId!);
        return next;
      });
    }
  }, [id, allWords]);

  // List remount trigger to force clean UI update
  const [listKey, setListKey] = useState(0);

  // Force repaint hack for Mac list refresh issues
  const triggerRefresh = React.useCallback(() => {
    const container = document.getElementById('sidebar-log-list');
    if (container) {
      const currentScroll = container.scrollTop;
      container.scrollTop = currentScroll + 1;
      requestAnimationFrame(() => {
        container.scrollTop = currentScroll;
        // Trigger window resize to force browser recalculation
        window.dispatchEvent(new Event('resize'));
      });
      // Force individual items to drop transforms
      const items = container.querySelectorAll('[data-rbd-draggable-id]');
      items.forEach(el => {
        (el as HTMLElement).style.transform = '';
      });
    }
  }, []);

  useEffect(() => {
    // Only trigger on listKey change (which means a drag actually finished)
    // or on initial mount. Avoid triggering on every data change.
    if (allWords && listKey > 0) {
      triggerRefresh();
    }
  }, [listKey, triggerRefresh]);

  const sourceNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    allSources?.forEach(s => map.set(s.id!, s.name));
    return map;
  }, [allSources]);

  type FlatItem =
    | { type: 'folder-up' }
    | { type: 'folder', folder: Folder }
    | { type: 'single', log: Word }
    | { type: 'thread-header', log: Word, threadId: string, threadWords: Word[] }
    | { type: 'thread-child', log: Word, threadId: string };

  const flatItems: FlatItem[] = React.useMemo(() => {
    if (!allWords || !allSources) return [];

    // 1. Group ALL logs first
    const threadMap = new Map<string, Word[]>();
    const singles: Word[] = [];
    allWords.forEach(l => {
      // Filter by current folder
      if (currentFolderId !== null) {
        const isHome = homeFolder && currentFolderId === homeFolder.id;
        const matchesFolder = isHome ? (l.folderId === currentFolderId || !l.folderId) : l.folderId === currentFolderId;
        if (!matchesFolder) return;
      }

      if (l.threadId) {
        if (!threadMap.has(l.threadId)) threadMap.set(l.threadId, []);
        threadMap.get(l.threadId)!.push(l);
      } else {
        singles.push(l);
      }
    });

    // 2. Filter Groups and Singles
    const isMatched = (l: Word) => {
      // Starred filter
      if (starredOnly && !l.isStarred) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (q.startsWith('tag:')) {
          const tagQuery = q.substring(4).trim();
          return l.tags.some(t => t.toLowerCase().includes(tagQuery)) ||
            (l.sourceId && allSources.find(s => s.id === l.sourceId)?.name.toLowerCase().includes(tagQuery));
        }
        return l.title.toLowerCase().includes(q) || l.tags.some(t => t.toLowerCase().includes(q));
      }
      return true;
    };

    const finalSingles = singles.filter(isMatched);
    const finalThreads = new Map<string, Word[]>();
    threadMap.forEach((logs, tid) => {
      const filtered = logs.filter(isMatched);
      if (filtered.length > 0) {
        finalThreads.set(tid, logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      }
    });

    // 3. Flatten
    const items: FlatItem[] = [];

    // Add "Go Up" button if not in Home folder
    if (currentFolderId !== null && homeFolder && currentFolder && !currentFolder.isHome) {
      items.push({ type: 'folder-up' });
    }

    // Add subfolders
    if (subfolders && subfolders.length > 0) {
      subfolders.forEach(f => {
        items.push({ type: 'folder', folder: f });
      });
    }

    // First, process threads
    finalThreads.forEach((logs, tid) => {
      const sorted = logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      items.push({ type: 'thread-header', log: sorted[0], threadId: tid, threadWords: sorted });
      if (expandedThreads.has(tid)) {
        sorted.slice(1).forEach(l => {
          items.push({ type: 'thread-child', log: l, threadId: tid });
        });
      }
    });

    // Then, add singles
    finalSingles.forEach(l => {
      items.push({ type: 'single', log: l });
    });

    // 4. Sort Flattened List
    const logItems = items.filter(it => 'log' in it) as FlatItem[];
    const folderItems = items.filter(it => !('log' in it)) as FlatItem[];

    const sortedLogs = logItems.sort((a, b) => {
      const aPinnedAt = (a as any).log.pinnedAt || ((a as any).log.id ? justUnpinnedIds.get((a as any).log.id) : undefined);
      const bPinnedAt = (b as any).log.pinnedAt || ((b as any).log.id ? justUnpinnedIds.get((b as any).log.id) : undefined);

      // ... rest of sort logic ...
      if (aPinnedAt && bPinnedAt) return new Date(bPinnedAt).getTime() - new Date(aPinnedAt).getTime();
      if (aPinnedAt) return -1;
      if (bPinnedAt) return 1;

      if (sortBy === 'starred') {
        if ((a as any).log.isStarred && !(b as any).log.isStarred) return -1;
        if (!(a as any).log.isStarred && (b as any).log.isStarred) return 1;
      }
      if (sortBy === 'date-desc') return (b as any).log.createdAt.getTime() - (a as any).log.createdAt.getTime();
      if (sortBy === 'date-asc') return (a as any).log.createdAt.getTime() - (b as any).log.createdAt.getTime();
      if (sortBy === 'source-desc') return (sourceNameMap.get((b as any).log.sourceId!) || '').localeCompare(sourceNameMap.get((a as any).log.sourceId!) || '');
      if (sortBy === 'source-asc') return (sourceNameMap.get((a as any).log.sourceId!) || '').localeCompare(sourceNameMap.get((a as any).log.sourceId!) || '');
      if (sortBy === 'alpha') return (a as any).log.title.localeCompare((b as any).log.title);
      if (sortBy === 'comment-desc') {
        const aCount = allComments?.filter(oc => oc.wordId === (a as any).log.id).length || 0;
        const bCount = allComments?.filter(oc => oc.wordId === (b as any).log.id).length || 0;
        return bCount - aCount;
      }
      return (b as any).log.createdAt.getTime() - (a as any).log.createdAt.getTime();
    });

    return [...folderItems, ...sortedLogs];
  }, [allWords, allSources, allComments, searchQuery, sortBy, starredOnly, expandedThreads, sourceNameMap, justUnpinnedIds, currentFolderId, homeFolder, currentFolder, subfolders]);

  const handleTogglePinLog = async (logId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const log = await db.words.get(logId);
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

      await db.words.update(logId, {
        pinnedAt: log.pinnedAt ? undefined : new Date()
      });
    }
  };

  useEffect(() => {
    if (!id || id === 'new' || id === 'settings') return;

    const activeWordId = parseInt(id);
    if (!isNaN(activeWordId)) {
      const isVisible = flatItems.some(it => ('log' in it) && (it as any).log.id === activeWordId);
      if (!isVisible && (searchQuery || starredOnly)) {
        const exists = allWords?.some(m => m.id === activeWordId);
        if (exists) {
          setSearchQuery('');
          setStarredOnly(false);
          return;
        }
      }
    }

    const timer = setTimeout(() => {
      const element = document.querySelector(`[data - log - id= "${id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [id, flatItems.length]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, combine, draggableId } = result;

    const parseLogId = (dId: string) => {
      if (dId.startsWith('thread-header-')) return Number(dId.replace('thread-header-', ''));
      if (dId.startsWith('log-')) return Number(dId.replace('log-', ''));
      return Number(dId);
    };

    if (!destination && !combine) return;
    setCombineTargetId(null);

    const sourceId = parseLogId(draggableId);
    if (!sourceId || isNaN(sourceId)) return;

    // 0. Handle Folder Drop
    if (destination?.droppableId.startsWith('folder-')) {
      const folderId = parseInt(destination.droppableId.replace('folder-', ''));
      if (!isNaN(folderId)) {
        const sourceWord = await db.words.get(sourceId);
        if (sourceWord) {
          const isThreadHeader = draggableId.startsWith('thread-header-');
          if (isThreadHeader && sourceWord.threadId) {
            // Move entire thread
            const siblings = await db.words.where('threadId').equals(sourceWord.threadId).toArray();
            for (const s of siblings) {
              await db.words.update(s.id!, { folderId, updatedAt: new Date() });
            }
          } else {
            // Move single word
            await db.words.update(sourceId, {
              folderId,
              threadId: undefined,
              threadOrder: undefined,
              updatedAt: new Date()
            });
          }
          setToastMessage(t.sidebar.move_entire_thread);
          setListKey(v => v + 1);
          return;
        }
      }
    }

    // 1. Handle Combination (Merging threads or adding to thread)
    if (combine) {
      const targetId = parseLogId(combine.draggableId);
      if (sourceId === targetId) return;

      const [sourceWord, targetWord] = await Promise.all([
        db.words.get(sourceId),
        db.words.get(targetId)
      ]);

      if (!sourceWord || !targetWord) return;

      const newThreadId = targetWord.threadId || `thread-${Date.now()}`;
      const targetItem = flatItems.find(it => ('log' in it) && (it as any).log.id === targetId);
      const isTargetHeader = targetItem?.type === 'thread-header' || !targetWord.threadId;

      await db.transaction('rw', db.words, async () => {
        // Prepare target if not in thread
        if (!targetWord.threadId) {
          await db.words.update(targetId, {
            threadId: newThreadId,
            threadOrder: 1 // Target moves to 1 to make room for source
          });
        }

        const existingSiblings = await db.words.where('threadId').equals(newThreadId).toArray();
        const sortedSiblings = existingSiblings.sort((a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0));

        // Identify source items
        let sourceItems: Word[] = [sourceWord];
        if (sourceWord.threadId) {
          const sSiblings = await db.words.where('threadId').equals(sourceWord.threadId).toArray();
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
            await db.words.update(newList[i].id!, {
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
            await db.words.update(si.id!, {
              threadId: newThreadId,
              threadOrder: currentMax
            });
          }
        }
        await db.words.update(sourceId, { updatedAt: new Date() });
      });

      setExpandedThreads(prev => new Set([...Array.from(prev), newThreadId]));
      setListKey(v => v + 1);
      return;
    }

    // 2. Handle Reordering
    if (!destination) return;

    const items = flatItems;
    const sourceIndex = source.index;
    const destIndex = destination.index;

    const sourceWord = await db.words.get(sourceId);
    if (!sourceWord) return;

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
    } else if ((prevItem as any)?.log?.threadId && sourceWord.threadId === (prevItem as any).log.threadId) {
      destThreadId = (prevItem as any).log.threadId;
    }

    if (destThreadId) {
      await db.transaction('rw', db.words, async () => {
        const siblings = await db.words.where('threadId').equals(destThreadId!).toArray();
        const sortedSiblings = siblings.sort((a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0));

        const filteredSiblings = sortedSiblings.filter(m => m.id !== sourceId);

        const threadBlockStart = items.findIndex(it => ('log' in it) && it.log.threadId === destThreadId);
        let positionInThread = destIndex - threadBlockStart;

        positionInThread = Math.max(0, Math.min(positionInThread, filteredSiblings.length));

        const newThreadItems = [...filteredSiblings];
        newThreadItems.splice(positionInThread, 0, sourceWord as any);

        for (let i = 0; i < newThreadItems.length; i++) {
          await db.words.update(newThreadItems[i].id!, {
            threadId: destThreadId,
            threadOrder: i
          });
        }
        await db.words.update(sourceId, { updatedAt: new Date() });
      });
      setListKey(v => v + 1);
      return;
    }

    // --- Generic Sort Reordering / Extraction ---
    const logItems = items.filter(it => 'log' in it) as any[];
    let newTime: number;
    if (logItems.length === 0) {
      newTime = Date.now();
    } else {
      // Find where this log would land among other logs
      let beforeLog = null;
      for (let i = destIndex - 1; i >= 0; i--) {
        if ('log' in items[i]) {
          beforeLog = (items[i] as any).log;
          break;
        }
      }
      let afterLog = null;
      for (let i = destIndex; i < items.length; i++) {
        if ('log' in items[i]) {
          afterLog = (items[i] as any).log;
          break;
        }
      }

      if (beforeLog && afterLog) {
        newTime = (beforeLog.createdAt.getTime() + afterLog.createdAt.getTime()) / 2;
      } else if (beforeLog) {
        newTime = beforeLog.createdAt.getTime() - 60000;
      } else if (afterLog) {
        newTime = afterLog.createdAt.getTime() + 60000;
      } else {
        newTime = Date.now();
      }
    }

    await db.words.update(sourceId, {
      threadId: undefined,
      threadOrder: undefined,
      createdAt: new Date(newTime)
    });
    setListKey(v => v + 1);
  };

  const onDragUpdate = (update: DragUpdate) => {
    if (update.combine) {
      setCombineTargetId(update.combine.draggableId);
    } else {
      setCombineTargetId(null);
    }
  };

  const handleMove = async (targetWordId: number) => {
    if (!movingWordId || !setMovingWordId) return;
    if (movingWordId === targetWordId) return;

    try {
      const targetWord = await db.words.get(targetWordId);
      if (!targetWord) return;

      const threadId = targetWord.threadId || `thread-${Date.now()}`;

      if (!targetWord.threadId) {
        await db.words.update(targetWordId, { threadId });
      }

      const siblings = await db.words.where('threadId').equals(threadId).toArray();
      const maxOrder = siblings.reduce((max, m) => Math.max(max, m.threadOrder || 0), 0);

      await db.words.update(movingWordId, {
        threadId,
        threadOrder: maxOrder + 1,
        updatedAt: new Date()
      });

      setMovingWordId(null);
      setToastMessage(t.sidebar.move_success);
      setListKey(v => v + 1);
    } catch (error) {
      console.error("Failed to move word:", error);
    }
  };

  useImperativeHandle(ref, () => ({
    handleDragEnd: async (result: DropResult) => {
      await onDragEnd(result);
    },
    handleDragStart: () => { },
    handleDragUpdate: (update: DragUpdate) => {
      onDragUpdate(update);
    }
  }));

  const formatDate = (date: Date) => format(date, language === 'ko' ? 'yyyy.MM.dd' : 'MMM d, yyyy');

  return (
    <SidebarContainer>
      {movingWordId && (
        <div style={{
          padding: '0.75rem',
          background: theme.colors.primary,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 100
        }}>
          <span>{t.sidebar.select_target}</span>
          <button
            onClick={() => setMovingWordId?.(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
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
            <AppTitle>WordMemo</AppTitle>
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
                onCloseMobile();
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
              $hasStarred={sortBy !== 'starred'}
            />
            {sortBy !== 'starred' && (
              <StarFilterButton
                $active={starredOnly}
                onClick={() => setStarredOnly(!starredOnly)}
                title={starredOnly ? t.sidebar.show_all : t.sidebar.show_starred}
              >
                <FiStar size={16} fill={starredOnly ? theme.colors.primary : 'none'} />
              </StarFilterButton>
            )}
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
              <option value="date-desc">{language === 'ko' ? '최신순' : 'Newest'}</option>
              <option value="date-asc">{language === 'ko' ? '오래된순' : 'Oldest'}</option>
              <option value="alpha">{language === 'ko' ? '제목순' : 'Title A-Z'}</option>
              <option value="starred">{language === 'ko' ? '중요한 것 먼저' : 'Starred First'}</option>
              <option value="comment-desc">{language === 'ko' ? '댓글 많은 순' : 'Most Commented'}</option>
              <option value="source-desc">{language === 'ko' ? '출처 (내림차순)' : 'Source (Desc)'}</option>
              <option value="source-asc">{language === 'ko' ? '출처 (오름차순)' : 'Source (Asc)'}</option>
            </select>
          </div>
        </BrandArea>

        <StickyHeaderArea style={{
          opacity: isEditing ? 0.5 : 1,
          pointerEvents: isEditing ? 'none' : 'auto'
        }}>
          <div style={{ padding: '6px 1rem 2px' }}>
            <StudyModeGroup>
              <StudyModeOption
                $active={studyMode === 'hide-meanings'}
                onClick={() => setStudyMode(studyMode === 'hide-meanings' ? 'none' : 'hide-meanings')}
              >
                {language === 'ko' ? '의미' : 'Meaning'} <FiEyeOff />
              </StudyModeOption>
              <StudyModeOption
                $active={studyMode === 'hide-words'}
                onClick={() => setStudyMode(studyMode === 'hide-words' ? 'none' : 'hide-words')}
              >
                {language === 'ko' ? '단어' : 'Word'} <FiEyeOff />
              </StudyModeOption>
            </StudyModeGroup>
          </div>

          <Header>
            <TopActions>
              <Button onClick={() => {
                navigate('/new', { replace: true, state: { isGuard: true } });
                onCloseMobile(true);
              }}>
                <FiPlus />
                {t.sidebar.new}
              </Button>
            </TopActions>
          </Header>
        </StickyHeaderArea>


        <WordList id="sidebar-log-list" style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>

          <Droppable droppableId="sidebar-droppable" isCombineEnabled>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} key={listKey}>
                {flatItems.map((item, index) => {
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
                      />
                    );
                  }
                  if (item.type === 'thread-header') {
                    return (
                      <SidebarThreadItem
                        key={item.log.id}
                        threadId={item.threadId}
                        logs={item.threadWords}
                        index={index}
                        collapsed={!expandedThreads.has(item.threadId)}
                        onToggle={toggleThread}
                        activeWordId={Number(id)}
                        sourceMap={sourceNameMap}
                        formatDate={formatDate}
                        untitledText={t.sidebar.untitled}
                        onWordClick={() => onCloseMobile(true)}
                        isCombineTarget={combineTargetId === `log-${item.log.id}`}
                        t={t}
                        studyMode={studyMode}
                        onTogglePin={handleTogglePinLog}
                        onMove={handleMove}
                        isMoving={!!movingWordId}
                      />
                    );
                  }
                  return (
                    <SidebarMemoItem
                      key={item.log.id}
                      log={item.log}
                      index={index}
                      isActive={id !== undefined && id !== 'new' && id !== 'settings' && Number(id) === item.log.id}
                      onClick={() => onCloseMobile(true)}
                      formatDate={formatDate}
                      untitledText={t.sidebar.untitled}
                      inThread={item.type === 'thread-child'}
                      isCombineTarget={combineTargetId === `log-${item.log.id}`}
                      studyMode={studyMode}
                      onTogglePin={handleTogglePinLog}
                      onMove={handleMove}
                      isMoving={!!movingWordId}
                    />
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </WordList>
      </ScrollableArea>

      {
        toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
            duration={(toastMessage === t.sidebar.move_success || toastMessage === t.sidebar.move_entire_thread) ? 500 : 2500}
          />
        )
      }

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        adapter={wordMemoSyncAdapter}
        t={t}
        language={language}
      />
      <ScrollTopButton $visible={showScrollTop} onClick={scrollToTop} title={t.common?.scroll_to_top || "Scroll to top"}>
        <FiArrowUp size={20} />
      </ScrollTopButton>
    </SidebarContainer >
  );
});

Sidebar.displayName = 'Sidebar';