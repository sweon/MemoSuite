import React, { useState, useEffect, useRef } from 'react';
import { SyncModal, useModal, useLanguage, prepareThreadForNewItem, buildThreadNavigationUrl, extractThreadContext, PrintSettingsModal } from '@memosuite/shared';

import styled from 'styled-components';
import { useParams, useNavigate, useSearchParams, useOutletContext, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CommentDraft } from '../../db';
import { useSearch } from '../../contexts/SearchContext';
import { useFolder } from '../../contexts/FolderContext';

import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiShare2, FiArrowLeft, FiCalendar, FiGitMerge, FiArrowRightCircle, FiArrowUp, FiArrowDown, FiFolder, FiPrinter, FiCopy } from 'react-icons/fi';
import { format } from 'date-fns';
import { CommentsSection } from './CommentsSection';

import { bookMemoSyncAdapter } from '../../utils/backupAdapter';
import { DeleteChoiceModal } from './DeleteChoiceModal';
import { FolderMoveModal } from '../FolderView/FolderMoveModal';

const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const ScrollContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  width: 100%;
  scroll-padding-top: var(--sticky-offset, 0px);
`;

const GoToTopButton = styled.button<{ $show: boolean }>`
  position: absolute;
  bottom: 32px;
  right: 32px;
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover || theme.colors.primary})`};
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.large || '0 8px 25px rgba(0, 0, 0, 0.2)'};
  z-index: 10000;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transform: scale(${({ $show }) => ($show ? 1 : 0.5)}) translateY(${({ $show }) => ($show ? '0' : '30px')});
  pointer-events: ${({ $show }) => ($show ? 'auto' : 'none')};

  &:hover {
    transform: scale(1.1) translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    bottom: 24px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
`;

const Header = styled.div`
  margin: 0;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.sm}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.xs}`};
  }
`;

const ContentPadding = styled.div`
  padding: ${({ theme }) => `0 ${theme.spacing.md}`};
  flex: 1;

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing.xs};
  }
`;

const CommentsWrapper = styled.div`
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.md}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.xs};
  }
`;

const TitleInput = styled.input`
  font-size: 1.75rem;
  font-weight: 800;
  width: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  letter-spacing: -0.04em;
  
  &:focus {
    outline: none;
  }

  &::placeholder {
    opacity: 0.3;
  }
`;

const TitleDisplay = styled.h1`
  font-size: 1.75rem;
  font-weight: 900;
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.04em;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  flex-wrap: wrap;
  font-weight: 500;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const GoToBottomButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: ${({ theme }) => theme.effects.transition};
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    color: white;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const TagInput = styled.input`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.85rem;
  transition: ${({ theme }) => theme.effects.transition};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
  }
`;

const MetaInput = styled.input`
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
    padding: 6px 12px;
    border-radius: ${({ theme }) => theme.radius.medium};
    width: 90px;
    font-size: 0.85rem;
    transition: ${({ theme }) => theme.effects.transition};

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const DateInput = styled.input`
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
    padding: 6px 36px 6px 12px;
    border-radius: ${({ theme }) => theme.radius.medium};
    width: 210px;
    font-size: 0.85rem;
    transition: ${({ theme }) => theme.effects.transition};

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const InputWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

const CalendarIconButton = styled(FiCalendar)`
    position: absolute;
    right: 10px;
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
    font-size: 1rem;
    transition: color 0.2s;

    &:hover {
        color: ${({ theme }) => theme.colors.primary};
    }
`;

const QuoteInput = styled.textarea`
    width: 100%;
    margin-top: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-left: 4px solid ${({ theme }) => theme.colors.primary};
    border-radius: ${({ theme }) => theme.radius.medium};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-style: italic;
    resize: vertical;
    min-height: 80px;
    font-size: 0.95rem;
    transition: ${({ theme }) => theme.effects.transition};

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
        background: ${({ theme }) => theme.colors.surface};
    }
`;

const QuoteDisplay = styled.div`
    margin-top: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.background};
    border-left: 4px solid ${({ theme }) => theme.colors.primary};
    border-radius: ${({ theme }) => `0 ${theme.radius.medium} ${theme.radius.medium} 0`};
    font-style: italic;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1rem;
    line-height: 1.6;
`;

