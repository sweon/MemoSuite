import React, { useState, useEffect, useRef } from 'react';
import { SyncModal, useConfirm, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CommentDraft } from '../../db';
import { useSearch } from '../../contexts/SearchContext';
import { useFolder } from '../../contexts/FolderContext';

import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiSave, FiX, FiShare2, FiArrowLeft, FiCalendar, FiPrinter, FiGitMerge, FiArrowRightCircle, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { format } from 'date-fns';
import { CommentsSection } from './CommentsSection';

import { bookMemoSyncAdapter } from '../../utils/backupAdapter';
import { DeleteChoiceModal } from './DeleteChoiceModal';

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
  padding: ${({ theme }) => `${theme.spacing.lg} ${theme.spacing.xl} ${theme.spacing.md}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.sm}`};
  }
`;

const ContentPadding = styled.div`
  padding: ${({ theme }) => `0 ${theme.spacing.xl}`};
  flex: 1;

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing.sm};
  }
`;

const CommentsWrapper = styled.div`
  padding: ${({ theme }) => `${theme.spacing.lg} ${theme.spacing.xl}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.sm};
  }
`;

const TitleInput = styled.input`
  font-size: 2.25rem;
  font-weight: 800;
  width: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  letter-spacing: -0.04em;
  
  &:focus {
    outline: none;
  }

  &::placeholder {
    opacity: 0.3;
  }
`;

const TitleDisplay = styled.h1`
  font-size: 2.25rem;
  font-weight: 900;
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.04em;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  flex-wrap: wrap;
  font-weight: 500;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
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
    margin-top: ${({ theme }) => theme.spacing.md};
    padding: ${({ theme }) => theme.spacing.md};
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
    margin-top: ${({ theme }) => theme.spacing.md};
    padding: ${({ theme }) => theme.spacing.md};
    background: ${({ theme }) => theme.colors.background};
    border-left: 4px solid ${({ theme }) => theme.colors.primary};
    border-radius: ${({ theme }) => `0 ${theme.radius.medium} ${theme.radius.medium} 0`};
    font-style: italic;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    font-size: 1rem;
    line-height: 1.6;
`;

const ActionBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.xl}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 5;

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: ${({ theme }) => theme.spacing.sm};
    min-height: 48px;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'cancel' | 'pdf' | 'print'; $mobileOrder?: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 10px;
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
  font-size: 13px;
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
    const { setSearchQuery } = useSearch();
    const { t, language } = useLanguage();
    const { confirm } = useConfirm();
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

    const startEditing = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            const ratio = scrollTop / (scrollHeight - clientHeight || 1);
            setPrevScrollRatio(ratio);
        }
        setIsEditingInternal(true);
        window.history.pushState({ editing: true, isGuard: true }, '');
    };

    const stopEditing = () => {
        isClosingRef.current = true;
        window.history.back(); // Trigger guard -> allow
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
                setIsFabricModalOpen(true);
            }
            if (searchParams.get('spreadsheet') === 'true') {
                setIsSpreadsheetModalOpen(true);
            }
        }
    }, [tParam, searchParams, isNew]);

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
    const [editingDrawingData, setEditingDrawingData] = useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = useState<any>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);

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

                if (isClosingRef.current) {
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
        else stopEditing();
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
        ? (title || content || tags || quote || pageNumber || hasDraftChanges)
        : (!!memo && (
            title !== memo.title ||
            content !== memo.content ||
            tags !== memo.tags.join(', ') ||
            quote !== (memo.quote || '') ||
            pageNumber !== (memo.pageNumber?.toString() || '') ||
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
        if (memo && loadedIdRef.current !== id) {
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
            if (shouldEdit && !isEditing) setIsEditing(shouldEdit);

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
            setTitle('');
            setContent('');
            setTags('');
            const p = searchParams.get('page');
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

    const handleSave = async () => {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        const now = new Date();
        const pNum = pageNumber ? parseInt(pageNumber, 10) : undefined;
        const targetBookId = bookId ? Number(bookId) : memo?.bookId;

        let finalTitle = title.trim();
        let finalType: 'normal' | 'progress' = 'normal';

        const hasTitle = !!finalTitle;
        const hasContent = !!content.trim();
        const hasQuote = !!quote.trim();
        const hasPage = pNum !== undefined;

        if (!hasTitle && !hasContent && !hasQuote && !hasPage) return;
        if (hasQuote && !hasPage) return;

        if (!hasTitle) {
            if (hasPage && !hasContent) {
                finalTitle = "Progress Record";
                finalType = 'progress';
            } else {
                const contentText = content.trim();
                const quoteText = quote.trim();

                if (contentText) {
                    const filteredText = contentText.replace(/```[\s\S]*?```/g, '').trim();
                    if (filteredText) {
                        finalTitle = filteredText.slice(0, 30) + (filteredText.length > 30 ? '...' : '');
                    } else if (contentText.startsWith('```fabric')) {
                        finalTitle = language === 'ko' ? '그림' : 'Drawing';
                    } else {
                        finalTitle = t.memo_detail.untitled;
                    }
                } else if (quoteText) {
                    finalTitle = quoteText.slice(0, 30) + (quoteText.length > 30 ? '...' : '');
                } else {
                    finalTitle = t.memo_detail.untitled;
                }
                finalType = 'normal';
            }
        } else {
            finalType = 'normal';
        }

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
                content,
                tags: tagArray,
                pageNumber: pNum,
                quote,
                createdAt: memoCreatedAt,
                updatedAt: now,
                type: finalType
            });

            if (searchParams.get('edit')) {
                navigate(`/book/${targetBookId}/memo/${id}`, { replace: true });
            }
            // Cleanup autosaves for this memo
            await db.autosaves.where('originalId').equals(Number(id)).delete();
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            setIsEditing(false);
        } else {
            const newId = await db.memos.add({
                folderId: currentFolderId || undefined,
                bookId: targetBookId,
                title: finalTitle,
                content,
                tags: tagArray,
                pageNumber: pNum,
                quote,
                createdAt: memoCreatedAt,
                updatedAt: now,
                type: finalType
            });

            // Cleanup all new memo autosaves
            await db.autosaves.filter(a => a.originalId === undefined).delete();

            navigate(`/book/${targetBookId}/memo/${newId}`);
        }
    };

    const handleAddThread = async () => {
        if (!memo || !id) return;

        const now = new Date();
        let threadId = memo.threadId;
        let threadOrder = 0;

        try {
            if (!threadId) {
                // Create new thread for current memo
                threadId = crypto.randomUUID();
                await db.memos.update(Number(id), {
                    threadId,
                    threadOrder: 0
                });
                threadOrder = 1;
            } else {
                // Find max order in this thread
                const threadMemos = await db.memos.where('threadId').equals(threadId).toArray();
                const maxOrder = Math.max(...threadMemos.map(l => l.threadOrder || 0));
                threadOrder = maxOrder + 1;
            }

            // Create new memo in thread
            const newMemoId = await db.memos.add({
                folderId: memo.folderId, // Inherit folder
                bookId: memo.bookId, // Inherit book
                title: '', // Empty title implies continuation
                content: '',
                tags: memo.tags, // Inherit tags
                pageNumber: memo.pageNumber, // Inherit page number
                createdAt: now,
                updatedAt: now,
                threadId,
                threadOrder,
                type: 'normal'
            });

            navigate(`/book/${memo.bookId}/memo/${newMemoId}?edit=true`, { replace: true });
        } catch (error) {
            console.error("Failed to add thread:", error);
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
            if (isNew) {
                navigate('/');
            } else if (searchParams.get('edit')) {
                navigate(`/memo/${id}`, { replace: true });
            }
            setIsEditing(false);
            return;
        }

        const options = {
            message: language === 'ko' ? "저장되지 않은 변경사항이 있습니다. 저장하고 나갈까요?" : "You have unsaved changes. Save and exit?",
            confirmText: language === 'ko' ? "저장 및 종료" : "Save and Exit",
            cancelText: language === 'ko' ? "저장하지 않고 종료" : "Exit without Saving"
        };

        const result = await confirm(options);

        if (result) {
            await handleSave();
        } else {
            if (isNew) {
                navigate('/');
            } else if (searchParams.get('edit')) {
                navigate(`/memo/${id}`, { replace: true });
            }
            setIsEditing(false);
        }
    };

    if (isDeleting || (!isNew && !memo)) {
        if (isDeleting) return null;
        return <ScrollContainer>{t.memo_detail.loading}</ScrollContainer>;
    }

    return (
        <MainWrapper>
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
            <ActionBar>
                {isEditing ? (
                    <>
                        <ActionButton
                            $variant="primary"
                            onClick={handleSave}
                            disabled={!isCurrentlyDirty || (!!quote.trim() && !pageNumber)}
                            style={{
                                opacity: (!isCurrentlyDirty || (!!quote.trim() && !pageNumber)) ? 0.5 : 1,
                                cursor: (!isCurrentlyDirty || (!!quote.trim() && !pageNumber)) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <FiSave size={14} /> {t.memo_detail.save}
                        </ActionButton>
                        <ActionButton $variant="cancel" onClick={handleExit}>
                            <FiX size={14} /> {t.memo_detail.exit}
                        </ActionButton>
                        {!isNew && (
                            <ActionButton $variant="danger" onClick={handleDelete}>
                                <FiTrash2 size={14} /> {t.memo_detail.delete}
                            </ActionButton>
                        )}
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

                        <ActionButton $variant="danger" onClick={handleDelete} $mobileOrder={2}>
                            <FiTrash2 size={14} /> {t.memo_detail.delete}
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
                            $mobileOrder={4}
                        >
                            <FiArrowRightCircle size={14} />
                            {movingMemoId === Number(id) ? t.memo_detail.moving : t.memo_detail.move}
                        </ActionButton>
                        <ActionButton onClick={() => setIsShareModalOpen(true)} $mobileOrder={5}>
                            <FiShare2 size={14} /> {t.memo_detail.share_memo}
                        </ActionButton>
                        <ActionButton onClick={() => window.print()} className="hide-on-mobile" $mobileOrder={6}>
                            <FiPrinter size={14} /> {language === 'ko' ? '인쇄' : 'Print'}
                        </ActionButton>
                    </>
                )}
            </ActionBar>

            <ScrollContainer ref={containerRef}>
                {isEditing ? (
                    <ContentPadding>
                        <MarkdownEditor
                            value={content}
                            onChange={setContent}
                            initialScrollPercentage={prevScrollRatio}
                        />
                    </ContentPadding>
                ) : (
                    <>
                        <ContentPadding>
                            <MarkdownView
                                content={content}
                                onEditDrawing={(json) => {
                                    setEditingDrawingData(json);
                                    setIsFabricModalOpen(true);
                                }}
                                onEditSpreadsheet={(json) => {
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
                        if (id && memo) {
                            await db.memos.update(Number(id), {
                                content: newContent,
                                updatedAt: new Date()
                            });
                        }
                        setIsFabricModalOpen(false);
                        setEditingDrawingData(undefined);
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
                        if (newContent !== content) setContent(newContent);
                    }}
                    onClose={() => {
                        setIsFabricModalOpen(false);
                        setEditingDrawingData(undefined);
                    }}
                />
            )}

            <SpreadsheetModal
                isOpen={isSpreadsheetModalOpen}
                onClose={() => {
                    setIsSpreadsheetModalOpen(false);
                    setEditingSpreadsheetData(undefined);
                }}
                onSave={async (data: any) => {
                    const json = JSON.stringify(data);
                    let newContent = content;
                    const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;

                    if (editingSpreadsheetData) {
                        let found = false;
                        const targetRaw = JSON.stringify(editingSpreadsheetData).trim();
                        newContent = content.replace(spreadsheetRegex, (match, p1) => {
                            if (!found && p1.trim() === targetRaw) {
                                found = true;
                                return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                            }
                            return match;
                        });
                    } else {
                        newContent = content.replace(spreadsheetRegex, `\`\`\`spreadsheet\n${json}\n\`\`\``);
                    }

                    setContent(newContent);
                    if (id && memo) {
                        await db.memos.update(Number(id), {
                            content: newContent,
                            updatedAt: new Date()
                        });
                    }
                    setIsSpreadsheetModalOpen(false);
                    setEditingSpreadsheetData(undefined);
                }}
                onAutosave={(data) => {
                    const json = JSON.stringify(data);
                    let newContent = content;
                    const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;

                    if (editingSpreadsheetData) {
                        let found = false;
                        const targetRaw = JSON.stringify(editingSpreadsheetData).trim();
                        newContent = content.replace(spreadsheetRegex, (match, p1) => {
                            if (!found && p1.trim() === targetRaw) {
                                found = true;
                                return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                            }
                            return match;
                        });
                    } else {
                        newContent = content.replace(spreadsheetRegex, `\`\`\`spreadsheet\n${json}\n\`\`\``);
                    }
                    if (newContent !== content) setContent(newContent);
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

            <GoToTopButton $show={showGoToTop} onClick={handleGoToTop} aria-label="Go to top">
                <FiArrowUp size={24} />
            </GoToTopButton>
        </MainWrapper >
    );
};