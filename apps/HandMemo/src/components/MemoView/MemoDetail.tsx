import React, { useState, useEffect, useRef } from 'react';
import { SyncModal, useLanguage, useModal, metadataCache, prepareThreadForNewItem, buildThreadNavigationUrl, extractThreadContext } from '@memosuite/shared';

import styled from 'styled-components';
import { useParams, useNavigate, useSearchParams, useOutletContext, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CommentDraft } from '../../db';
import { useSearch } from '../../contexts/SearchContext';
import { useFolder } from '../../contexts/FolderContext';

import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiSave, FiX, FiShare2, FiCalendar, FiFolder, FiGitMerge, FiArrowRightCircle, FiArrowUp, FiArrowDown, FiPrinter } from 'react-icons/fi';
import { format } from 'date-fns';
import { CommentsSection } from './CommentsSection';

import { handMemoSyncAdapter } from '../../utils/backupAdapter';
import { DeleteChoiceModal } from './DeleteChoiceModal';
import { FolderMoveModal } from '../FolderView/FolderMoveModal';

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

  @media print {
    display: none !important;
  }
`;

const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;

  @media print {
    height: auto !important;
    overflow: visible !important;
    display: block !important;
  }
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
  -webkit-overflow-scrolling: touch;
  scroll-padding-top: var(--sticky-offset, 0px);

  @media print {
    height: auto !important;
    overflow: visible !important;
    display: block !important;
  }
`;

const Header = styled.div`
  margin: 0;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.xl} 2px`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.sm} 2px`};
  }

  @media print {
    display: none !important;
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

  @media print {
    border-top: none;
    padding-top: 0;
  }
`;

const TitleInput = styled.input`
  font-size: 2.25rem;
  font-weight: 800;
  width: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 2px;
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
  margin: 0 0 2px 0;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.04em;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.colors.text}, ${theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.8rem;
  flex-wrap: wrap;
  font-weight: 500;
  width: 100%;
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
  font-size: 0.8rem;
  transition: ${({ theme }) => theme.effects.transition};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
  }
`;

