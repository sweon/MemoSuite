import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Log } from '../../db';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiEyeOff, FiStar, FiRefreshCw, FiArrowUpCircle, FiMinus } from 'react-icons/fi';
import { Tooltip } from '../UI/Tooltip';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { SyncModal, useLanguage } from '@memosuite/shared';
import type { DropResult, DragUpdate } from '@hello-pangea/dnd';
import { Toast } from '../UI/Toast';
import { SyncModal, useLanguage } from '@memosuite/shared';
import { wordMemoSyncAdapter } from '../../utils/backupAdapter';
import { useSearch } from '../../contexts/SearchContext';
import { useStudyMode } from '../../contexts/StudyModeContext';
import { format } from 'date-fns';
import { SidebarLogItem } from './SidebarLogItem';
import { StarButton } from './itemStyles';
import { SidebarThreadItem } from './SidebarThreadItem';
import pkg from '../../../package.json';

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
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const BrandHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg} 0`};
`;

const AppTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.colors.text}, ${theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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
  margin-bottom: ${({ theme }) => theme.spacing.sm};
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
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.medium};
  border: none;
  cursor: pointer;
  background: #0072B2;
  color: white;
  flex-shrink: 0;
  transition: ${({ theme }) => theme.effects.transition};
  box-shadow: ${({ theme }) => theme.shadows.small};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.medium};
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
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const LogList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.sm};
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
  padding: 6px;
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: ${({ theme }) => theme.radius.medium};
  border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) => $active ? `${theme.colors.primary}11` : theme.colors.background};
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: ${({ theme }) => theme.effects.transition};
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme, $active }) => $active ? `${theme.colors.primary}18` : theme.colors.surface};
  }

  svg {
    font-size: 0.95rem;
  }
