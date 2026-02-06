import React, { useState, useEffect, useRef } from 'react';
import { SyncModal, useConfirm, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CommentDraft } from '../../db';
import { useSearch } from '../../contexts/SearchContext';
import { useStudyMode } from '../../contexts/StudyModeContext';

import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';

import { wordMemoSyncAdapter } from '../../utils/backupAdapter';
import { FiEdit2, FiTrash2, FiSave, FiX, FiShare2, FiPrinter, FiBookOpen, FiCoffee, FiStar, FiList, FiPlus, FiFolder, FiGitMerge, FiArrowRightCircle, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';
import { BulkAddModal } from './BulkAddModal';
import { FolderMoveModal } from '../FolderView/FolderMoveModal';
import { useFolder } from '../../contexts/FolderContext';
import { format } from 'date-fns';
import { CommentsSection } from './CommentsSection';
import { DeleteChoiceModal } from './DeleteChoiceModal';
import { StarButton } from '../Sidebar/itemStyles';

import { Toast } from '../UI/Toast';

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
  background-color: ${({ theme }) => theme.colors.background};
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
  font-size: 1.5rem;
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

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  flex-wrap: wrap;
  font-weight: 500;
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
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: ${({ theme }) => theme.spacing.sm};
    height: auto;
  }
`;

const ResponsiveGroup = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 1rem;
  align-items: center;

  @media (max-width: 1100px) and (min-width: 481px) {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 0.6rem;
  }

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

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'cancel'; $mobileOrder?: number }>`
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
            $variant === 'danger' ? 'transparent' :
                $variant === 'cancel' ? 'transparent' : 'transparent'};
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

const SourceSelect = styled.select`
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${({ theme }) => theme.effects.transition};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
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

const ContentWrapper = styled.div<{ $isBlurred?: boolean }>`
  position: relative;
  transition: filter 0.4s ease, opacity 0.4s ease;
  
  ${({ $isBlurred }) => $isBlurred && `
    filter: blur(20px);
    opacity: 0.4;
    cursor: pointer;
    
    &:hover {
      filter: blur(0);
      opacity: 1;
    }
  `}