const DateInput = styled.input`
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
    padding: 6px 36px 6px 12px;
    border-radius: ${({ theme }) => theme.radius.medium};
    width: 210px;
    font-size: 0.8rem;
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

const ActionBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.xl}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 5;

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.sm}`};
  }

  @media (max-width: 480px) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: ${({ theme }) => theme.spacing.sm};
    height: auto;
  }

  @media print {
    display: none !important;
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

  @media (max-width: 768px) {
    &.hide-on-mobile {
      display: none !important;
    }
  }
`;

const ResponsiveGroup = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    display: contents;
  }
`;

const ButtonGroup = styled.div<{ $flex?: number }>`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  ${({ $flex }) => $flex !== undefined && `flex: ${$flex};`}

  @media (max-width: 480px) {
    display: contents;
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
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setSearchQuery } = useSearch();
    const { t, language } = useLanguage();
    const { confirm, prompt: modalPrompt, choice } = useModal();
    const location = useLocation();
    const isNew = !id;

    // Guard Hook
    const { registerGuard, unregisterGuard } = useExitGuard();
    const [showExitToast, setShowExitToast] = useState(false);
    const lastBackPress = useRef(0);
    const isClosingRef = useRef(false);
    const [isEditingInternal, setIsEditingInternal] = useState(() => {
        const isDrawing = searchParams.get('drawing') === 'true';
        const isSheet = searchParams.get('spreadsheet') === 'true';
        return isNew && !isDrawing && !isSheet;
    });
    const [showGoToTop, setShowGoToTop] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentAutosaveIdRef = useRef<number | undefined>(undefined);

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

    useEffect(() => {
        currentAutosaveIdRef.current = undefined;
        restoredIdRef.current = null;
        setCommentDraft(null);
        setIsEditingInternal(!id);
    }, [id]);

    // Folder context for read-only mode
    const { currentFolder, currentFolderId } = useFolder();
    const isCurrentFolderReadOnly = currentFolder?.isReadOnly ?? false;

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
    const [isFolderMoveModalOpen, setIsFolderMoveModalOpen] = useState(false);
    const [folderMoveToast, setFolderMoveToast] = useState<string | null>(null);
    const [editingDrawingData, setEditingDrawingData] = useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = useState<any>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);

    const [prevScrollRatio, setPrevScrollRatio] = useState<number | undefined>(undefined);
    const fabricCheckpointRef = useRef<string | null>(null);
    const spreadsheetCheckpointRef = useRef<string | null>(null);
    const originalSpreadsheetJsonRef = useRef<string | null>(null); // Store original JSON string for accurate matching

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

    const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
    const commentDraftRef = useRef<CommentDraft | null>(null);
    useEffect(() => { commentDraftRef.current = commentDraft; }, [commentDraft]);
    const restoredIdRef = useRef<string | null>(null);
    const [commentRestorationVersion, setCommentRestorationVersion] = useState(0);

    // Track Sidebar interactions via t parameter to ensure stable modal opening
    const tParam = searchParams.get('t');
    const prevTParam = useRef<string | null>(null);

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

    // Recover spreadsheet data from navigation state if available (e.g. after initial save of new memo)
    useEffect(() => {
        if (location.state?.spreadsheetData && location.state?.spreadsheetJson) {
            setEditingSpreadsheetData(location.state.spreadsheetData);
            originalSpreadsheetJsonRef.current = location.state.spreadsheetJson;
            setIsSpreadsheetModalOpen(true);
        }
    }, [location.state]);

    useEffect(() => {
        if (isEditingInternal) {
            const guardId = 'memo-edit-guard';
            registerGuard(guardId, () => {
                // If any modal is open, let its own guard handle the back navigation
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

    // State reset on ID change is now handled by the 'key' prop in App.tsx

    // Memoize drawing data extraction to prevent unnecessary re-computations or modal glitches
    // Memoize drawing data extraction to prevent unnecessary re-computations or modal glitches
    // const contentDrawingData = React.useMemo(() => {
    //     const match = content.match(/```fabric\s*([\s\S]*?)\s*```/);
    //     return match ? match[1] : undefined;
    // }, [content]);

    const memo = useLiveQuery(
        () => (id ? db.memos.get(Number(id)) : undefined),
        [id]
    );

    const { setAppIsEditing, movingMemoId, setMovingMemoId } = useOutletContext<{
        setAppIsEditing: (val: boolean) => void,
        movingMemoId: number | null,
        setMovingMemoId: (id: number | null) => void
    }>();
    // const isMovingLocal = movingMemoId === Number(id);

    useEffect(() => {
        if (id) {
            localStorage.setItem('handmemo_last_memo_id', id);
        }
    }, [id]);



    const handleGoToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGoToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    const hasDraftChanges = !!commentDraft;
    const isCurrentlyDirty = !!(isNew
        ? (title.trim() || content.trim() || tags.trim() || hasDraftChanges)
        : (!!memo && (
            (title || '').trim() !== (memo.title || '').trim() ||
            (content || '') !== (memo.content || '') ||
            (tags || '').trim() !== (memo.tags.join(', ') || '').trim() ||
            hasDraftChanges
        )));

    useEffect(() => {
        setAppIsEditing(isEditing || (!!commentDraft && commentDraft.content.trim().length > 0));
        return () => setAppIsEditing(false);
    }, [isEditing, commentDraft, setAppIsEditing]);

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

                // Only load original memo data when viewing
                // Autosave restoration happens separately in checkExistingAutosave
                setTitle(memo.title);
                setContent(memo.content);
                setTags(tagsStr);
                setDate(language === 'ko' ? format(memo.createdAt, 'yyyy. MM. dd.') : formatDateForInput(memo.createdAt));
                setCommentDraft(null);

                // Initialize lastSavedState with original memo values
                lastSavedState.current = {
                    title: memo.title,
                    content: memo.content,
                    tags: tagsStr,
                    commentDraft: null
                };
                loadedIdRef.current = id || null;
            };
            loadData();
        }

        if (memo) {
            const shouldEdit = searchParams.get('edit') === 'true';
            if (shouldEdit && !isEditing) {
                setIsEditingInternal(true);
                const params = new URLSearchParams(searchParams);
                params.delete('edit');
                const search = params.toString();
                navigate({
                    pathname: location.pathname,
                    search: search ? `?${search}` : '',
                }, { replace: true, state: { editing: true, isGuard: true } });
            }

            // Restoration prompt for existing memo
            const checkExistingAutosave = async () => {
                const autoEditId = sessionStorage.getItem('handmemo_auto_edit');
                const isAutoEdit = autoEditId === String(id);
                if (isAutoEdit) {
                    sessionStorage.removeItem('handmemo_auto_edit');
                }

                if (!isEditing && !shouldEdit && !isAutoEdit && !searchParams.get('comment') && searchParams.get('restore') !== 'true') return;

                // Don't restore if we already restored/checked in this edit session
                if (isEditing && restoredIdRef.current === id) return;

                if (isAutoEdit && !isEditing) {
                    setIsEditing(true);
                }

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
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft); setCommentRestorationVersion(v => v + 1);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
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
            setCommentDraft(null);
            setEditingDrawingData(undefined);
            setEditingSpreadsheetData(undefined);
            loadedIdRef.current = 'new';

            const isInitialDrawing = searchParams.get('drawing') === 'true';
            const isInitialSheet = searchParams.get('spreadsheet') === 'true';

            setDate(language === 'ko' ? format(new Date(), 'yyyy. MM. dd.') : formatDateForInput(new Date()));
            setIsEditing(!(isInitialDrawing || isInitialSheet));

            // Auto-open drawing if requested
            if (isInitialDrawing) {
                fabricCheckpointRef.current = '';
                setIsFabricModalOpen(true);
            }

            // Auto-open spreadsheet if requested
            if (isInitialSheet) {
                setIsSpreadsheetModalOpen(true);
            }

            // Handle dropped image from MainLayout
            const initialImageUrl = location.state?.imageUrl;
            if (initialImageUrl) {
                setTitle('이미지');
                setContent(`![](${initialImageUrl})\n\n`);
                metadataCache.fetchImageMetadata(initialImageUrl);
            }

            // Restoration for new memo: Automatically restore without asking
            const checkNewAutosave = async () => {
                const latest = await db.autosaves
                    .filter(a => a.originalId === undefined)
                    .reverse()
                    .sortBy('createdAt');

                if (latest.length > 0) {
                    const draft = latest[0];
                    if (draft.content.trim() || draft.title.trim() || draft.commentDraft) {
                        setTitle(draft.title);
                        setContent(draft.content);
                        const tagsStr = draft.tags.join(', ');
                        setTags(tagsStr);
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft); setCommentRestorationVersion(v => v + 1);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
                            commentDraft: draft.commentDraft || null
                        };
                    }
                }
            };
            checkNewAutosave();
        }
    }, [memo, isNew, searchParams, id, language, t.log_detail?.autosave_restore_confirm, isEditing]);

    const lastSavedState = useRef({ title, content, tags, commentDraft });

    const currentStateRef = useRef({ title, content, tags, commentDraft });
    useEffect(() => {
        currentStateRef.current = { title, content, tags, commentDraft };
    }, [title, content, tags, commentDraft]);

    useEffect(() => {
        const isEditingAnything = isEditing || isFabricModalOpen || isSpreadsheetModalOpen || !!commentDraft;
        if (!isEditingAnything) return;

        const interval = setInterval(async () => {
            const { title: cTitle, content: cContent, tags: cTags, commentDraft: cCommentDraft } = currentStateRef.current;
            const currentTagArray = cTags.split(',').map(t => t.trim()).filter(Boolean);
            const lastTagArray = lastSavedState.current.tags.split(',').map(t => t.trim()).filter(Boolean);

            const hasChanged = cTitle !== lastSavedState.current.title ||
                cContent !== lastSavedState.current.content ||
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
                title: cTitle,
                content: cContent,
                tags: currentTagArray,
                commentDraft: cCommentDraft || undefined,
                createdAt: new Date()
            };

            if (currentAutosaveIdRef.current) {
                autosaveData.id = currentAutosaveIdRef.current;
            }

            const newId = await db.autosaves.put(autosaveData);
            currentAutosaveIdRef.current = newId;
            lastSavedState.current = { title: cTitle, content: cContent, tags: cTags, commentDraft: cCommentDraft };

            // Keep only latest 20 autosaves
            const allAutosaves = await db.autosaves.orderBy('createdAt').toArray();
            if (allAutosaves.length > 20) {
                const toDelete = allAutosaves.slice(0, allAutosaves.length - 20);
                await db.autosaves.bulkDelete(toDelete.map(a => a.id!));
            }
        }, 7000); // 7 seconds

        return () => clearInterval(interval);
    }, [id, isEditing, isFabricModalOpen, isSpreadsheetModalOpen, !!commentDraft]); // Removed memo dependency to prevent interval reset on DB updates

    const handleSave = async (overrideTitle?: string, overrideContent?: string, _overrideSearch?: string, overrideState?: any) => {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        const now = new Date();
        const currentContent = overrideContent !== undefined ? overrideContent : content;
        let finalTitle = (overrideTitle !== undefined ? overrideTitle : title).trim();
        let finalType: 'normal' | 'progress' = 'normal';

        const hasTitle = !!finalTitle;
        const hasContent = !!currentContent.trim();

        if (!hasTitle && !hasContent) return;

        if (!hasTitle) {
            const contentText = currentContent.trim();

            if (contentText) {
                // Filter out markdown code blocks for title generation
                let filteredText = contentText
                    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                    .trim();

                if (filteredText) {
                    // Check if it starts with an image markdown: ![] (URL)
                    const imgMatch = filteredText.match(/^!\[(.*?)\]\((.*?)\)/);
                    if (imgMatch) {
                        const alt = imgMatch[1].trim();
                        const url = imgMatch[2].trim();

                        if (alt && alt !== '이미지' && alt !== 'Image') {
                            finalTitle = alt;
                        } else {
                            try {
                                const urlObj = new URL(url);
                                const pathParts = urlObj.pathname.split('/').filter(Boolean);
                                if (pathParts.length > 0) {
                                    const lastPart = pathParts[pathParts.length - 1];
                                    let filename = decodeURIComponent(lastPart)
                                        .replace(/\.[^/.]+$/, '')
                                        .replace(/[-_]/g, ' ')
                                        .trim();
                                    if (filename.length > 1) {
                                        finalTitle = filename.charAt(0).toUpperCase() + filename.slice(1);
                                    }
                                }
                            } catch (e) { }
                        }

                        if (!finalTitle) {
                            finalTitle = language === 'ko' ? '이미지' : 'Image';
                        }
                    } else {
                        // Check if it starts with a markdown link: [text] (URL)
                        const linkMatch = filteredText.match(/^\[(.*?)\]\((.*?)\)/);
                        if (linkMatch && linkMatch[1].trim()) {
                            finalTitle = linkMatch[1].trim();
                        } else {
                            finalTitle = filteredText.slice(0, 30) + (filteredText.length > 30 ? '...' : '');
                        }
                    }
                } else {
                    finalTitle = t.memo_detail.untitled;
                }
            } else {
                finalTitle = t.memo_detail.untitled;
            }
            finalType = 'normal';
        } else {
            finalType = 'normal';
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
                createdAt: memoCreatedAt,
                updatedAt: now,
                type: finalType
            });

            // Cleanup autosaves for this memo
            await db.autosaves.where('originalId').equals(Number(id)).delete();
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;

            if (searchParams.get('edit') && !isFabricModalOpen && !isSpreadsheetModalOpen) {
                navigate(`/memo/${id}`, { replace: true });
            }
            // setIsEditing(false); // Do not exit edit mode on save
        } else {
            // Extract thread context from URL params if present (from Append button)
            const threadContext = extractThreadContext(searchParams);

            const newId = await db.memos.add({
                folderId: threadContext?.inheritedFolderId ?? currentFolderId ?? undefined,
                title: finalTitle,
                content: currentContent,
                tags: threadContext?.inheritedTags ?? tagArray,
                createdAt: memoCreatedAt,
                updatedAt: now,
                type: finalType,
                threadId: threadContext?.threadId,
                threadOrder: threadContext?.threadOrder
            });

            // Cleanup all new memo autosaves
            await db.autosaves.filter(a => a.originalId === undefined).delete();

            // Navigate without thread params to avoid re-applying on subsequent saves
            navigate(`/memo/${newId}`, { replace: true, state: overrideState });
        }
    };

    const handleAddThread = async () => {
        if (!memo || !id) return;

        try {
            const context = await prepareThreadForNewItem({
                currentItem: memo,
                currentId: Number(id),
                table: db.memos
            });

            // Navigate to new memo page with thread context (same pattern as sidebar)
            const url = buildThreadNavigationUrl('/memo/new', context, { edit: 'true' });
            navigate(url, { replace: true, state: { isGuard: true } });
        } catch (error) {
            console.error("Failed to add thread:", error);
            await confirm({ message: "Failed to add thread. Please try again.", cancelText: null });
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
        await db.autosaves.where('originalId').equals(Number(id)).delete();

        // Clear last memo ID to prevent auto-redirect by EmptyState
        localStorage.removeItem('handmemo_last_memo_id');

        setIsDeleteModalOpen(false);
        navigate('/', { replace: true });
    };

    const handleExit = async () => {
        if (!isCurrentlyDirty) {
            if (isNew) {
                // Navigate back to the previously selected memo (before clicking new)
                const prevId = localStorage.getItem('handmemo_prev_memo_id');
                localStorage.removeItem('handmemo_prev_memo_id'); // Clean up
                if (prevId) {
                    navigate(`/memo/${prevId}`, { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            } else if (searchParams.get('edit')) {
                navigate(`/memo/${id}`, { replace: true });
            }
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            setIsEditing(false);
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
            localStorage.removeItem('handmemo_prev_memo_id');
            setIsEditingInternal(false);
        } else if (result === 'neutral') {
            // Cleanup autosaves on exit without saving
            if (id) {
                await db.autosaves.where('originalId').equals(Number(id)).delete();
            } else {
                await db.autosaves.filter(a => a.originalId === undefined).delete();
            }
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;

            if (isNew) {
                // Navigate back to the previously selected memo (before clicking new)
                const prevId = localStorage.getItem('handmemo_prev_memo_id');
                localStorage.removeItem('handmemo_prev_memo_id'); // Clean up
                if (prevId) {
                    navigate(`/memo/${prevId}`, { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            } else {
                // Reset states to original memo data
                if (memo) {
                    setTitle(memo.title);
                    setContent(memo.content);
                    const tagsStr = memo.tags.join(', ');
                    setTags(tagsStr);
                    setDate(language === 'ko' ? format(memo.createdAt, 'yyyy. MM. dd.') : format(memo.createdAt, 'yyyy-MM-dd'));
                    setCommentDraft(null);
                }
                if (searchParams.get('edit')) {
                    navigate(`/memo/${id}`, { replace: true });
                }
            }
            setIsEditingInternal(false);
        }
    };

    if (isDeleting || (!isNew && !memo)) {
        if (isDeleting) return null;
        return <ScrollContainer>{t.memo_detail.loading}</ScrollContainer>;
    }

    // Layout effect removed as we use the effect at the top of component

    // Removed unused handleFolderMove


    return (
        <MainWrapper>
            <ScrollContainer
                ref={containerRef}
                style={{ '--sticky-offset': headerHeight ? `${headerHeight}px` : undefined } as React.CSSProperties}
            >
                <Header>
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

                </Header>
                <ActionBar ref={actionBarRef}>
                    {isEditing ? (
                        <>
                            <ActionButton
                                $variant="primary"
                                onClick={() => handleSave()}
                                disabled={!isCurrentlyDirty}
                                style={{
                                    opacity: !isCurrentlyDirty ? 0.5 : 1,
                                    cursor: !isCurrentlyDirty ? 'not-allowed' : 'pointer'
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
                        <ResponsiveGroup>
                            <ButtonGroup>
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
                            </ButtonGroup>
                            <ButtonGroup $flex={1}>
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
                                <ActionButton onClick={() => window.print()} $mobileOrder={7}>
                                    <FiPrinter size={14} /> {language === 'ko' ? '인쇄' : 'Print'}
                                </ActionButton>
                                <ActionButton $variant="danger" onClick={handleDelete} $mobileOrder={8}>
                                    <FiTrash2 size={14} /> {t.memo_detail.delete}
                                </ActionButton>
                            </ButtonGroup>
                        </ResponsiveGroup>
                    )}
                </ActionBar>

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
                                memoId={Number(id)}
                                isReadOnly={isCurrentFolderReadOnly}
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
                            key={`${memo.id!}-${commentRestorationVersion}`}
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
                        adapter={handMemoSyncAdapter}
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

                {isFolderMoveModalOpen && memo && (
                    <FolderMoveModal
                        memoId={memo.id!}
                        currentFolderId={currentFolderId}
                        onClose={() => setIsFolderMoveModalOpen(false)}
                        onSuccess={(message) => {
                            setFolderMoveToast(message);
                            setTimeout(() => setFolderMoveToast(null), 3000);
                            setIsFolderMoveModalOpen(false);
                        }}
                    />
                )}

                {folderMoveToast && (
                    <Toast
                        message={folderMoveToast}
                        onClose={() => setFolderMoveToast(null)}
                        duration={3000}
                    />
                )}

                {showExitToast && (
                    <Toast
                        variant="warning"
                        position="centered"
                        icon={<FiAlertTriangle size={14} />}
                        message={t.memo_detail.exit_toast || "Press back again to exit"}
                        onClose={() => setShowExitToast(false)}
                    />
                )}
                {isFabricModalOpen && (
                    <FabricCanvasModal
                        initialData={editingDrawingData}
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
                            fabricCheckpointRef.current = newContent; // Update checkpoint on manual save
                            if (id && memo) {
                                await db.memos.update(Number(id), {
                                    content: newContent,
                                    updatedAt: new Date()
                                });
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
                            } else if (searchParams.get('drawing') === 'true' || content.trim().startsWith('```fabric')) {
                                newContent = `\`\`\`fabric\n${json}\n\`\`\``;
                            } else {
                                if (content.includes('```fabric')) {
                                    newContent = content.replace(fabricRegex, `\`\`\`fabric\n${json}\n\`\`\``);
                                } else {
                                    newContent = content.trim() ? `${content}\n\n\`\`\`fabric\n${json}\n\`\`\`` : `\`\`\`fabric\n${json}\n\`\`\``;
                                }
                            }
                            if (newContent !== content) setContent(newContent);
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
                                message: t.memo_detail.title_prompt,
                                placeholder: t.memo_detail.untitled
                            });
                            const finalTitle = inputTitle?.trim() || t.memo_detail.untitled;

                            setTitle(finalTitle);

                            // Trigger save with new content and title
                            // Keep spreadsheet=true and pass data in state to prevent "empty sheet" bug on remount
                            await handleSave(finalTitle, newContent, searchParams.toString(), {
                                spreadsheetData: data,
                                spreadsheetJson: json
                            });
                        } else {
                            if (id) {
                                // Trigger save with new content
                                // Use handleSave to update lastSavedState and avoid race conditions with main Save button
                                await handleSave(undefined, newContent);
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
            </ScrollContainer>
            <GoToTopButton $show={showGoToTop} onClick={handleGoToTop} aria-label="Go to top">
                <FiArrowUp size={24} />
            </GoToTopButton>
        </MainWrapper >
    );
};