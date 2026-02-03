import React, { useState, useEffect } from 'react';
import { SyncModal, useColorTheme, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Log } from '../../db';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiEyeOff, FiStar, FiRefreshCw, FiMinus } from 'react-icons/fi';
import { Tooltip } from '../UI/Tooltip';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult, DragUpdate } from '@hello-pangea/dnd';
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
  width: 26px;
  height: 26px;
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

const LogList = styled.div`
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

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, isEditing = false }) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'source-desc' | 'source-asc' | 'comment-desc' | 'alpha' | 'starred'>('date-desc');
  const [starredOnly, setStarredOnly] = useState(false);
  const { studyMode, setStudyMode } = useStudyMode();

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

  const allLogs = useLiveQuery(() => db.logs.toArray());
  const allSources = useLiveQuery(() => db.sources.toArray());
  const allComments = useLiveQuery(() => db.comments.toArray());

  // Auto-expand thread if active log is in one
  useEffect(() => {
    if (!id || !allLogs) return;
    const activeId = Number(id);
    const activeLog = allLogs.find(l => l.id === activeId);
    if (activeLog?.threadId && !expandedThreads.has(activeLog.threadId)) {
      setExpandedThreads(prev => {
        const next = new Set(prev);
        next.add(activeLog.threadId!);
        return next;
      });
    }
  }, [id, allLogs]);

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
    if (allLogs && listKey > 0) {
      triggerRefresh();
    }
  }, [listKey, triggerRefresh]);

  const sourceNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    allSources?.forEach(s => map.set(s.id!, s.name));
    return map;
  }, [allSources]);

  type FlatItem =
    | { type: 'single', log: Log }
    | { type: 'thread-header', log: Log, threadId: string, threadLogs: Log[] }
    | { type: 'thread-child', log: Log, threadId: string };

  const flatItems: FlatItem[] = React.useMemo(() => {
    if (!allLogs || !allSources) return [];

    // 1. Group ALL logs first
    const threadMap = new Map<string, Log[]>();
    const singles: Log[] = [];
    allLogs.forEach(l => {
      if (l.threadId) {
        if (!threadMap.has(l.threadId)) threadMap.set(l.threadId, []);
        threadMap.get(l.threadId)!.push(l);
      } else {
        singles.push(l);
      }
    });

    // 2. Filter Groups and Singles
    const isMatched = (l: Log) => {
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
    const finalThreads = new Map<string, Log[]>();
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
      items.push({ type: 'thread-header', log: sorted[0], threadId: tid, threadLogs: sorted });
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
        const aCount = allComments?.filter(oc => oc.logId === a.log.id).length || 0;
        const bCount = allComments?.filter(oc => oc.logId === b.log.id).length || 0;
        return bCount - aCount;
      }
      return b.log.createdAt.getTime() - a.log.createdAt.getTime();
    });
  }, [allLogs, allSources, allComments, searchQuery, sortBy, starredOnly, expandedThreads, sourceNameMap]);

  useEffect(() => {
    if (!id || id === 'new' || id === 'settings') return;

    const activeLogId = parseInt(id);
    if (!isNaN(activeLogId)) {
      const isVisible = flatItems.some(it => it.log.id === activeLogId);
      if (!isVisible && (searchQuery || starredOnly)) {
        const exists = allLogs?.some(m => m.id === activeLogId);
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

    // 1. Handle Combination (Merging threads or adding to thread)
    if (combine) {
      const sourceId = Number(draggableId.replace('log-', ''));
      const targetId = Number(combine.draggableId.replace('log-', ''));

      if (sourceId === targetId) return;

      const sourceLog = await db.logs.get(sourceId);
      const targetLog = await db.logs.get(targetId);

      if (!sourceLog || !targetLog) return;

      const targetThreadId = targetLog.threadId || `thread - ${Date.now()} `;

      // If target wasn't in a thread, update it
      if (!targetLog.threadId) {
        await db.logs.update(targetId, { threadId: targetThreadId });
      }

      // If source was in a different thread, move ALL of its siblings
      if (sourceLog.threadId) {
        const siblings = await db.logs.where('threadId').equals(sourceLog.threadId).toArray();
        for (const s of siblings) {
          await db.logs.update(s.id!, { threadId: targetThreadId });
        }
      } else {
        await db.logs.update(sourceId, { threadId: targetThreadId });
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
        await db.logs.update(draggedItem.log.id!, { threadId: undefined });
        setListKey(v => v + 1);
      }
    }
  };

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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem', paddingBottom: '4px' }}>
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
              <FiPlus size={20} />
            </Button>
          </TopActions>
        </Header>

        <LogList id="sidebar-log-list" style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
            <Droppable droppableId="sidebar-droppable" isCombineEnabled>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} key={listKey}>
                  {flatItems.map((item, index) => {
                    if (item.type === 'thread-header') {
                      return (
                        <SidebarThreadItem
                          key={item.log.id}
                          threadId={item.threadId}
                          logs={item.threadLogs}
                          index={index}
                          collapsed={!expandedThreads.has(item.threadId)}
                          onToggle={toggleThread}
                          activeLogId={Number(id)}
                          sourceMap={sourceNameMap}
                          formatDate={formatDate}
                          untitledText={t.sidebar.untitled}
                          onLogClick={onCloseMobile}
                          isCombineTarget={combineTargetId === `log - ${item.log.id} `}
                          t={t}
                          studyMode={studyMode}
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
                        isCombineTarget={combineTargetId === `log - ${item.log.id} `}
                        studyMode={studyMode}
                      />
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </LogList>
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
};