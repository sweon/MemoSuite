import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SyncModal, useColorTheme, useLanguage } from '@memosuite/shared';
import { Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FiPlus, FiSettings, FiSun, FiMoon, FiSearch, FiX, FiRefreshCw, FiMinus, FiCornerDownRight, FiArrowUp } from 'react-icons/fi';
import { BreadcrumbNav } from '../UI/BreadcrumbNav';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Tooltip } from '../UI/Tooltip';

import { useFolder } from '../../contexts/FolderContext';

import { Toast } from '../UI/Toast';

import { useSearch } from '../../contexts/SearchContext';
import { SidebarBookItem } from './SidebarBookItem';
import { bookMemoSyncAdapter } from '../../utils/backupAdapter';

import { ConfirmModal } from '../UI/ConfirmModal';

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
  background: #6C3483;
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

const BookList = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  scrollbar-width: thin;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
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
  movingMemoId?: number | null;
  setMovingMemoId?: (id: number | null) => void;
}

export interface SidebarRef {
  handleDragEnd: (result: DropResult) => Promise<void>;
}

const BrandArea = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.sm}`};
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
  color: #6C3483;
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

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ onCloseMobile, isEditing = false, movingMemoId, setMovingMemoId }, ref) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'last-memo-desc' | 'last-memo-asc' | 'last-comment-desc'>('date-desc');
  const [justUnpinnedIds, setJustUnpinnedIds] = useState<Map<number, Date>>(new Map());
  const [expandedBookIds, setExpandedBookIds] = useState<Set<number>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 300);
  };

  const scrollToTop = () => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBook = (bookId: number) => {
    setExpandedBookIds(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const collapseAllBooks = () => setExpandedBookIds(new Set());

  const { mode, toggleTheme, theme, fontSize, increaseFontSize, decreaseFontSize } = useColorTheme();
  const {
    currentFolderId,
    homeFolder,
    breadcrumbs,
    setShowFolderList,
    navigateToHome,
    navigateToFolder
  } = useFolder();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookId } = useParams<{ bookId: string }>();

  // Handle folder switching: if current book doesn't belong to folder, go back to root
  useEffect(() => {
    if (bookId && currentFolderId !== null) {
      db.books.get(Number(bookId)).then(book => {
        if (book && book.folderId !== currentFolderId) {
          navigate('/', { replace: true });
        }
      });
    }
  }, [currentFolderId, bookId, navigate]);

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    // Check if dropping onto a folder
    if (destination.droppableId.startsWith('folder-')) {
      const folderId = parseInt(destination.droppableId.replace('folder-', ''));
      if (isNaN(folderId)) return;

      const bookId = parseInt(draggableId);
      if (isNaN(bookId)) return;

      await db.books.update(bookId, { folderId, updatedAt: new Date() });
      setToastMessage(language === 'ko' ? '책을 이동했습니다.' : 'Moved book.');
      return;
    }
  };

  const handleMove = async (targetId: number, targetType: 'book' | 'memo') => {
    if (!movingMemoId || !setMovingMemoId) return;
    if (movingMemoId === targetId && targetType === 'memo') return;

    try {
      const memoToMove = await db.memos.get(movingMemoId);
      if (!memoToMove) return;

      if (targetType === 'book') {
        await db.memos.update(movingMemoId, {
          bookId: targetId,
          threadId: undefined,
          threadOrder: undefined,
          updatedAt: new Date()
        });
      } else {
        const targetMemo = await db.memos.get(targetId);
        if (!targetMemo) return;

        const threadId = targetMemo.threadId || crypto.randomUUID();
        if (!targetMemo.threadId) {
          await db.memos.update(targetId, { threadId, threadOrder: 0 });
        }

        const siblings = await db.memos.where('threadId').equals(threadId).toArray();
        const maxOrder = siblings.reduce((max, m) => Math.max(max, m.threadOrder || 0), 0);

        await db.memos.update(movingMemoId, {
          bookId: targetMemo.bookId,
          threadId,
          threadOrder: maxOrder + 1,
          updatedAt: new Date()
        });
      }

      setMovingMemoId(null);
      setToastMessage(language === 'ko' ? '메모를 이동했습니다.' : 'Memo moved.');
    } catch (error) {
      console.error("Failed to move memo:", error);
    }
  };

  useImperativeHandle(ref, () => ({
    handleDragEnd: async (result: DropResult) => {
      await onDragEnd(result);
    }
  }));

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => { } });
  const needRefreshRef = useRef(false);

  const handleSafeNavigation = (action: () => void) => {
    if (location.pathname === '/book/new') {
      setConfirmModal({
        isOpen: true,
        message: language === 'ko' ? '작성 중인 내용이 저장되지 않았습니다. 이동하시겠습니까?' : 'Unsaved changes will be lost. Continue?',
        onConfirm: () => {
          action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      action();
    }
  };

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // No automatic update interval - updates only when user manually checks
    immediate: false,
    onRegistered(r) {
      console.log('SW Registered: ' + r)
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

  const allBooks = useLiveQuery(() => db.books.toArray());
  const allMemos = useLiveQuery(() => db.memos.toArray());
  const allComments = useLiveQuery(() => db.comments.toArray());

  const sortedBooks = React.useMemo(() => {
    if (!allBooks) return [];
    let books = [...allBooks];

    // Filter by folder
    if (currentFolderId !== null) {
      const isHome = homeFolder && currentFolderId === homeFolder.id;
      books = books.filter(b => isHome ? (b.folderId === currentFolderId || !b.folderId) : b.folderId === currentFolderId);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      books = books.filter(b => {
        const bookMatches = b.title.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q);
        if (bookMatches) return true;

        // Check if any memo of this book matches
        const memos = allMemos?.filter(m => m.bookId === b.id) || [];
        return memos.some(m =>
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.tags.some(t => t.toLowerCase().includes(q))
        );
      });
    }

    if (sortBy === 'last-memo-desc') {
      const lastMemoMap = new Map<number, number>();
      allMemos?.forEach(m => {
        if (m.bookId === undefined) return;
        const current = lastMemoMap.get(m.bookId) || 0;
        const mTime = new Date(m.updatedAt).getTime();
        if (mTime > current) lastMemoMap.set(m.bookId, mTime);
      });
      return books.sort((a, b) => (lastMemoMap.get(b.id!) || 0) - (lastMemoMap.get(a.id!) || 0));
    }

    if (sortBy === 'last-comment-desc') {
      const memoToBookMap = new Map<number, number>();
      allMemos?.forEach(m => {
        if (m.id !== undefined && m.bookId !== undefined) {
          memoToBookMap.set(m.id, m.bookId);
        }
      });

      const lastCommentMap = new Map<number, number>();
      allComments?.forEach(c => {
        const bookId = memoToBookMap.get(c.memoId);
        if (bookId !== undefined) {
          const current = lastCommentMap.get(bookId) || 0;
          const cTime = new Date(c.updatedAt).getTime();
          if (cTime > current) lastCommentMap.set(bookId, cTime);
        }
      });
      return books.sort((a, b) => (lastCommentMap.get(b.id!) || 0) - (lastCommentMap.get(a.id!) || 0));
    }

    return books.sort((a, b) => {
      const aPinnedAt = a.pinnedAt || (a.id ? justUnpinnedIds.get(a.id) : undefined);
      const bPinnedAt = b.pinnedAt || (b.id ? justUnpinnedIds.get(b.id) : undefined);

      // Pinned logic: pinned items always come first, sorted by pinnedAt desc
      if (aPinnedAt && bPinnedAt) return new Date(bPinnedAt).getTime() - new Date(aPinnedAt).getTime();
      if (aPinnedAt) return -1;
      if (bPinnedAt) return 1;

      if (sortBy === 'date-desc') return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (sortBy === 'date-asc') return a.updatedAt.getTime() - b.updatedAt.getTime();
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [allBooks, allMemos, allComments, searchQuery, sortBy, justUnpinnedIds, currentFolderId, homeFolder]);

  const handleTogglePinBook = async (bookId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const book = await db.books.get(bookId);
    if (book) {
      if (book.pinnedAt) {
        // preserve position for 500ms
        const oldPinnedAt = book.pinnedAt;
        setJustUnpinnedIds(prev => {
          const next = new Map(prev);
          next.set(bookId, oldPinnedAt);
          return next;
        });
        setTimeout(() => {
          setJustUnpinnedIds(prev => {
            if (!prev.has(bookId)) return prev;
            const next = new Map(prev);
            next.delete(bookId);
            return next;
          });
        }, 1000);
      } else {
        // If pinning, make sure it's removed from recently unpinned list
        setJustUnpinnedIds(prev => {
          if (!prev.has(bookId)) return prev;
          const next = new Map(prev);
          next.delete(bookId);
          return next;
        });
      }

      await db.books.update(bookId, {
        pinnedAt: book.pinnedAt ? undefined : new Date()
      });
    }
  };

  useEffect(() => {
    const parts = location.pathname.split('/');
    const isMemo = parts.includes('memo');
    const targetMemoId = isMemo ? parts[parts.indexOf('memo') + 1] : null;
    const targetBookId = parts[parts.indexOf('book') + 1];

    if (!targetBookId || targetBookId === 'new' || targetBookId === 'settings') return;

    if (searchQuery) {
      const isVisible = sortedBooks.some(b => String(b.id) === targetBookId);
      if (!isVisible) {
        const exists = allBooks?.some(b => String(b.id) === targetBookId);
        if (exists) {
          setSearchQuery('');
          return;
        }
      }
    }

    const timer = setTimeout(() => {
      const element = targetMemoId
        ? document.querySelector(`[data-memo-id="${targetMemoId}"]`)
        : document.querySelector(`[data-book-id="${targetBookId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [location.pathname, sortedBooks.length]);

  return (
    <SidebarContainer>
      {movingMemoId && (
        <div style={{
          padding: '0.75rem',
          background: '#6C3483',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 100
        }}>
          <span>{language === 'ko' ? '이동할 대상을 선택하세요' : 'Select target book or memo'}</span>
          <button
            onClick={() => setMovingMemoId?.(null)}
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
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
        </div>
      )}
      <ScrollableArea id="sidebar-scrollable-area" ref={scrollAreaRef} onScroll={handleScroll}>
        <BrandArea style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <BrandHeader>
            <AppTitle>BookMemo</AppTitle>
            <AppVersion>v{pkg.version}</AppVersion>
          </BrandHeader>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingBottom: '4px' }}>
            <Tooltip content={t.sidebar.collapse_all}>
              <IconButton onClick={collapseAllBooks}>
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
              <option value="last-memo-desc">{t.sidebar.last_memoed}</option>
              <option value="last-comment-desc">{t.sidebar.last_commented}</option>
              <option value="title-asc">Title (A-Z)</option>
            </select>
          </div>
        </BrandArea>

        <Header style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
          <TopActions>
            <Button onClick={() => {
              handleSafeNavigation(() => {
                navigate('/book/new', { replace: true, state: { isGuard: true } });
                onCloseMobile(true);
              });
            }}>
              <FiPlus />
              {language === 'ko' ? '새 책' : 'New Book'}
            </Button>
          </TopActions>
        </Header>


        <Droppable droppableId="sidebar-books" type="BOOK">
          {(provided) => (
            <BookList
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{ opacity: isEditing ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}
            >
              {sortedBooks?.map((book, index) => (
                <Draggable key={book.id} draggableId={String(book.id)} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{ ...provided.draggableProps.style }}
                    >
                      <SidebarBookItem
                        book={book}
                        memos={allMemos?.filter(m => m.bookId === book.id) || []}
                        onClick={onCloseMobile}
                        onSafeNavigate={handleSafeNavigation}
                        onTogglePin={handleTogglePinBook}
                        onMove={(id, type) => handleMove(id, type)}
                        isMoving={!!movingMemoId}
                        isCollapsed={!expandedBookIds.has(book.id!)}
                        onToggle={() => toggleBook(book.id!)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </BookList>
          )}
        </Droppable>
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
        adapter={bookMemoSyncAdapter}
        t={t}
        language={language}
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