`;


interface SidebarProps {
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { t } = useLanguage();
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
  const location = useLocation();
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
  const [updateCheckedManually, setUpdateCheckedManually] = useState(false);

  // Use useRef to track the latest needRefresh boolean to avoid stale closures in timeouts
  const needRefreshRef = React.useRef(needRefresh);
  useEffect(() => {
    needRefreshRef.current = needRefresh;
  }, [needRefresh]);

  const handleUpdateCheck = async () => {
    if (!updateCheckedManually) {
      setUpdateCheckedManually(true);
      setIsCheckingUpdate(true);
      if (needRefresh) {
        setIsCheckingUpdate(false);
        setToastMessage(t.sidebar.update_found);
        return;
      }
    }

    if (needRefresh) {
      setToastMessage(t.sidebar.install_update);
      setTimeout(() => {
        updateServiceWorker(true);
        setTimeout(() => window.location.reload(), 3000);
      }, 500);
      return;
    }

    if (isCheckingUpdate && updateCheckedManually) return;

    setIsCheckingUpdate(true);
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();

          // Small delay to let the hook catch up
          await new Promise(resolve => setTimeout(resolve, 1500));

          if (registration.waiting || needRefreshRef.current) {
            setToastMessage(t.sidebar.update_found);
          } else {
            setToastMessage(t.sidebar.up_to_date);
          }
        } else {
          setToastMessage(t.sidebar.check_failed);
        }
        setIsCheckingUpdate(false);
        setUpdateCheckedManually(true);
      } catch (error) {
        console.error('Error checking for updates:', error);
        setIsCheckingUpdate(false);
        setToastMessage(t.sidebar.check_failed);
      }
    } else {
      setIsCheckingUpdate(false);
      setToastMessage(t.sidebar.pwa_not_supported);
    }
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

    const finalGroups = new Map<string, Log[]>();
    const finalSingles: Log[] = [];

    // Filter threads: include if ANY member matches the filter
    threadMap.forEach((members, tid) => {
      if (members.some(m => isMatched(m))) {
        finalGroups.set(tid, members);
      }
    });

    // Filter singles
    singles.forEach(l => {
      if (isMatched(l)) {
        finalSingles.push(l);
      }
    });

    // Sort sources
    const sourceOrderMap = new Map<number, number>();
    allSources.forEach(s => sourceOrderMap.set(s.id!, s.order ?? 999));

    finalGroups.forEach(g => g.sort((a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0)));

    type SortableGroup = {
      type: 'single', log: Log, lastDate: Date
    } | {
      type: 'thread', logs: Log[], threadId: string, lastDate: Date
    };

    const sortableGroups: SortableGroup[] = [
      ...finalSingles.map(l => ({ type: 'single' as const, log: l, lastDate: l.createdAt })),
      ...Array.from(finalGroups.entries()).map(([tid, g]) => {
        const latest = g.reduce((p, c) => (new Date(p.createdAt) > new Date(c.createdAt) ? p : c), g[0]);
        return { type: 'thread' as const, logs: g, threadId: tid, lastDate: latest.createdAt };
      })
    ];

    sortableGroups.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      if (sortBy === 'date-asc') return new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime();

      if (sortBy === 'source-desc' || sortBy === 'source-asc') {
        const aLog = a.type === 'single' ? a.log : a.logs[0];
        const bLog = b.type === 'single' ? b.log : b.logs[0];
        const aSourceOrder = aLog.sourceId ? (sourceOrderMap.get(aLog.sourceId) ?? 999) : 999;
        const bSourceOrder = bLog.sourceId ? (sourceOrderMap.get(bLog.sourceId) ?? 999) : 999;

        if (sortBy === 'source-desc') {
          // Lower order number = higher priority = show first
          if (aSourceOrder !== bSourceOrder) return aSourceOrder - bSourceOrder;
          // Same source order: sort by date (newest first)
          return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
        } else {
          // source-asc: Higher order = show first
          if (aSourceOrder !== bSourceOrder) return bSourceOrder - aSourceOrder;
          // Same source order: sort by date (newest first)
          return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
        }
      }

      if (sortBy === 'alpha') {
        const aTitle = (a.type === 'single' ? a.log.title : a.logs[0].title).toLowerCase() || 'z';
        const bTitle = (b.type === 'single' ? b.log.title : b.logs[0].title).toLowerCase() || 'z';
        return aTitle.localeCompare(bTitle);
      }

      if (sortBy === 'starred') {
        const aStarred = a.type === 'single' ? (a.log.isStarred || 0) : (a.logs[0].isStarred || 0);
        const bStarred = b.type === 'single' ? (b.log.isStarred || 0) : (b.logs[0].isStarred || 0);
        if (aStarred !== bStarred) return bStarred - aStarred;
        // If star status is same, fallback to date
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
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
  }, [allLogs, allSources, allComments, searchQuery, sortBy, expandedThreads, starredOnly]);

  const onDragUpdate = (update: DragUpdate) => {
    if (update.combine) {
      setCombineTargetId(update.combine.draggableId);
    } else {
      setCombineTargetId(null);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    setCombineTargetId(null);
    const { source, destination, combine, draggableId } = result;
    if (!combine && (!destination || (source.index === destination.index))) return;

    // Small delay to let library finish its visual drop animation
    // This prevents the "messy" glitch where React and DnD fight over DOM positions
    setTimeout(async () => {
      const parseLogId = (dId: string) => {
        if (dId.startsWith('thread-header-')) return Number(dId.replace('thread-header-', ''));
        if (dId.startsWith('thread-child-')) return Number(dId.replace('thread-child-', ''));
        return Number(dId);
      };

      const sourceId = parseLogId(draggableId);

      if (combine) {
        const targetId = parseLogId(combine.draggableId);
        if (sourceId === targetId) return;

        await db.transaction('rw', db.logs, async () => {
          const sLog = await db.logs.get(sourceId);
          const tLog = await db.logs.get(targetId);
          if (!sLog || !tLog) return;

          if (sLog.threadId && sLog.threadId === tLog.threadId) {
            // Extraction via drop on own thread member
            await db.logs.update(sourceId, { threadId: undefined, threadOrder: undefined });
            // Join existing
            const members = await db.logs.where('threadId').equals(tLog.threadId).toArray();
            members.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0));
            const newIds = members.filter(m => m.id !== sourceId).map(m => m.id!);
            newIds.push(sourceId);
            for (let i = 0; i < newIds.length; i++) {
              await db.logs.update(newIds[i], { threadId: tLog.threadId, threadOrder: i });
            }
          } else {
            // New thread
            const tid = crypto.randomUUID();
            await db.logs.update(targetId, { threadId: tid, threadOrder: 0 });
            await db.logs.update(sourceId, { threadId: tid, threadOrder: 1 });
          }
        });
      } else if (destination) {
        const movedFlatItem = flatItems[source.index];
        if (!movedFlatItem) return;

        const nextList = [...flatItems];
        const [removed] = nextList.splice(source.index, 1);
        nextList.splice(destination.index, 0, removed);

        const prevItem = nextList[destination.index - 1];
        const nextItem = nextList[destination.index + 1];

        const getTid = (item: any) => (item && item.type !== 'single' ? item.threadId : undefined);

        // "Sandwich" rule: Only join a thread if dropped between two members of the same thread.
        // This prevents "sucking" into a thread when dropping at boundaries (e.g. above/below a header).
        // To explicitly join a thread or header, use the "drop on top" (combine) feature.
        let targetThreadId = undefined;
        const prevTid = getTid(prevItem);
        const nextTid = getTid(nextItem);

        if (prevTid && prevTid === nextTid) {
          targetThreadId = prevTid;
        }

        await db.transaction('rw', db.logs, async () => {
          if (targetThreadId) {
            const allMembers = await db.logs.where('threadId').equals(targetThreadId).toArray();
            const threadLogIds = new Set(allMembers.map(m => m.id!));
            threadLogIds.add(sourceId);

            const idsInOrder: number[] = [];
            const seen = new Set<number>();
            nextList.forEach(item => {
              if (threadLogIds.has(item.log.id!) && !seen.has(item.log.id!)) {
                idsInOrder.push(item.log.id!);
                seen.add(item.log.id!);
              }
            });
            allMembers.forEach(m => {
              if (!seen.has(m.id!)) idsInOrder.push(m.id!);
            });

            for (let i = 0; i < idsInOrder.length; i++) {
              await db.logs.update(idsInOrder[i], { threadId: targetThreadId, threadOrder: i });
            }
          } else {
            // Standalone or Extraction
            await db.logs.update(sourceId, { threadId: undefined, threadOrder: undefined });
          }
        });
      }

      // Final punch: increment key to force remount of list and clean up any DnD residual styles
      setListKey(k => k + 1);
      triggerRefresh();
    }, 150);
  };

  const showUpdateIndicator = needRefresh && updateCheckedManually;

  return (
    <SidebarContainer>
      <BrandHeader>
        <AppTitle>WordMemo</AppTitle>
        <AppVersion>v{pkg.version}</AppVersion>
      </BrandHeader>
      <Header>
        <TopActions>
          <Tooltip content={t.sidebar.new}>
            <Button onClick={() => {
              const isDetail = location.pathname !== '/' && location.pathname !== '';
              navigate('/new', { replace: isDetail });
              onCloseMobile();
            }}>
              <FiPlus />
            </Button>
          </Tooltip>
          <div style={{ display: 'flex', gap: '0rem', alignItems: 'center', flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>

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

            <Tooltip content={showUpdateIndicator ? t.sidebar.install_update : t.sidebar.check_updates}>
              <IconButton
                onClick={handleUpdateCheck}
                style={{ position: 'relative' }}
              >
                <FiArrowUpCircle size={18} className={isCheckingUpdate ? 'spin' : ''} />
                {showUpdateIndicator && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    border: '1px solid white'
                  }} />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip content={mode === 'light' ? t.sidebar.switch_dark : t.sidebar.switch_light}>
              <IconButton onClick={toggleTheme}>
                {mode === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
              </IconButton>
            </Tooltip>

            <Tooltip content={t.sidebar.settings}>
              <IconButton onClick={() => {
                const isDetail = location.pathname !== '/' && location.pathname !== '';
                navigate('/settings', { replace: isDetail });
                onCloseMobile();
              }}>
                <FiSettings size={18} />
              </IconButton>
            </Tooltip>
          </div>
        </TopActions>

        <SearchInputWrapper>
          <SearchIcon size={16} />
          <SearchInput
            $hasStarred={true}
            placeholder={t.sidebar.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <StarFilterButton
            $active={starredOnly}
            onClick={() => setStarredOnly(!starredOnly)}
            title={t.sidebar.starred_only}
          >
            <FiStar size={14} fill={starredOnly ? "#f59e0b" : "none"} />
          </StarFilterButton>
          {searchQuery && (
            <ClearButton onClick={() => setSearchQuery('')}>
              <FiX size={14} />
            </ClearButton>
          )}
        </SearchInputWrapper>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              flex: 1,
              padding: window.innerWidth <= 768 ? '8px' : '0.5rem',
              fontSize: window.innerWidth <= 768 ? '14px' : 'inherit',
              borderRadius: '6px',
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.surface,
              color: theme.colors.text
            }}
          >
            <option value="date-desc">{t.sidebar.newest}</option>
            <option value="date-asc">{t.sidebar.oldest}</option>
            <option value="starred">{t.sidebar.sort_starred}</option>
            <option value="alpha">{t.sidebar.alphabetical}</option>
            <option value="source-desc">{t.sidebar.source_newest}</option>
            <option value="source-asc">{t.sidebar.source_oldest}</option>
            <option value="comment-desc">{t.sidebar.last_commented}</option>
          </select>
        </div>

        <div style={{ marginTop: '0.6rem' }}>
          <StudyModeGroup>
            {[
              { value: 'hide-meanings', label: t.sidebar.study_hide_meanings, icon: <FiEyeOff /> },
              { value: 'hide-words', label: t.sidebar.study_hide_words, icon: <FiEyeOff /> }
            ].map((option) => {
              const isActive = studyMode === option.value;
              return (
                <StudyModeOption
                  key={option.value}
                  $active={isActive}
                  title={option.label}
                  onClick={() => {
                    const newVal = (isActive ? 'none' : option.value) as any;
                    setStudyMode(newVal);
                  }}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </StudyModeOption>
              );
            })}
          </StudyModeGroup>
        </div>
      </Header>

      <DragDropContext
        onDragEnd={onDragEnd}
        onDragUpdate={onDragUpdate}
      >
        <Droppable droppableId="root" isCombineEnabled type="LOG_LIST">
          {(provided) => (
            <LogList
              key={`list-${listKey}`}
              id="sidebar-log-list"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <div style={{ display: 'none' }}>{listKey}</div>
              {flatItems.map((item, index) => {
                if (item.type === 'single') {
                  const logId = item.log.id!;
                  return (
                    <SidebarLogItem
                      key={logId}
                      log={item.log}
                      index={index}
                      isActive={Number(id) === logId}
                      onClick={onCloseMobile}
                      sourceName={sourceNameMap.get(item.log.sourceId!)}
                      formatDate={(d: Date) => format(d, 'yy.MM.dd HH:mm')}
                      untitledText={t.sidebar.untitled}
                      isCombineTarget={combineTargetId === String(logId)}
                      studyMode={studyMode}
                    />
                  );
                } else if (item.type === 'thread-header') {
                  const logId = item.log.id!;
                  return (
                    <SidebarThreadItem
                      key={`header-${item.threadId}`}
                      threadId={item.threadId}
                      logs={item.threadLogs}
                      index={index}
                      collapsed={!expandedThreads.has(item.threadId)}
                      onToggle={toggleThread}
                      activeLogId={Number(id)}
                      sourceMap={sourceNameMap}
                      formatDate={(d: Date) => format(d, 'yy.MM.dd HH:mm')}
                      untitledText={t.sidebar.untitled}
                      onLogClick={() => onCloseMobile()}
                      isCombineTarget={combineTargetId === `thread-header-${logId}`}
                      t={t}
                      studyMode={studyMode}
                    />
                  );
                } else if (item.type === 'thread-child') {
                  const logId = item.log.id!;
                  return (
                    <SidebarLogItem
                      key={logId}
                      log={item.log}
                      index={index}
                      isActive={Number(id) === logId}
                      onClick={onCloseMobile}
                      sourceName={sourceNameMap.get(item.log.sourceId!)}
                      formatDate={(d: Date) => format(d, 'yy.MM.dd HH:mm')}
                      untitledText={t.sidebar.untitled}
                      inThread={true}
                      isCombineTarget={combineTargetId === `thread-child-${logId}`}
                      studyMode={studyMode}
                    />
                  );
                }
                return null;
              })}
              {provided.placeholder}
            </LogList>
          )}
        </Droppable>
      </DragDropContext>

      {
        toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )
      }
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        adapter={wordMemoSyncAdapter}
        t={t}
        language={useLanguage().language}
      />
    </SidebarContainer>
  );
};
