import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SyncModal, useColorTheme, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Word } from '../../db';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiEyeOff, FiStar, FiRefreshCw, FiMinus, FiFolder } from 'react-icons/fi';
import { Tooltip } from '../UI/Tooltip';
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
  gap: 6px;
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
  font-size: 0.9rem;
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
  background: #117864;
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
  onCloseMobile: () => void;
  isEditing?: boolean;
}

export interface SidebarRef {
  handleDragEnd: (result: DropResult) => Promise<void>;
  handleDragUpdate: (update: DragUpdate) => void;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ onCloseMobile, isEditing = false }, ref) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'source-desc' | 'source-asc' | 'comment-desc' | 'alpha' | 'starred'>('date-desc');
  const [starredOnly, setStarredOnly] = useState(false);
  const { studyMode, setStudyMode } = useStudyMode();
  const { currentFolderId, currentFolder, setShowFolderList } = useFolder();

  // Expansion state (now collapsed by default)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [combineTargetId, setCombineTargetId] = useState<string | null>(null);

  const toggleThread = (threadId: string) => {
    const newSet = new Set(expandedThreads);
    if (newSet.has(threadId)) newSet.delete(threadId);
    else newSet.add(threadId);
    setExpandedThreads(newSet);
  };

  const { mode, theme, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useColorTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

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
      if (currentFolderId !== null && l.folderId !== currentFolderId) return;

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
    return items.sort((a, b) => {
      // Pinned logic: pinned items always come first, sorted by pinnedAt desc
      if (a.log.pinnedAt && b.log.pinnedAt) return b.log.pinnedAt.getTime() - a.log.pinnedAt.getTime();
      if (a.log.pinnedAt) return -1;
      if (b.log.pinnedAt) return 1;

      if (sortBy === 'starred') {
        if (a.log.isStarred && !b.log.isStarred) return -1;
        if (!a.log.isStarred && b.log.isStarred) return 1;
      }
      if (sortBy === 'date-desc') return b.log.createdAt.getTime() - a.log.createdAt.getTime();
      if (sortBy === 'date-asc') return a.log.createdAt.getTime() - b.log.createdAt.getTime();
      if (sortBy === 'source-desc') return (sourceNameMap.get(b.log.sourceId!) || '').localeCompare(sourceNameMap.get(a.log.sourceId!) || '');
      if (sortBy === 'source-asc') return (sourceNameMap.get(a.log.sourceId!) || '').localeCompare(sourceNameMap.get(b.log.sourceId!) || '');
      if (sortBy === 'alpha') return a.log.title.localeCompare(b.log.title);
      if (sortBy === 'comment-desc') {
        const aCount = allComments?.filter(oc => oc.wordId === a.log.id).length || 0;
        const bCount = allComments?.filter(oc => oc.wordId === b.log.id).length || 0;
        return bCount - aCount;
      }
      return b.log.createdAt.getTime() - a.log.createdAt.getTime();
    });
  }, [allWords, allSources, allComments, searchQuery, sortBy, starredOnly, expandedThreads, sourceNameMap]);

  const handleTogglePinLog = async (logId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const log = await db.words.get(logId);
    if (log) {
      await db.words.update(logId, {
        pinnedAt: log.pinnedAt ? undefined : new Date()
      });
    }
  };

  useEffect(() => {
    if (!id || id === 'new' || id === 'settings') return;

    const activeWordId = parseInt(id);
    if (!isNaN(activeWordId)) {
      const isVisible = flatItems.some(it => it.log.id === activeWordId);
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
    setCombineTargetId(null);

    // 0. Handle Folder Drop
    if (destination?.droppableId.startsWith('folder-')) {
      const folderId = parseInt(destination.droppableId.replace('folder-', ''));
      const wordId = parseInt(draggableId.replace('log-', '')); // draggableId might be 'log-123' based on usage? 
      // Wait, let's check how draggableId is constructed. 
      // In SidebarMemoItem it uses `log-${log.id}`? No, looking at existing code for combine:
      // const sourceId = Number(draggableId.replace('log-', ''));
      // So yes, it has prefix 'log-'.

      if (!isNaN(folderId) && !isNaN(wordId)) {
        // If it's a thread header, move all items in thread?
        const sourceWord = await db.words.get(wordId);
        if (sourceWord) {
          if (sourceWord.threadId) {
            // Check if we dragged the header?
            // The item types are:
            // thread-header: draggableId=`log-${log.id}` (log is the first one)
            // thread-child: draggableId=`log-${log.id}`
            // If we drag a thread header, `type` in Draggable might be different?
            // The existing code doesn't seem to set `type` on Draggable explicitly for thread vs memo, 
            // but let's assume if we drag a header (which is just a word) we move that word.
            // However, user requirement says "dragging their headers" moves entire thread.

            // Let's check if the dragged item corresponds to a thread header in `flatItems`.
            // Actually, finding the word is enough. If I drag a word, I move that word. 
            // BUT if I drag a thread header, I should move the whole thread?
            // existing logic for combine/reorder handles threads.

            // For now, let's move the single word. 
            // Re-reading objective: "This includes moving entire threads by dragging their headers."
            // In HandMemo, I did: if (destination.droppableId.startsWith('folder-')) { ... move thread if needed }

            // Let's implement thread move logic here too.
            const siblings = await db.words.where('threadId').equals(sourceWord.threadId).toArray();

            // Better: Check if `flatItems` says it's a header? 
            // `flatItems` is state derived. 

            // If it has a threadId, we should probably move ALL items in that thread to functionality consistency.
            for (const s of siblings) {
              await db.words.update(s.id!, { folderId, updatedAt: new Date() });
            }
          } else {
            await db.words.update(wordId, { folderId, updatedAt: new Date() });
          }
          setToastMessage(language === 'ko' ? '단어를 이동했습니다.' : 'Moved word.');
          return;
        }
      }
    }

    // 1. Handle Combination (Merging threads or adding to thread)
    if (combine) {
      const sourceId = Number(draggableId.replace('log-', ''));
      const targetId = Number(combine.draggableId.replace('log-', ''));

      if (sourceId === targetId) return;

      const sourceWord = await db.words.get(sourceId);
      const targetWord = await db.words.get(targetId);

      if (!sourceWord || !targetWord) return;

      const targetThreadId = targetWord.threadId || `thread-${Date.now()}`;

      // If target wasn't in a thread, update it
      if (!targetWord.threadId) {
        await db.words.update(targetId, { threadId: targetThreadId });
      }

      // If source was in a different thread, move ALL of its siblings
      if (sourceWord.threadId) {
        const siblings = await db.words.where('threadId').equals(sourceWord.threadId).toArray();
        for (const s of siblings) {
          await db.words.update(s.id!, { threadId: targetThreadId });
        }
      } else {
        await db.words.update(sourceId, { threadId: targetThreadId });
      }

      setExpandedThreads(prev => new Set([...Array.from(prev), targetThreadId]));
      setListKey(v => v + 1);
      return;
    }

    // 2. Handle Reordering (Extraction from thread)
    if (!destination) return;
    if (source.index === destination.index) return;

    const draggedItem = flatItems[source.index];
    if (draggedItem.type === 'thread-child') {
      // If a child is dragged out of its thread boundaries, extract it
      const threadBoundaryIds = flatItems
        .filter(it => (it.type === 'thread-header' || it.type === 'thread-child') && it.threadId === draggedItem.threadId)
        .map(it => it.log.id);

      const targetId = flatItems[destination.index].log.id;

      if (!threadBoundaryIds.includes(targetId)) {
        await db.words.update(draggedItem.log.id!, { threadId: undefined });
        setListKey(v => v + 1);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    handleDragEnd: async (result: DropResult) => {
      await onDragEnd(result);
    },
    handleDragUpdate: (update: DragUpdate) => {
      onDragUpdate(update);
    }
  }));

  const onDragUpdate = (update: DragUpdate) => {
    if (update.combine) {
      setCombineTargetId(update.combine.draggableId);
    } else {
      setCombineTargetId(null);
    }
  };

  const formatDate = (date: Date) => format(date, language === 'ko' ? 'yyyy.MM.dd' : 'MMM d, yyyy');

  return (
    <SidebarContainer>
      <ScrollableArea id="sidebar-scrollable-area">
        <BrandArea>
          <BrandHeader>
            <AppTitle>WordMemo</AppTitle>
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
            <div
              onClick={() => {
                setShowFolderList(true);
                navigate('/folders', { replace: true, state: { isGuard: true } });
                onCloseMobile();
              }}
              style={{
                fontSize: '0.75rem',
                color: currentFolder.isReadOnly ? '#f59e0b' : theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                marginTop: '4px',
                padding: '4px 8px',
                background: theme.colors.background,
                borderRadius: theme.radius.small,
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <FiFolder size={12} style={{ flexShrink: 0 }} />
              <span>{(currentFolder.name === '기본 폴더' || currentFolder.name === 'Default Folder') ? (language === 'ko' ? '기본 폴더' : 'Default Folder') : currentFolder.name}</span>
              {currentFolder.isReadOnly && (
                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                  ({language === 'ko' ? '읽기 전용' : 'Read-only'})
                </span>
              )}
            </div>
          )}

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
                <FiStar size={16} fill={starredOnly ? '#E69F00' : 'none'} />
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
                width: '100%',
                padding: window.innerWidth <= 768 ? '8px' : '0.5rem',
                fontSize: window.innerWidth <= 768 ? '14px' : '0.85rem',
                borderRadius: '6px',
                border: `1px solid ${theme.colors.border} `,
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

          <div>
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
        </BrandArea>

        <Header style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <TopActions>
            <Button onClick={() => {
              navigate('/new', { replace: true, state: { isGuard: true } });
              onCloseMobile();
            }}>
              <FiPlus size={16} />
              {language === 'ko' ? '새 단어' : 'New Word'}
            </Button>

            <Button
              onClick={() => {
                navigate('/folders', { replace: true });
                onCloseMobile();
              }}
              style={{ background: '#f39c12' }}
            >
              <FiFolder size={16} />
              {language === 'ko' ? '폴더' : 'Folders'}
            </Button>
          </TopActions>
        </Header>

        <WordList id="sidebar-log-list" style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <Droppable droppableId="sidebar-droppable" isCombineEnabled>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} key={listKey}>
                {flatItems.map((item, index) => {
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
                        onWordClick={onCloseMobile}
                        isCombineTarget={combineTargetId === `log-${item.log.id}`}
                        t={t}
                        studyMode={studyMode}
                        onTogglePin={handleTogglePinLog}
                      />
                    );
                  }
                  return (
                    <SidebarMemoItem
                      key={item.log.id}
                      log={item.log}
                      index={index}
                      isActive={id !== undefined && id !== 'new' && id !== 'settings' && Number(id) === item.log.id}
                      onClick={onCloseMobile}
                      formatDate={formatDate}
                      untitledText={t.sidebar.untitled}
                      inThread={item.type === 'thread-child'}
                      isCombineTarget={combineTargetId === `log-${item.log.id}`}
                      studyMode={studyMode}
                      onTogglePin={handleTogglePinLog}
                    />
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </WordList>
      </ScrollableArea>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        adapter={wordMemoSyncAdapter}
        t={t}
        language={language}
      />
    </SidebarContainer>
  );
});

Sidebar.displayName = 'Sidebar';