const ActionBar = styled.div<{ $isEditing?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 5;

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.xs}`};
    ${({ $isEditing }) => $isEditing && "display: none;"}
  }

  @media (max-width: 480px) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: ${({ theme }) => theme.spacing.xs};
    height: auto;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'cancel' | 'pdf' | 'print'; $mobileOrder?: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: 1px solid ${({ theme, $variant }) =>
        $variant === 'primary' ? theme.colors.primary :
            $variant === 'danger' ? theme.colors.border : theme.colors.border};
  background: ${({ theme, $variant }) =>
        $variant === 'primary' ? theme.colors.primary :
            $variant === 'danger' ? 'transparent' : 'transparent'};
  color: ${({ theme, $variant }) =>
        $variant === 'primary' ? '#fff' :
            $variant === 'danger' ? theme.colors.danger :
                $variant === 'cancel' ? theme.colors.textSecondary : theme.colors.text};
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
  transition: ${({ theme }) => theme.effects.transition};

  @media (max-width: 480px) {
    ${({ $mobileOrder }) => $mobileOrder !== undefined && `order: ${$mobileOrder};`}
    &.hide-on-mobile {
      display: none !important;
    }
  }

  &:hover {
    background: ${({ theme, $variant }) =>
        $variant === 'primary' ? theme.colors.primaryHover :
            $variant === 'danger' ? `${theme.colors.danger}08` :
                $variant === 'cancel' ? `${theme.colors.textSecondary}08` : theme.colors.background};
    transform: translateY(-1px);
    ${({ theme, $variant }) => $variant === 'danger' && `border-color: ${theme.colors.danger};`}
    ${({ theme, $variant }) => $variant === 'cancel' && `border-color: ${theme.colors.textSecondary};`}
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

const formatDateForInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

import { useExitGuard, ExitGuardResult, FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';
import { Toast } from '../UI/Toast';
import { FiAlertTriangle } from 'react-icons/fi';

export const MemoDetail: React.FC = () => {
    const { id, bookId } = useParams<{ id: string, bookId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { setSearchQuery } = useSearch();
    const { t, language } = useLanguage();
    const { choice, prompt: modalPrompt } = useModal();
    const isNew = !id;

    // Guard Hook
    const { registerGuard, unregisterGuard } = useExitGuard();
    const [showExitToast, setShowExitToast] = useState(false);
    const lastBackPress = useRef(0);
    const isClosingRef = useRef(false);


    const [isEditingInternal, setIsEditingInternal] = useState(isNew);
    const [showGoToTop, setShowGoToTop] = useState(false);
    const [prevScrollRatio, setPrevScrollRatio] = useState<number | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);

    const [headerHeight, setHeaderHeight] = useState(0);
    const actionBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!actionBarRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setHeaderHeight(entry.contentRect.height);
            }
        });
        observer.observe(actionBarRef.current);
        return () => observer.disconnect();
    }, [isEditingInternal]); // re-observe when editing toggles as action bar content changes

    const startEditing = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            const ratio = scrollTop / (scrollHeight - clientHeight || 1);
            setPrevScrollRatio(ratio);
        }
        setIsEditingInternal(true);
        window.history.pushState({ editing: true, isGuard: true }, '');
    };

    // Track Sidebar interactions via t parameter to ensure stable modal opening
    const tParam = searchParams.get('t');
    const prevTParam = useRef<string | null>(null);
    const currentAutosaveIdRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        currentAutosaveIdRef.current = undefined;
        restoredIdRef.current = null;
        setCommentDraft(null);
        setIsEditingInternal(!id);
        isClosingRef.current = false;

        // Reset state to avoid stale data when switching memos
        setTitle('');
        setContent('');
        setTags('');
    }, [id]);

    useEffect(() => {
        if (tParam && tParam !== prevTParam.current) {
            prevTParam.current = tParam;

            // Reset editing states for fresh requests
            setEditingDrawingData(undefined);
            setEditingSpreadsheetData(undefined);

            if (isNew) {
                setContent('');
                setTitle('');
                setTags('');
                setQuote('');
                setPageNumber('');
            }

            // Re-trigger modal if URL state indicates it should be open
            if (searchParams.get('drawing') === 'true') {
                fabricCheckpointRef.current = content;
                setIsFabricModalOpen(true);
            }
            if (searchParams.get('spreadsheet') === 'true') {
                setIsSpreadsheetModalOpen(true);
            }
        }
    }, [tParam, searchParams, isNew]);

    // Recover spreadsheet data from navigation state if available (e.g. after initial save of new memo)
    useEffect(() => {
        if (location.state?.spreadsheetData && location.state?.spreadsheetJson) {
            setEditingSpreadsheetData(location.state.spreadsheetData);
            originalSpreadsheetJsonRef.current = location.state.spreadsheetJson;
            setIsSpreadsheetModalOpen(true);
        }
    }, [location.state]);

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isFolderMoveModalOpen, setIsFolderMoveModalOpen] = useState(false);
    const [folderMoveToast, setFolderMoveToast] = useState<string | null>(location.state?.toastMessage || null);
    const [editingDrawingData, setEditingDrawingData] = useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = useState<any>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (id && searchParams.get('drawing') === 'true') {
            setIsFabricModalOpen(true);
        }
        if (id && searchParams.get('spreadsheet') === 'true') {
            setIsSpreadsheetModalOpen(true);
        }
    }, [id]);
    const fabricCheckpointRef = useRef<string | null>(null);
    const spreadsheetCheckpointRef = useRef<string | null>(null);
    const originalSpreadsheetJsonRef = useRef<string | null>(null); // Store original JSON string for accurate matching

    const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
    const commentDraftRef = useRef<CommentDraft | null>(null);
    useEffect(() => { commentDraftRef.current = commentDraft; }, [commentDraft]);
    const restoredIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (isEditingInternal) {
            const guardId = 'memo-edit-guard';

            registerGuard(guardId, () => {
                if (isFabricModalOpen || isSpreadsheetModalOpen || isShareModalOpen || isDeleteModalOpen) {
                    return ExitGuardResult.CONTINUE;
                }

                if (isClosingRef.current || !isCurrentlyDirty) {
                    setIsEditingInternal(false);
                    currentAutosaveIdRef.current = undefined;
                    restoredIdRef.current = null;
                    return ExitGuardResult.ALLOW_NAVIGATION;
                }

                const now = Date.now();
                if (now - lastBackPress.current < 2000) {
                    isClosingRef.current = true;
                    setIsEditingInternal(false);
                    currentAutosaveIdRef.current = undefined;
                    restoredIdRef.current = null;
                    return ExitGuardResult.ALLOW_NAVIGATION;
                } else {
                    lastBackPress.current = now;
                    setShowExitToast(true);
                    return ExitGuardResult.PREVENT_NAVIGATION;
                }
            });

            return () => unregisterGuard(guardId);
        }
    }, [isEditingInternal, registerGuard, unregisterGuard, isFabricModalOpen, isShareModalOpen, isDeleteModalOpen]);

    const isEditing = isEditingInternal;
    const setIsEditing = (val: boolean) => {
        if (val === isEditingInternal) return;
        if (val) startEditing();
        else handleExit();
    };

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [date, setDate] = useState('');
    const [pageNumber, setPageNumber] = useState('');
    const [quote, setQuote] = useState('');

    const [prevId, setPrevId] = useState(id);
    if (id !== prevId) {
        setPrevId(id);
        setTitle('');
        setContent('');
        setTags('');
        setQuote('');
        setPageNumber('');
        setCommentDraft(null);
        setIsEditingInternal(!id);
        isClosingRef.current = false;

        if (id && bookId) {
            localStorage.setItem('bookmemo_last_memo_id', id);
            localStorage.setItem('bookmemo_last_book_id', bookId);
        }
    }



    const handleGoToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGoToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        }
    };
    const { currentFolderId } = useFolder();
    const { setIsDirty, setAppIsEditing, movingMemoId, setMovingMemoId } = useOutletContext<{
        setIsDirty: (d: boolean) => void;
        setAppIsEditing: (e: boolean) => void;
        movingMemoId?: number | null;
        setMovingMemoId?: (id: number | null) => void;
    }>() || {};



    // Memoize drawing data extraction to prevent unnecessary re-computations or modal glitches
    const contentDrawingData = React.useMemo(() => {
        const match = content.match(/```fabric\s*([\s\S]*?)\s*```/);
        return match ? match[1] : undefined;
    }, [content]);

    const memo = useLiveQuery(
        () => (id ? db.memos.get(Number(id)) : undefined),
        [id]
    );

    const book = useLiveQuery(
        () => (bookId ? db.books.get(Number(bookId)) : (memo?.bookId ? db.books.get(memo.bookId) : undefined)),
        [bookId, memo]
    );

    const hasDraftChanges = !!commentDraft;
    const isCurrentlyDirty = !!(isNew
        ? (title.trim() || content.trim() || tags.trim() || quote.trim() || pageNumber.trim() || hasDraftChanges)
        : (!!memo && (
            (title || '').trim() !== (memo.title || '').trim() ||
            (content || '') !== (memo.content || '') ||
            (tags || '').trim() !== (memo.tags.join(', ') || '').trim() ||
            (quote || '').trim() !== (memo.quote || '').trim() ||
            (pageNumber || '').trim() !== (memo.pageNumber?.toString() || '').trim() ||
            hasDraftChanges
        )));

    useEffect(() => {
        if (setIsDirty) setIsDirty(isEditing || hasDraftChanges);
        if (setAppIsEditing) setAppIsEditing(isEditing);
        return () => {
            if (setIsDirty) setIsDirty(false);
            if (setAppIsEditing) setAppIsEditing(false);
        };
    }, [isEditing, hasDraftChanges, setIsDirty, setAppIsEditing]);

    // scroll 이벤트 리스너 등록 (memo가 로드된 후)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setShowGoToTop(container.scrollTop > 300);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [memo]);

    const loadedIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (id && memo && memo.id !== Number(id)) return;
        if (memo && memo.id === Number(id) && loadedIdRef.current !== id) {
            const loadData = async () => {
                const tagsStr = memo.tags.join(', ');

                // Check for autosave for initial display
                const existing = await db.autosaves
                    .where('originalId')
                    .equals(Number(id))
                    .reverse()
                    .sortBy('createdAt');

                let initialTitle = memo.title;
                let initialContent = memo.content;
                let initialTagsStr = tagsStr;
                let initialPageNumber = memo.pageNumber?.toString() || '';
                let initialQuote = memo.quote || '';
                let initialCommentDraft: CommentDraft | null = null;

                if (existing.length > 0) {
                    const draft = existing[0];
                    initialTitle = draft.title;
                    initialContent = draft.content;
                    initialTagsStr = draft.tags.join(', ');
                    initialPageNumber = draft.pageNumber?.toString() || '';
                    initialQuote = draft.quote || '';
                    initialCommentDraft = draft.commentDraft || null;

                    // Resume autosave session and mark as restored
                    currentAutosaveIdRef.current = draft.id;
                    restoredIdRef.current = id || null;
                }

                setTitle(initialTitle);
                setContent(initialContent);
                setTags(initialTagsStr);
                setPageNumber(initialPageNumber);
                setQuote(initialQuote);
                setDate(language === 'ko' ? format(memo.createdAt, 'yyyy. MM. dd.') : formatDateForInput(memo.createdAt));
                setCommentDraft(initialCommentDraft);

                // Initialize lastSavedState with initial values
                lastSavedState.current = {
                    title: initialTitle,
                    content: initialContent,
                    tags: initialTagsStr,
                    pageNumber: initialPageNumber,
                    quote: initialQuote,
                    commentDraft: initialCommentDraft
                };
                loadedIdRef.current = id || null;
            };
            loadData();
        }

        if (memo) {
            const shouldEdit = searchParams.get('edit') === 'true';
            if (shouldEdit && !isEditing) {
                setIsEditing(true);
                const params = new URLSearchParams(searchParams);
                params.delete('edit');
                const search = params.toString();
                navigate({
                    pathname: location.pathname,
                    search: search ? `?${search}` : '',
                }, { replace: true, state: { editing: true, isGuard: true } });
            }

            // Restoration for existing memo: Automatically update state without asking
            const checkExistingAutosave = async () => {
                if (!isEditing && !shouldEdit && !searchParams.get('comment') && searchParams.get('restore') !== 'true') return;

                // Don't restore if we already restored/checked in this edit session
                if (isEditing && restoredIdRef.current === id) return;

                const existing = await db.autosaves
                    .where('originalId')
                    .equals(Number(id))
                    .reverse()
                    .sortBy('createdAt');

                if (existing.length > 0) {
                    const draft = existing[0];
                    const hasMemoChanges = draft.content !== memo.content || draft.title !== memo.title;
                    const hasCommentDraft = !!draft.commentDraft;

                    if (hasMemoChanges || hasCommentDraft) {
                        setTitle(draft.title);
                        setContent(draft.content);
                        const tagsStr = draft.tags.join(', ');
                        setTags(tagsStr);
                        setPageNumber(draft.pageNumber?.toString() || '');
                        setQuote(draft.quote || '');
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
                            pageNumber: draft.pageNumber?.toString() || '',
                            quote: draft.quote || '',
                            commentDraft: draft.commentDraft || null
                        };
                    }
                }
                if (isEditing) restoredIdRef.current = id || null;
            };
            checkExistingAutosave();

        } else if (isNew && loadedIdRef.current !== 'new') {
            const threadContext = extractThreadContext(searchParams);
            setTitle('');
            setContent('');
            setTags(threadContext?.inheritedTags?.join(', ') || '');
            const p = threadContext?.inheritedPageNumber?.toString() || searchParams.get('page');
            setPageNumber(p || '');
            setQuote('');
            setEditingDrawingData(undefined);
            setEditingSpreadsheetData(undefined);
            setCommentDraft(null);
            setDate(language === 'ko' ? format(new Date(), 'yyyy. MM. dd.') : formatDateForInput(new Date()));
            setIsEditing(true);
            loadedIdRef.current = 'new';

            if (searchParams.get('drawing') === 'true') {
                setIsFabricModalOpen(true);
            }
            if (searchParams.get('spreadsheet') === 'true') {
                setIsSpreadsheetModalOpen(true);
            }

            // Restoration for new memo: Automatically restore to editor state without asking
            const checkNewAutosave = async () => {
                const targetBookId = bookId ? Number(bookId) : undefined;
                const latest = await db.autosaves
                    .filter(a => a.originalId === undefined && a.bookId === targetBookId)
                    .reverse()
                    .sortBy('createdAt');

                if (latest.length > 0) {
                    const draft = latest[0];
                    if (draft.content.trim() || draft.title.trim() || draft.commentDraft) {
                        setTitle(draft.title);
                        setContent(draft.content);
                        const tagsStr = draft.tags.join(', ');
                        setTags(tagsStr);
                        setPageNumber(draft.pageNumber?.toString() || '');
                        setQuote(draft.quote || '');
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
                            pageNumber: draft.pageNumber?.toString() || '',
                            quote: draft.quote || '',
                            commentDraft: draft.commentDraft || null
                        };
                    }
                }
            };
            checkNewAutosave();
        }
    }, [memo, isNew, searchParams, language, id, bookId, isEditing]);

    useEffect(() => {
        if (isNew && book?.currentPage && !searchParams.get('page')) {
            setPageNumber(prev => (prev === '' ? book.currentPage!.toString() : prev));
        }
    }, [isNew, book?.currentPage, searchParams]);

    const lastSavedState = useRef({ title, content, tags, pageNumber, quote, commentDraft });

    const currentStateRef = useRef({ title, content, tags, pageNumber, quote, commentDraft });
    useEffect(() => {
        currentStateRef.current = { title, content, tags, pageNumber, quote, commentDraft };
    }, [title, content, tags, pageNumber, quote, commentDraft]);

    useEffect(() => {
        const isEditingAnything = isEditing || isFabricModalOpen || isSpreadsheetModalOpen || !!commentDraft;
        if (!isEditingAnything) return;

        const interval = setInterval(async () => {
            const { title: cTitle, content: cContent, tags: cTags, pageNumber: cPageNumber, quote: cQuote, commentDraft: cCommentDraft } = currentStateRef.current;
            const currentTagArray = cTags.split(',').map(t => t.trim()).filter(Boolean);
            const lastTagArray = lastSavedState.current.tags.split(',').map(t => t.trim()).filter(Boolean);

            const hasChanged = cTitle !== lastSavedState.current.title ||
                cContent !== lastSavedState.current.content ||
                String(cPageNumber) !== String(lastSavedState.current.pageNumber) ||
                cQuote !== lastSavedState.current.quote ||
                JSON.stringify(currentTagArray) !== JSON.stringify(lastTagArray) ||
                JSON.stringify(cCommentDraft) !== JSON.stringify(lastSavedState.current.commentDraft);

            if (!hasChanged) return;
            if (!cTitle.trim() && !cContent.trim() && !cCommentDraft) return;

            const numericOriginalId = id ? Number(id) : undefined;

            if (numericOriginalId && !currentAutosaveIdRef.current) {
                await db.autosaves.where('originalId').equals(numericOriginalId).delete();
            }

            const autosaveData: any = {
                originalId: numericOriginalId,
                bookId: bookId ? Number(bookId) : memo?.bookId,
                title: cTitle,
                content: cContent,
                tags: currentTagArray,
                pageNumber: cPageNumber ? parseInt(cPageNumber, 10) : undefined,
                quote: cQuote,
                commentDraft: cCommentDraft || undefined,
                createdAt: new Date()
            };

            if (currentAutosaveIdRef.current) {
                autosaveData.id = currentAutosaveIdRef.current;
            }

            const newId = await db.autosaves.put(autosaveData);
            currentAutosaveIdRef.current = newId;
            lastSavedState.current = { title: cTitle, content: cContent, tags: cTags, pageNumber: cPageNumber, quote: cQuote, commentDraft: cCommentDraft };

            // Keep only latest 20 autosaves
            const allAutosaves = await db.autosaves.orderBy('createdAt').toArray();
            if (allAutosaves.length > 20) {
                const toDelete = allAutosaves.slice(0, allAutosaves.length - 20);
                await db.autosaves.bulkDelete(toDelete.map(a => a.id!));
            }
        }, 7000); // 7 seconds

        return () => clearInterval(interval);
    }, [id, isEditing, isFabricModalOpen, isSpreadsheetModalOpen, !!commentDraft, bookId]); // Removed memo dependency to prevent interval reset on DB updates

    const handleSave = async (overrideTitle?: string, overrideContent?: string, overrideSearch?: string, overrideState?: any) => {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        const now = new Date();
        const pNum = pageNumber ? parseInt(pageNumber, 10) : undefined;
        const targetBookId = bookId ? Number(bookId) : memo?.bookId;
        const currentContent = overrideContent !== undefined ? overrideContent : content;
        let finalTitle = (overrideTitle !== undefined ? overrideTitle : title).trim();
        const untitled = t.memo_detail.untitled;

        // Treat as untitled if empty OR matches the placeholder
        const isCurrentlyUntitled = !finalTitle || finalTitle === untitled;

        const hasContent = !!currentContent.trim();
        const hasQuote = !!quote.trim();
        const hasPage = pNum !== undefined;

        if (isCurrentlyUntitled) {
            const contentText = currentContent.trim();
            const quoteText = quote.trim();
            let contentFallback = '';

            if (contentText) {
                const filteredText = contentText.replace(/```[\s\S]*?```/g, '').trim();
                if (filteredText) {
                    contentFallback = filteredText.slice(0, 30) + (filteredText.length > 30 ? '...' : '');
                } else if (contentText.startsWith('```fabric')) {
                    contentFallback = language === 'ko' ? '그림' : 'Drawing';
                }
            } else if (quoteText) {
                contentFallback = quoteText.slice(0, 30) + (quoteText.length > 30 ? '...' : '');
            } else if (hasPage && !hasContent) {
                contentFallback = "Progress Record";
            }

            finalTitle = contentFallback || untitled;
        }

        let finalType: 'normal' | 'progress' = (finalTitle === "Progress Record") ? 'progress' : 'normal';

        if (!finalTitle && !hasContent && !hasQuote && !hasPage) return;
        if (hasQuote && !hasPage) return;

        if (targetBookId && pNum) {
            const b = await db.books.get(targetBookId);
            if (b) {
                const updates: any = {};
                if ((b.currentPage || 0) < pNum) {
                    updates.currentPage = pNum;
                }
                if (pNum >= b.totalPages && b.status !== 'completed') {
                    updates.status = 'completed';
                    updates.completedDate = now;
                }
                if (Object.keys(updates).length > 0) {
                    await db.books.update(targetBookId, updates);
                }
            }
        }

        let memoCreatedAt: Date;
        if (language === 'ko' && /^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?$/.test(date)) {
            const parts = date.split('.').map(s => s.trim()).filter(Boolean);
            memoCreatedAt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const oldDate = memo?.createdAt || new Date();
            memoCreatedAt.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
        } else {
            memoCreatedAt = new Date(date + 'T' + format(memo?.createdAt || new Date(), 'HH:mm:ss'));
        }

        if (isNaN(memoCreatedAt.getTime())) {
            memoCreatedAt = new Date();
        }

        if (id) {
            await db.memos.update(Number(id), {
                title: finalTitle,
                content: currentContent,
                tags: tagArray,
                pageNumber: pNum,
                quote,
                createdAt: memoCreatedAt,
                updatedAt: now,
                type: finalType
            });

            if (searchParams.get('edit') && !isFabricModalOpen && !isSpreadsheetModalOpen) {
                navigate(`/book/${targetBookId}/memo/${id}`, { replace: true });
            }
            // Cleanup autosaves for this memo
            await db.autosaves.where('originalId').equals(Number(id)).delete();
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            // setIsEditing(false); // Do not exit edit mode on save
        } else {
            const threadContext = extractThreadContext(searchParams);

            const newId = await db.memos.add({
                folderId: threadContext?.inheritedFolderId ?? currentFolderId ?? undefined,
                bookId: threadContext?.inheritedBookId ?? targetBookId,
                title: finalTitle,
                content: currentContent,
                tags: threadContext?.inheritedTags ?? tagArray,
                pageNumber: threadContext?.inheritedPageNumber ?? pNum,
                quote,
                createdAt: memoCreatedAt,
                updatedAt: now,
                type: finalType,
                threadId: threadContext?.threadId,
                threadOrder: threadContext?.threadOrder
            });

            // Cleanup all new memo autosaves
            await db.autosaves.filter(a => a.originalId === undefined).delete();

            const search = overrideSearch !== undefined ? overrideSearch : searchParams.toString();
            navigate(`/book/${targetBookId}/memo/${newId}${search ? '?' + search : ''}`, { replace: true, state: overrideState });
        }
    };

    const handleAddThread = async () => {
        if (!memo || !id || !bookId) return;

        try {
            const context = await prepareThreadForNewItem({
                currentItem: memo,
                currentId: Number(id),
                table: db.memos
            });

            const enrichedContext = {
                ...context,
                inheritedBookId: Number(bookId),
                inheritedPageNumber: memo.pageNumber
            };

            const url = buildThreadNavigationUrl(`/book/${bookId}/new`, enrichedContext, { edit: 'true' });
            navigate(url, { replace: true, state: { isGuard: true } });
        } catch (error) {
            console.error("Failed to add thread:", error);
        }
    };

    const handleCopy = async () => {
        if (!memo || !id) return;

        try {
            const context = await prepareThreadForNewItem({
                currentItem: memo,
                currentId: Number(id),
                table: db.memos
            });

            const now = new Date();
            const newId = await db.memos.add({
                bookId: memo.bookId,
                folderId: memo.folderId,
                pageNumber: memo.pageNumber,
                quote: memo.quote,
                title: memo.title,
                content: memo.content,
                tags: [...memo.tags],
                createdAt: now,
                updatedAt: now,
                type: memo.type,
                threadId: context.threadId,
                threadOrder: context.threadOrder,
                order: memo.order,
                parentId: memo.parentId
            });

            // Copy comments
            const comments = await db.comments.where('memoId').equals(Number(id)).toArray();
            for (const comment of comments) {
                await db.comments.add({
                    memoId: newId,
                    content: comment.content,
                    createdAt: now,
                    updatedAt: now
                });
            }

            const targetBookId = bookId ? Number(bookId) : memo.bookId;
            navigate(`/book/${targetBookId}/memo/${newId}`);
        } catch (error) {
            console.error("Failed to copy memo:", error);
            await confirm("Failed to copy memo. Please try again.");
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setIsDeleteModalOpen(true);
    };

    const performDeleteMemoOnly = async () => {
        if (!id) return;
        setIsDeleting(true);

        await db.memos.delete(Number(id));
        await db.comments.where('memoId').equals(Number(id)).delete();

        setIsDeleteModalOpen(false);
        // Always clear last memo ID and navigate to empty state after deletion as requested
        localStorage.removeItem('bookmemo_last_memo_id');
        localStorage.removeItem('bookmemo_last_book_id'); // Clear book too if going to home

        navigate('/', { replace: true });
    };

    const handleExit = async () => {
        if (!isCurrentlyDirty) {
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            isClosingRef.current = true;
            setIsEditingInternal(false);

            if (isNew) {
                navigate('/', { replace: true });
            } else if (searchParams.get('edit')) {
                const targetBookId = bookId ? Number(bookId) : memo?.bookId;
                navigate(`/book/${targetBookId}/memo/${id}`, { replace: true });
            } else {
                window.history.back();
            }
            return;
        }

        const result = await (choice as any)({
            message: language === 'ko' ? "저장되지 않은 변경사항이 있습니다. 어떻게 할까요?" : "You have unsaved changes. What would you like to do?",
            confirmText: language === 'ko' ? "저장 및 종료" : "Save and Exit",
            neutralText: language === 'ko' ? "저장하지 않고 종료" : "Exit without Saving",
            cancelText: language === 'ko' ? "취소" : "Cancel"
        });

        if (result === 'confirm') {
            await handleSave();
            isClosingRef.current = true;
            setIsEditingInternal(false);
            if (isNew) {
                navigate('/', { replace: true });
            } else if (searchParams.get('edit')) {
                const targetBookId = bookId ? Number(bookId) : memo?.bookId;
                navigate(`/book/${targetBookId}/memo/${id}`, { replace: true });
            } else {
                window.history.back();
            }
        } else if (result === 'neutral') {
            if (id) {
                await db.autosaves.where('originalId').equals(Number(id)).delete();
            } else {
                await db.autosaves.filter(a => a.originalId === undefined).delete();
            }
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            isClosingRef.current = true;
            setIsEditingInternal(false);

            if (isNew) {
                navigate('/', { replace: true });
            } else {
                if (memo) {
                    setTitle(memo.title);
                    setContent(memo.content);
                    setTags(memo.tags.join(', '));
                    setPageNumber(memo.pageNumber?.toString() || '');
                    setQuote(memo.quote || '');
                    setDate(language === 'ko' ? format(memo.createdAt, 'yyyy. MM. dd.') : format(memo.createdAt, 'yyyy-MM-dd'));
                    setCommentDraft(null);
                }
                if (searchParams.get('edit')) {
                    const targetBookId = bookId ? Number(bookId) : memo?.bookId;
                    navigate(`/book/${targetBookId}/memo/${id}`, { replace: true });
                } else {
                    window.history.back();
                }
            }
        }
    };

    if (isDeleting || (!isNew && !memo)) {
        if (isDeleting) return null;
        return <ScrollContainer>{t.memo_detail.loading}</ScrollContainer>;
    }

    return (
        <MainWrapper>
            <ScrollContainer
                ref={containerRef}
                style={{ '--sticky-offset': headerHeight ? `${headerHeight}px` : undefined } as React.CSSProperties}
            >
                <Header>
                    {book && (
                        <div
                            className="back-to-book"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', color: '#666' }}
                            onClick={() => navigate(`/book/${book.id}`)}
                        >
                            <style>{`
                                @media (max-width: 768px) {
                                    .back-to-book { display: none !important; }
                                }
                            `}</style>
                            <FiArrowLeft /> Back to {book.title}
                        </div>
                    )}

                    {isEditing ? (
                        <TitleInput
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t.memo_detail.title_placeholder}
                        />
                    ) : (
                        <TitleDisplay>{memo?.title}</TitleDisplay>
                    )}

                    <HeaderRow>
                        <MetaRow>
                            {isEditing ? (
                                <>
                                    <MetaInput
                                        type="number"
                                        value={pageNumber}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setPageNumber(val);
                                                return;
                                            }
                                            const num = parseInt(val, 10);
                                            if (book && book.totalPages && num > book.totalPages) {
                                                return;
                                            }
                                            setPageNumber(val);
                                        }}
                                        placeholder="Page"
                                    />

                                    <InputWrapper>
                                        <DateInput
                                            type={language === 'ko' ? 'text' : 'date'}
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            placeholder={language === 'ko' ? 'YYYY. MM. DD.' : undefined}
                                        />
                                        <CalendarIconButton
                                            onClick={() => {
                                                const picker = document.getElementById('memo-date-picker');
                                                if (picker) (picker as any).showPicker?.() || picker.click();
                                            }}
                                        />
                                        <input
                                            id="memo-date-picker"
                                            type="date"
                                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                            onChange={(e) => {
                                                const d = new Date(e.target.value);
                                                if (!isNaN(d.getTime())) {
                                                    setDate(language === 'ko' ? format(d, 'yyyy. MM. dd.') : formatDateForInput(d));
                                                }
                                            }}
                                        />
                                    </InputWrapper>

                                    <TagInput
                                        value={tags}
                                        style={{ flex: 1 }}
                                        onChange={e => setTags(e.target.value)}
                                        placeholder={t.memo_detail.tags_placeholder}
                                    />
                                </>
                            ) : (
                                <>
                                    {memo?.pageNumber && <span>p. {memo.pageNumber}</span>}
                                    <span>•</span>
                                    <span>{memo && format(memo.createdAt, language === 'ko' ? 'yyyy년 M월 d일' : 'MMM d, yyyy')}</span>
                                    {memo?.tags.map(t => (
                                        <span
                                            key={t}
                                            onClick={() => setSearchQuery(`tag:${t}`)}
                                            style={{
                                                background: '#eee',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                color: '#333',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </>
                            )}
                        </MetaRow>
                        <GoToBottomButton onClick={handleGoToBottom} title="Go to Bottom">
                            <FiArrowDown size={16} />
                        </GoToBottomButton>
                    </HeaderRow>

                    {isEditing ? (
                        <QuoteInput
                            placeholder="Quote from book (optional)..."
                            value={quote}
                            onChange={e => setQuote(e.target.value)}
                        />
                    ) : (
                        quote && <QuoteDisplay>“{quote}”</QuoteDisplay>
                    )}

                </Header>
                <ActionBar ref={actionBarRef} $isEditing={isEditing}>
                    {isEditing ? (
                        <>
                            <div id="lexical-toolbar-portal" style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px', marginLeft: '8px', borderLeft: '1px solid #eee', paddingLeft: '8px' }} />
                        </>
                    ) : (
                        <>
                            <ActionButton onClick={() => setIsEditing(true)} $mobileOrder={1}>
                                <FiEdit2 size={14} /> {t.memo_detail.edit}
                            </ActionButton>
                            {!isNew && (
                                <ActionButton onClick={handleAddThread} $mobileOrder={2}>
                                    <FiGitMerge size={14} /> {t.memo_detail.append}
                                </ActionButton>
                            )}
                            <ActionButton onClick={() => setIsFolderMoveModalOpen(true)} $mobileOrder={4}>
                                <FiFolder size={14} /> {language === 'ko' ? '폴더 이동' : 'Folder'}
                            </ActionButton>
                            <ActionButton onClick={handleCopy} $mobileOrder={5.5}>
                                <FiCopy size={14} /> {t.memo_detail.copy}
                            </ActionButton>
                            <ActionButton
                                $variant={movingMemoId === Number(id) ? "primary" : undefined}
                                onClick={() => {
                                    if (movingMemoId === Number(id)) {
                                        setMovingMemoId?.(null);
                                    } else {
                                        setMovingMemoId?.(Number(id));
                                    }
                                }}
                                $mobileOrder={6}
                            >
                                <FiArrowRightCircle size={14} />
                                {movingMemoId === Number(id) ? t.memo_detail.moving : t.memo_detail.move}
                            </ActionButton>
                            <ActionButton onClick={() => setIsShareModalOpen(true)} $mobileOrder={5}>
                                <FiShare2 size={14} /> {t.memo_detail.share_memo}
                            </ActionButton>
                            <ActionButton onClick={() => setIsPrintModalOpen(true)} $mobileOrder={7}>
                                <FiPrinter size={14} /> {language === 'ko' ? '인쇄' : 'Print'}
                            </ActionButton>
                            <ActionButton $variant="danger" onClick={handleDelete} $mobileOrder={8}>
                                <FiTrash2 size={14} /> {t.memo_detail.delete}
                            </ActionButton>
                        </>
                    )}
                </ActionBar>

                {isEditing ? (
                    <ContentPadding>
                        <MarkdownEditor
                            key={id || 'new'}
                            value={content}
                            onChange={setContent}
                            initialScrollPercentage={prevScrollRatio}
                            spellCheck={localStorage.getItem('spellCheck') !== 'false'}
                            markdownShortcuts={localStorage.getItem('editor_markdown_shortcuts') !== 'false'}
                            autoLink={localStorage.getItem('editor_auto_link') !== 'false'}
                            tabIndentation={localStorage.getItem('editor_tab_indentation') !== 'false'}
                            tabSize={Number(localStorage.getItem('editor_tab_size') || '4')}
                            fontSize={Number(localStorage.getItem('editor_font_size') || '11')}
                            onSave={() => handleSave()}
                            onExit={handleExit}
                            onDelete={!isNew ? handleDelete : undefined}
                            saveLabel={t.memo_detail.save}
                            exitLabel={t.memo_detail.exit}
                            deleteLabel={t.memo_detail.delete}
                            saveDisabled={!isCurrentlyDirty || (!!quote.trim() && !pageNumber)}
                            stickyOffset={headerHeight}
                        />
                    </ContentPadding>
                ) : (
                    <>
                        <ContentPadding>
                            <MarkdownView
                                content={content}
                                memoId={Number(id)}
                                fontSize={Number(localStorage.getItem('editor_font_size') || '11')}
                                onEditDrawing={(json) => {
                                    fabricCheckpointRef.current = content;
                                    setEditingDrawingData(json);
                                    setIsFabricModalOpen(true);
                                }}
                                onEditSpreadsheet={(json) => {
                                    spreadsheetCheckpointRef.current = content;
                                    originalSpreadsheetJsonRef.current = json; // Store original JSON string
                                    try {
                                        setEditingSpreadsheetData(JSON.parse(json));
                                        setIsSpreadsheetModalOpen(true);
                                    } catch (e) {
                                        console.error('Failed to parse spreadsheet JSON for editing', e);
                                    }
                                }}
                            />
                        </ContentPadding>
                    </>
                )}

                {!isEditing && !isNew && memo && (
                    <CommentsWrapper>
                        <CommentsSection
                            memoId={memo.id!}
                            initialEditingState={commentDraft}
                            onEditingChange={setCommentDraft}
                        />
                    </CommentsWrapper>
                )}

                {!isNew && memo && (
                    <SyncModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        adapter={bookMemoSyncAdapter}
                        initialItemId={memo.id!}
                        t={t}
                        language={language}
                    />
                )}

                {isDeleteModalOpen && (
                    <DeleteChoiceModal
                        onClose={() => setIsDeleteModalOpen(false)}
                        onDeleteMemoOnly={performDeleteMemoOnly}
                        onDeleteThread={() => performDeleteMemoOnly()}
                        isThreadHead={false}
                    />
                )}
                <PrintSettingsModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    appName="BookMemo"
                    language={language}
                    title={title}
                />
            </ScrollContainer>

            {isFabricModalOpen && (
                <FabricCanvasModal
                    key={tParam || 'default'} // Force re-mount on new requests
                    language={language}
                    initialData={editingDrawingData || (searchParams.get('drawing') === 'true' && isNew ? undefined : contentDrawingData)}
                    onSave={async (json) => {
                        let newContent = content;
                        const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;

                        if (editingDrawingData) {
                            let found = false;
                            newContent = content.replace(fabricRegex, (match, p1) => {
                                if (!found && p1.trim() === editingDrawingData.trim()) {
                                    found = true;
                                    return `\`\`\`fabric\n${json}\n\`\`\``;
                                }
                                return match;
                            });
                        } else if (content.trim().startsWith('```fabric')) {
                            newContent = `\`\`\`fabric\n${json}\n\`\`\``;
                        } else {
                            newContent = content.replace(fabricRegex, `\`\`\`fabric\n${json}\n\`\`\``);
                        }

                        setContent(newContent);
                        setEditingDrawingData(json);
                        fabricCheckpointRef.current = newContent;
                        const isInitialDrawing = searchParams.get('drawing') === 'true';
                        if (isNew && isInitialDrawing) {
                            const finalTitle = title || t.memo_detail.untitled;
                            setTitle(finalTitle);
                            const msg = language === 'ko' ? "저장되었습니다!" : "Saved!";
                            await handleSave(finalTitle, newContent, searchParams.toString(), { toastMessage: msg });
                            setFolderMoveToast(msg);
                        } else if (id && memo) {
                            await db.memos.update(Number(id), {
                                content: newContent,
                                updatedAt: new Date()
                            });
                            setFolderMoveToast(language === 'ko' ? "저장되었습니다!" : "Saved!");
                        }
                    }}
                    onAutosave={(json) => {
                        let newContent = content;
                        const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;

                        if (editingDrawingData) {
                            let found = false;
                            newContent = content.replace(fabricRegex, (match, p1) => {
                                if (!found && p1.trim() === editingDrawingData.trim()) {
                                    found = true;
                                    return `\`\`\`fabric\n${json}\n\`\`\``;
                                }
                                return match;
                            });
                        } else if (content.trim().startsWith('```fabric')) {
                            newContent = `\`\`\`fabric\n${json}\n\`\`\``;
                        } else {
                            newContent = content.replace(fabricRegex, `\`\`\`fabric\n${json}\n\`\`\``);
                        }
                        if (newContent !== content) {
                            setContent(newContent);
                            setEditingDrawingData(json);
                        }
                    }}
                    onClose={() => {
                        if (fabricCheckpointRef.current !== null) {
                            setContent(fabricCheckpointRef.current);
                            fabricCheckpointRef.current = null;
                        }
                        setIsFabricModalOpen(false);
                        setEditingDrawingData(undefined);
                    }}
                />
            )}

            <SpreadsheetModal
                isOpen={isSpreadsheetModalOpen}
                onClose={() => {
                    if (spreadsheetCheckpointRef.current !== null) {
                        setContent(spreadsheetCheckpointRef.current);
                        spreadsheetCheckpointRef.current = null;
                    }
                    setIsSpreadsheetModalOpen(false);
                    setEditingSpreadsheetData(undefined);
                }}
                onSave={async (data: any) => {
                    const json = JSON.stringify(data);
                    let newContent = `\`\`\`spreadsheet\n${json}\n\`\`\``;
                    const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;

                    // Use original JSON string for accurate matching
                    const targetRaw = originalSpreadsheetJsonRef.current?.trim() || '';
                    if (targetRaw) {
                        let found = false;
                        newContent = content.replace(spreadsheetRegex, (match, p1) => {
                            if (!found && p1.trim() === targetRaw) {
                                found = true;
                                return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                            }
                            return match;
                        });
                        // Update ref for subsequent saves
                        if (found) {
                            originalSpreadsheetJsonRef.current = json;
                        }
                    } else if (content.includes('```spreadsheet')) {
                        newContent = content.replace(spreadsheetRegex, `\`\`\`spreadsheet\n${json}\n\`\`\``);
                        originalSpreadsheetJsonRef.current = json;
                    } else if (content.trim()) {
                        newContent = `${content}\n\n\`\`\`spreadsheet\n${json}\n\`\`\``;
                        originalSpreadsheetJsonRef.current = json;
                    }

                    setContent(newContent);
                    spreadsheetCheckpointRef.current = newContent;

                    const isInitialSpreadsheet = searchParams.get('spreadsheet') === 'true';

                    // If it's a new spreadsheet memo from sidebar, ask for title and auto-save
                    if (isNew && isInitialSpreadsheet) {
                        const inputTitle = await modalPrompt({
                            message: t.memo_detail.title_prompt || (language === 'ko' ? '메모 제목을 입력하세요' : 'Enter memo title'),
                            placeholder: t.memo_detail.untitled
                        });
                        const finalTitle = inputTitle?.trim() || t.memo_detail.untitled;

                        setTitle(finalTitle);

                        // Trigger save with new content and title
                        // Keep spreadsheet=true and pass data in state to prevent "empty sheet" bug on remount
                        const msg = language === 'ko' ? "저장되었습니다!" : "Saved!";
                        await handleSave(finalTitle, newContent, searchParams.toString(), {
                            spreadsheetData: data,
                            spreadsheetJson: json,
                            toastMessage: msg
                        });
                        setFolderMoveToast(msg);
                    } else {
                        if (id) {
                            // Trigger save with new content
                            // Use handleSave to update lastSavedState and avoid race conditions with main Save button
                            await handleSave(undefined, newContent);
                            setFolderMoveToast(language === 'ko' ? "저장되었습니다!" : "Saved!");
                        }
                    }
                }}
                onAutosave={(data) => {
                    const json = JSON.stringify(data);
                    let newContent = content;
                    const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;

                    // Use original JSON string for accurate matching
                    const targetRaw = originalSpreadsheetJsonRef.current?.trim() || '';
                    if (targetRaw) {
                        let found = false;
                        newContent = content.replace(spreadsheetRegex, (match, p1) => {
                            if (!found && p1.trim() === targetRaw) {
                                found = true;
                                return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                            }
                            return match;
                        });
                        // Update ref for subsequent autosaves
                        if (found && newContent !== content) {
                            originalSpreadsheetJsonRef.current = json;
                            setContent(newContent);
                        }
                    } else if (content.includes('```spreadsheet')) {
                        newContent = content.replace(spreadsheetRegex, `\`\`\`spreadsheet\n${json}\n\`\`\``);
                        if (newContent !== content) {
                            originalSpreadsheetJsonRef.current = json;
                            setContent(newContent);
                        }
                    } else if (searchParams.get('spreadsheet') === 'true' || content.trim().startsWith('```spreadsheet')) {
                        newContent = `\`\`\`spreadsheet\n${json}\n\`\`\``;
                        originalSpreadsheetJsonRef.current = json;
                        setContent(newContent);
                    } else if (content.trim()) {
                        newContent = `${content}\n\n\`\`\`spreadsheet\n${json}\n\`\`\``;
                        originalSpreadsheetJsonRef.current = json;
                        setContent(newContent);
                    } else {
                        newContent = `\`\`\`spreadsheet\n${json}\n\`\`\``;
                        originalSpreadsheetJsonRef.current = json;
                        setContent(newContent);
                    }
                }}
                initialData={editingSpreadsheetData}
                language={language as 'en' | 'ko'}
            />

            {
                showExitToast && (
                    <Toast
                        variant="warning"
                        position="centered"
                        icon={<FiAlertTriangle size={14} />}
                        message={t.android?.exit_warning || "Press back again\nto exit editing."}
                        onClose={() => setShowExitToast(false)}
                    />
                )
            }

            {
                isFolderMoveModalOpen && memo?.id && (
                    <FolderMoveModal
                        memoId={memo.id}
                        currentFolderId={currentFolderId || undefined}
                        onClose={() => setIsFolderMoveModalOpen(false)}
                        onSuccess={(message) => {
                            setFolderMoveToast(message);
                            setTimeout(() => setFolderMoveToast(null), 500);
                            setIsFolderMoveModalOpen(false);
                        }}
                    />
                )
            }

            {folderMoveToast && (
                <Toast
                    message={folderMoveToast}
                    onClose={() => setFolderMoveToast(null)}
                    duration={500}
                />
            )}

            <GoToTopButton $show={showGoToTop} onClick={handleGoToTop} aria-label="Go to top">
                <FiArrowUp size={24} />
            </GoToTopButton>
        </MainWrapper >
    );
};