`;

export const MemoDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setSearchQuery } = useSearch();
    const { t, language } = useLanguage();
    const { confirm } = useConfirm();
    const isNew = id === undefined;

    // Track Sidebar interactions via t parameter to ensure stable modal opening
    const tParam = searchParams.get('t');
    const prevTParam = useRef<string | null>(null);
    const currentAutosaveIdRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        currentAutosaveIdRef.current = undefined;
        restoredIdRef.current = null;
        setCommentDraft(null);
        setIsEditing(id === undefined);
        if (id) {
            localStorage.setItem('wordmemo_last_word_id', id);
        }
    }, [id]);

    const [isEditing, setIsEditing] = useState(isNew);
    const [showGoToTop, setShowGoToTop] = useState(false);
    const [prevScrollRatio, setPrevScrollRatio] = useState<number | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const [folderMoveToast, setFolderMoveToast] = useState<string | null>(null);

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
    }, [isEditing]); // re-observe when editing toggles as action bar content changes



    const handleGoToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGoToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

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
                setSourceId(undefined);
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

    const handleStartEdit = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            const ratio = scrollTop / (scrollHeight - clientHeight || 1);
            setPrevScrollRatio(ratio);
        }
        setIsEditing(true);
    };
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState(''); // Comma separated for editing
    const [sourceId, setSourceId] = useState<number | undefined>(undefined);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingThreadHead, setIsDeletingThreadHead] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
    const [editingDrawingData, setEditingDrawingData] = useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = useState<any>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFolderMoveModalOpen, setIsFolderMoveModalOpen] = useState(false);
    const { currentFolder, currentFolderId } = useFolder();
    const isReadOnly = currentFolder?.isReadOnly || false;

    const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
    const commentDraftRef = useRef<CommentDraft | null>(null);
    useEffect(() => { commentDraftRef.current = commentDraft; }, [commentDraft]);
    const restoredIdRef = useRef<string | null>(null);

    const [prevId, setPrevId] = useState(id);
    if (id !== prevId) {
        setPrevId(id);
        setTitle('');
        setContent('');
        setTags('');
        setSourceId(undefined);
        setCommentDraft(null);
        setIsEditing(id === undefined);
    }

    // Memoize drawing data extraction to prevent unnecessary re-computations or modal glitches
    const contentDrawingData = React.useMemo(() => {
        const match = content.match(/```fabric\s*([\s\S]*?)\s*```/);
        return match ? match[1] : undefined;
    }, [content]);
    const { studyMode } = useStudyMode();

    const lastSavedState = useRef({ title, content, tags, sourceId, commentDraft });

    const word = useLiveQuery(
        () => (id ? db.words.get(Number(id)) : undefined),
        [id]
    );

    const { setIsDirty, setAppIsEditing, movingWordId, setMovingWordId } = useOutletContext<{
        setIsDirty: (d: boolean) => void;
        setAppIsEditing: (e: boolean) => void;
        movingWordId?: number | null;
        setMovingWordId?: (id: number | null) => void;
    }>() || {};

    const hasDraftChanges = !!commentDraft;
    const isCurrentlyDirty = !!(isNew
        ? (title || content || tags || hasDraftChanges)
        : (!!word && (
            title !== word.title ||
            content !== word.content ||
            tags !== word.tags.join(', ') ||
            sourceId !== word.sourceId ||
            hasDraftChanges
        )));

    useEffect(() => {
        setIsDirty(isEditing || hasDraftChanges);
        if (setAppIsEditing) setAppIsEditing(isEditing);
        return () => {
            setIsDirty(false);
            if (setAppIsEditing) setAppIsEditing(false);
        };
    }, [isEditing, hasDraftChanges, setIsDirty, setAppIsEditing]);

    // scroll 이벤트 리스너 등록 (log가 로드된 후)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setShowGoToTop(container.scrollTop > 300);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [word]);

    const isPlaceholder = !isNew && id && !word?.title && !word?.content;

    const handleToggleStar = async () => {
        if (!id || !word) return;
        await db.words.update(Number(id), { isStarred: word.isStarred ? 0 : 1 });
    };

    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const handleBulkConfirm = async (items: { word: string; meaning: string }[], createAsThread: boolean) => {
        const now = new Date();
        const baseSourceId = sourceId || (sources?.[0]?.id);
        const tagsToUse = word?.tags || [];

        let targetThreadId = word?.threadId;
        let nextOrder = 0;

        if (createAsThread) {
            // Force create a new thread with these items
            targetThreadId = crypto.randomUUID();
            nextOrder = 0;
        } else if (targetThreadId) {
            // Append to existing thread context
            const members = await db.words.where('threadId').equals(targetThreadId).toArray();
            nextOrder = Math.max(...members.map(m => m.threadOrder || 0)) + 1;
        }

        await db.transaction('rw', db.words, async () => {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await db.words.add({
                    title: item.word,
                    content: `> ${item.meaning}`,
                    tags: tagsToUse,
                    sourceId: baseSourceId,
                    createdAt: new Date(now.getTime() + i),
                    updatedAt: new Date(now.getTime() + i),
                    isStarred: 1,
                    threadId: targetThreadId,
                    threadOrder: targetThreadId ? (nextOrder + i) : undefined
                });
            }
        });

        if (isPlaceholder) {
            // Delete the placeholder word as it was just a container for the 'Add Thread' action
            await db.words.delete(Number(id));
            await db.comments.where('wordId').equals(Number(id)).delete();
        }

        setShowBulkAdd(false);
        setToastMessage(`${items.length} items added`);
        if (isNew || isPlaceholder) {
            navigate('/', { replace: true });
        }
    };

    const sources = useLiveQuery(() => db.sources.orderBy('order').toArray());
    const llmProviders = useLiveQuery(() => db.llmProviders.toArray());

    const loadedIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (word && loadedIdRef.current !== id) {
            const loadData = async () => {
                const tagsStr = word.tags.join(', ');

                // Check for autosave for initial display
                const existing = await db.autosaves
                    .where('originalId')
                    .equals(Number(id))
                    .reverse()
                    .sortBy('createdAt');

                let initialTitle = word.title;
                let initialContent = word.content;
                let initialTagsStr = tagsStr;
                let initialSourceId = word.sourceId;
                let initialCommentDraft: CommentDraft | null = null;

                if (existing.length > 0) {
                    const draft = existing[0];
                    initialTitle = draft.title;
                    initialContent = draft.content;
                    initialTagsStr = draft.tags.join(', ');
                    initialSourceId = draft.sourceId;
                    initialCommentDraft = draft.commentDraft || null;

                    // Resume autosave session and mark as restored
                    currentAutosaveIdRef.current = draft.id;
                    restoredIdRef.current = id || null;
                }

                setTitle(initialTitle);
                setContent(initialContent);
                setTags(initialTagsStr);
                setSourceId(initialSourceId);
                setCommentDraft(initialCommentDraft);

                // Initialize lastSavedState with initial values
                lastSavedState.current = {
                    title: initialTitle,
                    content: initialContent,
                    tags: initialTagsStr,
                    sourceId: initialSourceId,
                    commentDraft: initialCommentDraft
                };
                loadedIdRef.current = id || null;
            };
            loadData();
        }

        if (word) {
            const shouldEdit = searchParams.get('edit') === 'true';
            if (shouldEdit && !isEditing) setIsEditing(true);

            // Restoration prompt for existing word
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
                    const hasLogChanges = draft.content !== word.content || draft.title !== word.title;
                    const hasCommentDraft = !!draft.commentDraft;

                    if (hasLogChanges || hasCommentDraft) {
                        setTitle(draft.title);
                        setContent(draft.content);
                        const tagsStr = draft.tags.join(', ');
                        setTags(tagsStr);
                        setSourceId(draft.sourceId);
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
                            sourceId: draft.sourceId,
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
            setEditingDrawingData(undefined);
            setEditingSpreadsheetData(undefined);
            setSourceId(undefined);
            setCommentDraft(null);
            setIsEditing(true);
            loadedIdRef.current = 'new';

            if (searchParams.get('drawing') === 'true') {
                setIsFabricModalOpen(true);
            }

            // Restoration for new word: Automatically restore without asking
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
                        setSourceId(draft.sourceId);
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
                            sourceId: draft.sourceId,
                            commentDraft: draft.commentDraft || null
                        };
                    }
                }
            };
            checkNewAutosave();
        }
    }, [word, isNew, id, searchParams, isEditing]);

    useEffect(() => {
        const initSource = async () => {
            if (isNew && !sourceId && sources && sources.length > 0) {
                const lastIdStr = localStorage.getItem('wm_last_source_id');
                const lastId = lastIdStr ? Number(lastIdStr) : null;
                const lastFound = lastId ? sources.find(s => s.id === lastId) : null;

                if (lastFound) {
                    setSourceId(lastFound.id);
                } else {
                    const defaultName = t.word_detail.unknown_source;
                    const unknown = sources.find(s => s.name === defaultName);
                    if (unknown) {
                        setSourceId(unknown.id);
                    } else {
                        // Create default source if it doesn't exist
                        const newId = await db.sources.add({ name: defaultName, order: 999 });
                        setSourceId(newId as number);
                    }
                }
            }
        };
        initSource();
    }, [isNew, sourceId, sources]);



    const currentStateRef = useRef({ title, content, tags, sourceId, commentDraft });
    useEffect(() => {
        currentStateRef.current = { title, content, tags, sourceId, commentDraft };
    }, [title, content, tags, sourceId, commentDraft]);

    useEffect(() => {
        const isEditingAnything = isEditing || isFabricModalOpen || isSpreadsheetModalOpen || !!commentDraft;
        if (!isEditingAnything) return;

        const interval = setInterval(async () => {
            const { title: cTitle, content: cContent, tags: cTags, sourceId: cSourceId, commentDraft: cCommentDraft } = currentStateRef.current;
            const currentTagArray = cTags.split(',').map(t => t.trim()).filter(Boolean);
            const lastTagArray = lastSavedState.current.tags.split(',').map(t => t.trim()).filter(Boolean);

            const hasChanged = cTitle !== lastSavedState.current.title ||
                cContent !== lastSavedState.current.content ||
                String(cSourceId) !== String(lastSavedState.current.sourceId) ||
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
                sourceId: cSourceId ? Number(cSourceId) : undefined,
                commentDraft: cCommentDraft || undefined,
                createdAt: new Date()
            };

            if (currentAutosaveIdRef.current) {
                autosaveData.id = currentAutosaveIdRef.current;
            }

            const newId = await db.autosaves.put(autosaveData);
            currentAutosaveIdRef.current = newId;
            lastSavedState.current = { title: cTitle, content: cContent, tags: cTags, sourceId: cSourceId, commentDraft: cCommentDraft };

            // Keep only latest 20 autosaves
            const allAutosaves = await db.autosaves.orderBy('createdAt').toArray();
            if (allAutosaves.length > 20) {
                const toDelete = allAutosaves.slice(0, allAutosaves.length - 20);
                await db.autosaves.bulkDelete(toDelete.map(a => a.id!));
            }
        }, 7000); // 7 seconds

        return () => clearInterval(interval);
    }, [id, isEditing, isFabricModalOpen, isSpreadsheetModalOpen, !!commentDraft]); // Removed word dependency to prevent interval reset on DB updates

    const handleSave = async () => {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        const now = new Date();

        // Auto-generate title from first line of content if manual title is empty
        const firstLine = content.split('\n')[0].replace(/[#*`\s]/g, ' ').trim();
        const derivedTitle = title.trim() || firstLine.substring(0, 50) || t.word_detail.untitled;

        // Remember the last used source
        if (sourceId) {
            localStorage.setItem('wm_last_source_id', String(sourceId));
        }

        if (id) {
            await db.words.update(Number(id), {
                title: derivedTitle,
                content,
                tags: tagArray,
                sourceId: sourceId ? Number(sourceId) : undefined,
                updatedAt: now
            });

            // Clear edit param if present to prevent re-entering edit mode
            if (searchParams.get('edit')) {
                navigate(`/word/${id}`, { replace: true });
            }

            // Cleanup autosaves for this word
            await db.autosaves.where('originalId').equals(Number(id)).delete();
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            setIsEditing(false);
        } else {
            const newId = await db.words.add({
                folderId: currentFolderId || undefined,
                title: derivedTitle,
                content,
                tags: tagArray,
                sourceId: sourceId ? Number(sourceId) : undefined,
                createdAt: now,
                updatedAt: now,
                isStarred: 1
            });

            // Cleanup all new word autosaves
            await db.autosaves.filter(a => a.originalId === undefined).delete();

            navigate(`/word/${newId}`, { replace: true });
        }
    };

    const handleDelete = async () => {
        if (!id || !word) return;

        // Check if it's a thread head and has other logs
        const isHead = !!(word.threadId && word.threadOrder === 0);
        let hasOthers = false;

        if (isHead && word.threadId) {
            const threadLogs = await db.words.where('threadId').equals(word.threadId).toArray();
            hasOthers = threadLogs.length > 1;
        }

        setIsDeletingThreadHead(isHead && hasOthers);
        setIsDeleteModalOpen(true);
    };

    const performDeleteLogOnly = async () => {
        if (!id || !word) return;
        setIsDeleting(true);

        const threadId = word.threadId;
        const currentId = Number(id);

        await db.words.delete(currentId);
        await db.comments.where('wordId').equals(currentId).delete();

        if (threadId) {
            const remainingLogs = await db.words.where('threadId').equals(threadId).toArray();
            remainingLogs.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0));

            if (remainingLogs.length > 0) {
                // Re-sequence remaining logs to ensure there's a 0 order and it's contiguous
                await db.transaction('rw', db.words, async () => {
                    for (let i = 0; i < remainingLogs.length; i++) {
                        await db.words.update(remainingLogs[i].id!, { threadOrder: i });
                    }
                });
            }
        }

        // Always clear last word ID and navigate to empty state after deletion as requested
        localStorage.removeItem('wordmemo_last_word_id');
        setIsDeleteModalOpen(false);
        navigate('/', { replace: true });
    };

    const performDeleteThread = async () => {
        if (!word || !word.threadId) return;
        setIsDeleting(true);

        const threadId = word.threadId;
        const threadLogs = await db.words.where('threadId').equals(threadId).toArray();
        const wordIds = threadLogs.map(l => l.id!);

        await db.transaction('rw', [db.words, db.comments], async () => {
            await db.words.bulkDelete(wordIds);
            for (const lid of wordIds) {
                await db.comments.where('wordId').equals(lid).delete();
            }
        });

        // Clear last word ID to prevent auto-redirect by EmptyState
        localStorage.removeItem('wordmemo_last_word_id');

        setIsDeleteModalOpen(false);
        navigate('/', { replace: true });
    };
    const handleAddThread = async () => {
        if (!word || !id) return;

        const now = new Date();
        let threadId = word.threadId;
        let threadOrder = 0;

        try {
            if (!threadId) {
                // Create new thread for current word
                threadId = crypto.randomUUID();
                await db.words.update(Number(id), {
                    threadId,
                    threadOrder: 0
                });
                threadOrder = 1;
            } else {
                // Find max order in this thread
                const threadLogs = await db.words.where('threadId').equals(threadId).toArray();
                const maxOrder = Math.max(...threadLogs.map(l => l.threadOrder || 0));
                threadOrder = maxOrder + 1;
            }

            // Create new word in thread
            const newLogId = await db.words.add({
                folderId: word.folderId, // Inherit folder
                title: '', // Empty title implies continuation
                content: '',
                tags: word.tags, // Inherit tags
                sourceId: word.sourceId, // Inherit source
                createdAt: now,
                updatedAt: now,
                threadId,
                threadOrder,
                isStarred: 1
            });

            navigate(`/word/${newLogId}?edit=true`, { replace: true });
        } catch (error) {
            console.error("Failed to add thread:", error);
            await confirm({ message: "Failed to add thread. Please try again.", cancelText: null });
        }
    };

    const handleRandomWord = async () => {
        const savedLevel = localStorage.getItem('wordLevel');
        const level = savedLevel !== null ? Number(savedLevel) : 1;
        const provider = localStorage.getItem('llm_provider') || 'ChatGPT';

        const levels = {
            0: "Elementary (Basic English for young learners)",
            1: "Beginner (Common daily words and simple phrases)",
            2: "Intermediate (Useful vocabulary for conversation and general reading)",
            3: "Advanced (Academic, professional, or complex literary terms)"
        };
        const levelStr = levels[level as keyof typeof levels] || levels[1];

        const recentLogs = await db.words.orderBy('createdAt').reverse().limit(100).toArray();
        const recentWords = recentLogs.map(l => l.title).filter(Boolean).join(', ');
        const exclusionClause = recentWords ? `\n\n(IMPORTANT: DO NOT recommend any of these words as I already have them in my list: ${recentWords})` : '';

        const prompt = `Recommend one English word or idiom for my level: ${levelStr}.${exclusionClause}
Please provide a detailed and friendly explanation for it.
Include:
1. Basic meaning and nuances
2. Usage context
3. A few more examples if possible

Please respond in Korean. Start directly with the word/idiom on the first line, followed by the explanation. Skip any introductory or concluding remarks (e.g., "Of course!", "Here is the word...").`;

        const providerObj = llmProviders?.find(p => p.name === provider);
        const targetUrl = providerObj?.url || 'https://chatgpt.com/';

        try {
            await navigator.clipboard.writeText(prompt);
            setToastMessage(`${provider} 프롬프트가 복사되었습니다! 새 창에 붙여넣어 주세요.`);

            // Automatically set source to 'Random' if it exists
            const randomSource = sources?.find(s => s.name === 'Random');
            if (randomSource) {
                setSourceId(randomSource.id);
            }

            setTimeout(() => {
                window.open(targetUrl, '_blank');
            }, 1000);
        } catch (err) {
            console.error(err);
            setToastMessage("클립보드 복사에 실패했습니다.");
        }
    };

    const handleExample = async () => {
        const wordToUse = title || word?.title;
        if (!wordToUse) {
            setToastMessage("단어를 먼저 입력해 주세요.");
            return;
        }

        const provider = localStorage.getItem('llm_provider') || 'ChatGPT';
        const prompt = `Please provide one natural and useful example sentence for the English word: "${wordToUse}".
Please provide the response in this exact format (no numbering, no extra text):

Example sentence in English
Korean translation of the sentence

Skip any introductory or concluding remarks.`;

        const providerObj = llmProviders?.find(p => p.name === provider);
        const targetUrl = providerObj?.url || 'https://chatgpt.com/';

        try {
            await navigator.clipboard.writeText(prompt);
            setToastMessage(`예문 프롬프트가 복사되었습니다! ${provider}에서 확인해 주세요.`);

            setTimeout(() => {
                window.open(targetUrl, '_blank');
            }, 1000);
        } catch (err) {
            console.error(err);
            setToastMessage("클립보드 복사에 실패했습니다.");
        }
    };

    const handleMeaning = async () => {
        const wordToUse = title || word?.title;
        if (!wordToUse) {
            setToastMessage("단어를 먼저 입력해 주세요.");
            return;
        }

        const provider = localStorage.getItem('llm_provider') || 'ChatGPT';
        const prompt = `Please provide a detailed and friendly explanation for the English word/idiom: "${wordToUse}".
Include:
1. Basic meaning and nuances
2. Usage context
3. A few more examples if possible
Please respond in Korean. Skip any introductory or concluding remarks (e.g., "Of course!", "Here is the explanation...").`;

        const providerObj = llmProviders?.find(p => p.name === provider);
        const targetUrl = providerObj?.url || 'https://chatgpt.com/';

        try {
            await navigator.clipboard.writeText(prompt);
            setToastMessage(`설명 프롬프트가 복사되었습니다! ${provider}에서 확인해 주세요.`);

            setTimeout(() => {
                window.open(targetUrl, '_blank');
            }, 1000);
        } catch (err) {
            console.error(err);
            setToastMessage("클립보드 복사에 실패했습니다.");
        }
    };

    const handleExit = async () => {
        if (!isCurrentlyDirty) {
            if (isPlaceholder || isNew) {
                navigate('/', { replace: true });
            } else if (searchParams.get('edit')) {
                navigate(`/word/${id}`, { replace: true });
            }
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
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
            if (isPlaceholder || isNew) {
                navigate('/', { replace: true });
            } else if (searchParams.get('edit')) {
                navigate(`/word/${id}`, { replace: true });
            }
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            setIsEditing(false);
        }
    };

    if (isDeleting || (!isNew && !word)) {
        if (isDeleting) return null;
        return <ScrollContainer>{t.word_detail.loading}</ScrollContainer>;
    }

    return (
        <MainWrapper>
            <ScrollContainer
                ref={containerRef}
                style={{ '--sticky-offset': headerHeight ? `${headerHeight}px` : undefined } as React.CSSProperties}
            >
                <Header>
                    {isEditing && (
                        <TitleInput
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t.word_detail.title_placeholder}
                        />
                    )}
                    <HeaderRow>
                        <MetaRow>
                            {isEditing ? (
                                <>
                                    <SourceSelect
                                        value={sourceId || ''}
                                        onChange={e => setSourceId(Number(e.target.value))}
                                    >
                                        {sources?.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </SourceSelect>
                                    <TagInput
                                        value={tags}
                                        onChange={e => setTags(e.target.value)}
                                        placeholder={t.word_detail.tags_placeholder}
                                    />
                                </>
                            ) : (
                                <>
                                    <span>{sources?.find(s => s.id === sourceId)?.name || t.word_detail.unknown_source}</span>
                                    <span>•</span>
                                    <span>{word && format(word.createdAt, language === 'ko' ? 'yyyy년 M월 d일' : 'MMM d, yyyy')}</span>
                                    {word?.tags.map(t => (
                                        <span
                                            key={t}
                                            onClick={() => setSearchQuery(`tag:${t} `)}
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
                                onClick={handleSave}
                                disabled={!isCurrentlyDirty}
                                style={{
                                    opacity: !isCurrentlyDirty ? 0.5 : 1,
                                    cursor: !isCurrentlyDirty ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <FiSave size={14} /> {t.word_detail.save}
                            </ActionButton>
                            <ActionButton $variant="cancel" onClick={handleExit}>
                                <FiX size={14} /> {t.word_detail.exit}
                            </ActionButton>
                            <ActionButton onClick={handleRandomWord}>
                                <FiList size={14} /> {t.word_detail.random_word}
                            </ActionButton>
                            <ActionButton onClick={() => setShowBulkAdd(true)}>
                                <FiPlus size={14} /> {t.word_detail.bulk_add}
                            </ActionButton>
                        </>
                    ) : (
                        <ResponsiveGroup>
                            {/* Group 1: Edit, Meaning, Example, Join/Append */}
                            <ButtonGroup>
                                <ActionButton onClick={handleMeaning} $mobileOrder={7}>
                                    <FiBookOpen size={14} /> {t.word_detail.meaning_button}
                                </ActionButton>
                                <ActionButton onClick={handleExample} $mobileOrder={8}>
                                    <FiCoffee size={14} /> {t.word_detail.example_button}
                                </ActionButton>
                                <ActionButton onClick={handleAddThread} $mobileOrder={2}>
                                    <FiGitMerge size={14} /> {t.word_detail.append}
                                </ActionButton>

                                <ActionButton
                                    $variant={movingWordId === Number(id) ? "primary" : undefined}
                                    onClick={() => {
                                        if (movingWordId === Number(id)) {
                                            setMovingWordId?.(null);
                                        } else {
                                            setMovingWordId?.(Number(id));
                                        }
                                    }}
                                    $mobileOrder={4}
                                >
                                    <FiArrowRightCircle size={14} />
                                    {movingWordId === Number(id) ? t.word_detail.moving : t.word_detail.move}
                                </ActionButton>
                            </ButtonGroup>

                            {/* Group 2: Share, Delete, Print ... Star */}
                            <ButtonGroup $flex={1}>
                                {!isReadOnly && (
                                    <ActionButton onClick={handleStartEdit} $mobileOrder={1}>
                                        <FiEdit2 size={13} /> {t.word_detail.edit || 'Edit'}
                                    </ActionButton>
                                )}
                                <ActionButton onClick={() => setIsFolderMoveModalOpen(true)} $mobileOrder={6}>
                                    <FiFolder size={13} /> {language === 'ko' ? '폴더 이동' : 'Folder'}
                                </ActionButton>
                                <ActionButton onClick={() => setShowShareModal(true)} $mobileOrder={5}>
                                    <FiShare2 size={13} /> {t.word_detail.share_word}
                                </ActionButton>
                                <ActionButton onClick={() => window.print()} $mobileOrder={9} className="hide-on-mobile">
                                    <FiPrinter size={13} /> {t.word_detail.print || 'Print'}
                                </ActionButton>
                                {!isReadOnly && (
                                    <ActionButton $variant="danger" onClick={handleDelete} $mobileOrder={11}>
                                        <FiTrash2 size={13} /> {t.word_detail.delete}
                                    </ActionButton>
                                )}

                                <StarButton
                                    $active={!!word?.isStarred}
                                    onClick={handleToggleStar}
                                    style={{ padding: '6px', marginLeft: 'auto', order: 10 }}
                                >
                                    <FiStar fill={word?.isStarred ? 'currentColor' : 'none'} size={15} />
                                </StarButton>
                            </ButtonGroup>
                        </ResponsiveGroup>
                    )}
                </ActionBar>

                {
                    isEditing ? (
                        <ContentPadding>
                            <MarkdownEditor
                                value={content}
                                onChange={setContent}
                                initialScrollPercentage={prevScrollRatio}
                            />
                        </ContentPadding>
                    ) : (
                        <ContentPadding>
                            <ContentWrapper $isBlurred={studyMode === 'hide-meanings'}>
                                <MarkdownView
                                    content={content}
                                    isReadOnly={isReadOnly}
                                    onEditDrawing={(json) => {
                                        if (isReadOnly) return;
                                        setEditingDrawingData(json);
                                        setIsFabricModalOpen(true);
                                    }}
                                    onEditSpreadsheet={(json) => {
                                        if (isReadOnly) return;
                                        try {
                                            setEditingSpreadsheetData(JSON.parse(json));
                                            setIsSpreadsheetModalOpen(true);
                                        } catch (e) {
                                            console.error('Failed to parse spreadsheet JSON for editing', e);
                                        }
                                    }}
                                />
                            </ContentWrapper>
                        </ContentPadding>
                    )
                }
                {
                    !isEditing && !isNew && word && (
                        <CommentsWrapper>
                            <CommentsSection
                                wordId={word.id!}
                                initialEditingState={commentDraft}
                                onEditingChange={setCommentDraft}
                            />
                        </CommentsWrapper>
                    )
                }

                {
                    isFabricModalOpen && (
                        <FabricCanvasModal
                            key={tParam || 'default'} // Force re-mount on new requests
                            language={language}
                            initialData={editingDrawingData || (searchParams.get('drawing') === 'true' && isNew ? undefined : contentDrawingData)}
                            onSave={async (json: string) => {
                                const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;
                                let found = false;
                                const newContent = content.replace(fabricRegex, (match, p1) => {
                                    if (!found && p1.trim() === editingDrawingData?.trim()) {
                                        found = true;
                                        return `\`\`\`fabric\n${json}\n\`\`\``;
                                    }
                                    return match;
                                });

                                setContent(newContent);
                                if (id) {
                                    await db.words.update(Number(id), {
                                        content: newContent,
                                        updatedAt: new Date()
                                    });
                                }
                                setIsFabricModalOpen(false);
                                setEditingDrawingData(undefined);
                            }}
                            onAutosave={(json) => {
                                const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;
                                let found = false;
                                const newContent = content.replace(fabricRegex, (match, p1) => {
                                    if (!found && p1.trim() === editingDrawingData?.trim()) {
                                        found = true;
                                        return `\`\`\`fabric\n${json}\n\`\`\``;
                                    }
                                    return match;
                                });
                                if (newContent !== content) setContent(newContent);
                            }}
                            onClose={() => {
                                setIsFabricModalOpen(false);
                                setEditingDrawingData(undefined);
                            }}
                        />
                    )
                }

                <SpreadsheetModal
                    isOpen={isSpreadsheetModalOpen}
                    onClose={() => {
                        setIsSpreadsheetModalOpen(false);
                        setEditingSpreadsheetData(undefined);
                    }}
                    onSave={async (data: any) => {
                        const json = JSON.stringify(data);
                        const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
                        let found = false;
                        const targetRaw = JSON.stringify(editingSpreadsheetData).trim();

                        const newContent = content.replace(spreadsheetRegex, (match, p1) => {
                            if (!found && p1.trim() === targetRaw) {
                                found = true;
                                return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                            }
                            return match;
                        });

                        setContent(newContent);
                        if (id) {
                            await db.words.update(Number(id), {
                                content: newContent,
                                updatedAt: new Date()
                            });
                        }
                        setIsSpreadsheetModalOpen(false);
                        setEditingSpreadsheetData(undefined);
                    }}
                    onAutosave={(data) => {
                        const json = JSON.stringify(data);
                        const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
                        let found = false;
                        const targetRaw = JSON.stringify(editingSpreadsheetData).trim();

                        const newContent = content.replace(spreadsheetRegex, (match, p1) => {
                            if (!found && p1.trim() === targetRaw) {
                                found = true;
                                return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                            }
                            return match;
                        });
                        if (newContent !== content) setContent(newContent);
                    }}
                    initialData={editingSpreadsheetData}
                    language={language as 'en' | 'ko'}
                />

                {
                    isDeleteModalOpen && (
                        <DeleteChoiceModal
                            onClose={() => setIsDeleteModalOpen(false)}
                            onDeleteWordOnly={performDeleteLogOnly}
                            onDeleteThread={performDeleteThread}
                            isThreadHead={isDeletingThreadHead}
                        />
                    )
                }
                {
                    toastMessage && (
                        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
                    )
                }
                {
                    folderMoveToast && (
                        <Toast
                            message={folderMoveToast}
                            onClose={() => setFolderMoveToast(null)}
                            duration={3000}
                        />
                    )
                }

                {
                    showBulkAdd && (
                        <BulkAddModal
                            onClose={() => setShowBulkAdd(false)}
                            onConfirm={handleBulkConfirm}
                            isInThread={!!word?.threadId}
                        />
                    )
                }
                {
                    showShareModal && word?.id && (
                        <SyncModal
                            isOpen={showShareModal}
                            onClose={() => setShowShareModal(false)}
                            adapter={wordMemoSyncAdapter}
                            initialItemId={word.id}
                            t={t}
                            language={language}
                        />
                    )
                }
                {
                    isFolderMoveModalOpen && word?.id && (
                        <FolderMoveModal
                            memoId={word.id}
                            currentFolderId={word.folderId || null}
                            onClose={() => setIsFolderMoveModalOpen(false)}
                            onSuccess={(msg) => setToastMessage(msg)}
                        />
                    )
                }
            </ScrollContainer >
            <GoToTopButton $show={showGoToTop} onClick={handleGoToTop} aria-label="Go to top">
                <FiArrowUp size={24} />
            </GoToTopButton>
        </MainWrapper >
    );
};