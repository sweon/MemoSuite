import React, { useState, useEffect, useRef } from 'react';
import { SyncModal, useConfirm, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CommentDraft } from '../../db';
import { useSearch } from '../../contexts/SearchContext';

import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiSave, FiX, FiShare2, FiGitMerge, FiFolder, FiArrowRightCircle, FiArrowUp, FiArrowDown, FiPrinter } from 'react-icons/fi';
import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';
import { FolderMoveModal } from '../FolderView/FolderMoveModal';
import { useFolder } from '../../contexts/FolderContext';
import { format } from 'date-fns';
import { CommentsSection } from './CommentsSection';
import { Toast } from '../UI/Toast';

import { llmemoSyncAdapter } from '../../utils/backupAdapter';
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
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.colors.text}, ${theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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

const ActionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
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

  @media (max-width: 768px) {
    &.hide-on-mobile {
      display: none !important;
    }
  }
`;

const ModelSelect = styled.select`
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

export const LogDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setSearchQuery } = useSearch();
    const { language, t } = useLanguage();
    const { confirm } = useConfirm();

    const isNew = id === undefined;

    const [isEditing, setIsEditing] = useState(isNew);
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
    }, [isEditing]); // re-observe when editing toggles as action bar content changes

    const handleStartEdit = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            const ratio = scrollTop / (scrollHeight - clientHeight || 1);
            setPrevScrollRatio(ratio);
        }
        setIsEditing(true);
    };

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
            localStorage.setItem('llmemo_last_log_id', id);
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
                setModelId(undefined);
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

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState(''); // Comma separated for editing
    const [modelId, setModelId] = useState<number | undefined>(undefined);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingThreadHead, setIsDeletingThreadHead] = useState(false);
    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
    const [editingDrawingData, setEditingDrawingData] = useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = useState<any>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFolderMoveModalOpen, setIsFolderMoveModalOpen] = useState(false);
    const { currentFolder, currentFolderId } = useFolder();
    const isReadOnly = currentFolder?.isReadOnly || false;
    const [folderMoveToast, setFolderMoveToast] = useState<string | null>(null);

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
        setCommentDraft(null);
        setIsEditing(id === undefined);
    }

    // Memoize drawing data extraction to prevent unnecessary re-computations or modal glitches
    const contentDrawingData = React.useMemo(() => {
        const match = content.match(/```fabric\s*([\s\S]*?)\s*```/);
        return match ? match[1] : undefined;
    }, [content]);

    const log = useLiveQuery(
        () => (id ? db.logs.get(Number(id)) : undefined),
        [id]
    );

    const { setIsDirty, setAppIsEditing, movingLogId, setMovingLogId } = useOutletContext<{
        setIsDirty: (d: boolean) => void;
        setAppIsEditing: (e: boolean) => void;
        movingLogId?: number | null;
        setMovingLogId?: (id: number | null) => void;
    }>();

    const isMovingLocal = movingLogId === Number(id);

    const hasDraftChanges = !!commentDraft;
    const isCurrentlyDirty = !!(isNew
        ? (title || content || tags || hasDraftChanges)
        : (!!log && (
            title !== log.title ||
            content !== log.content ||
            tags !== log.tags.join(', ') ||
            modelId !== log.modelId ||
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
    }, [log]);

    const models = useLiveQuery(() => db.models.orderBy('order').toArray());
    const loadedIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (log && loadedIdRef.current !== id) {
            const loadData = async () => {
                const tagsStr = log.tags.join(', ');

                // Check for autosave for initial display
                const existing = await db.autosaves
                    .where('originalId')
                    .equals(Number(id))
                    .reverse()
                    .sortBy('createdAt');

                let initialTitle = log.title;
                let initialContent = log.content;
                let initialTagsStr = tagsStr;
                let initialModelId = log.modelId;
                let initialCommentDraft: CommentDraft | null = null;

                if (existing.length > 0) {
                    const draft = existing[0];
                    initialTitle = draft.title;
                    initialContent = draft.content;
                    initialTagsStr = draft.tags.join(', ');
                    initialModelId = draft.modelId;
                    initialCommentDraft = draft.commentDraft || null;

                    // Resume autosave session and mark as restored
                    currentAutosaveIdRef.current = draft.id;
                    restoredIdRef.current = id || null;
                }

                setTitle(initialTitle);
                setContent(initialContent);
                setTags(initialTagsStr);
                setModelId(initialModelId);
                setCommentDraft(initialCommentDraft);

                // Initialize lastSavedState with initial values
                lastSavedState.current = {
                    title: initialTitle,
                    content: initialContent,
                    tags: initialTagsStr,
                    modelId: initialModelId,
                    commentDraft: initialCommentDraft
                };
                loadedIdRef.current = id || null;
            };
            loadData();
        }

        if (log) {
            const shouldEdit = searchParams.get('edit') === 'true';
            if (shouldEdit && !isEditing) setIsEditing(true);

            // Restoration prompt for existing log
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
                    const hasLogChanges = draft.content !== log.content || draft.title !== log.title;
                    const hasCommentDraft = !!draft.commentDraft;

                    if (hasLogChanges || hasCommentDraft) {
                        setTitle(draft.title);
                        setContent(draft.content);
                        const tagsStr = draft.tags.join(', ');
                        setTags(tagsStr);
                        setModelId(draft.modelId);
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
                            modelId: draft.modelId,
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
            setModelId(undefined);
            setCommentDraft(null);
            setIsEditing(true);
            loadedIdRef.current = 'new';

            // Restoration prompt for new log
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
                        setModelId(draft.modelId);
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }

                        // Also update lastSavedState to match the restored draft
                        lastSavedState.current = {
                            title: draft.title,
                            content: draft.content,
                            tags: tagsStr,
                            modelId: draft.modelId,
                            commentDraft: draft.commentDraft || null
                        };
                    }
                }
            };
            checkNewAutosave();
        }

        if (searchParams.get('drawing') === 'true') {
            setIsFabricModalOpen(true);
        }
    }, [log, isNew, id, searchParams, isEditing]);

    // Set default model if new and models loaded
    useEffect(() => {
        if (isNew && !modelId && models && models.length > 0) {
            setModelId(models[0].id);
        }
    }, [isNew, modelId, models]);

    const lastSavedState = useRef({ title, content, tags, modelId, commentDraft });

    const currentStateRef = useRef({ title, content, tags, modelId, commentDraft });
    useEffect(() => {
        currentStateRef.current = { title, content, tags, modelId, commentDraft };
    }, [title, content, tags, modelId, commentDraft]);

    useEffect(() => {
        const isEditingAnything = isEditing || isFabricModalOpen || isSpreadsheetModalOpen || !!commentDraft;
        if (!isEditingAnything) return;

        const interval = setInterval(async () => {
            const { title: cTitle, content: cContent, tags: cTags, modelId: cModelId, commentDraft: cCommentDraft } = currentStateRef.current;
            const currentTagArray = cTags.split(',').map(t => t.trim()).filter(Boolean);
            const lastTagArray = lastSavedState.current.tags.split(',').map(t => t.trim()).filter(Boolean);

            const hasChanged = cTitle !== lastSavedState.current.title ||
                cContent !== lastSavedState.current.content ||
                String(cModelId) !== String(lastSavedState.current.modelId) ||
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
                modelId: cModelId ? Number(cModelId) : undefined,
                commentDraft: cCommentDraft || undefined,
                createdAt: new Date()
            };

            if (currentAutosaveIdRef.current) {
                autosaveData.id = currentAutosaveIdRef.current;
            }

            const newId = await db.autosaves.put(autosaveData);
            currentAutosaveIdRef.current = newId;
            lastSavedState.current = { title: cTitle, content: cContent, tags: cTags, modelId: cModelId, commentDraft: cCommentDraft };

            // Keep only latest 20 autosaves
            const allAutosaves = await db.autosaves.orderBy('createdAt').toArray();
            if (allAutosaves.length > 20) {
                const toDelete = allAutosaves.slice(0, allAutosaves.length - 20);
                await db.autosaves.bulkDelete(toDelete.map(a => a.id!));
            }
        }, 7000); // 7 seconds

        return () => clearInterval(interval);
    }, [id, isEditing, isFabricModalOpen, isSpreadsheetModalOpen, !!commentDraft]); // Removed log dependency to prevent interval reset on DB updates

    const handleSave = async () => {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        const now = new Date();

        if (id) {
            await db.logs.update(Number(id), {
                title,
                content,
                tags: tagArray,
                modelId: modelId ? Number(modelId) : undefined,
                updatedAt: now
            });

            // Cleanup autosaves for this log
            await db.autosaves.where('originalId').equals(Number(id)).delete();
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;

            // Clear edit param if present to prevent re-entering edit mode
            if (searchParams.get('edit')) {
                navigate(`/log/${id}`, { replace: true });
            }
        } else {
            const newId = await db.logs.add({
                folderId: currentFolderId || undefined,
                title: title || t.log_detail.untitled,
                content,
                tags: tagArray,
                modelId: modelId ? Number(modelId) : undefined,
                createdAt: now,
                updatedAt: now
            });

            // Cleanup all new log autosaves
            await db.autosaves.filter(a => a.originalId === undefined).delete();

            navigate(`/log/${newId}`);
        }
    };

    const handleDelete = async () => {
        if (!id || !log) return;

        // Check if it's a thread head and has other logs
        const isHead = !!(log.threadId && log.threadOrder === 0);
        let hasOthers = false;

        if (isHead && log.threadId) {
            const threadLogs = await db.logs.where('threadId').equals(log.threadId).toArray();
            hasOthers = threadLogs.length > 1;
        }

        setIsDeletingThreadHead(isHead && hasOthers);
        setIsDeleteModalOpen(true);
    };

    const performDeleteLogOnly = async () => {
        if (!id || !log) return;
        setIsDeleting(true);

        const threadId = log.threadId;
        const currentId = Number(id);

        await db.logs.delete(currentId);
        await db.comments.where('logId').equals(currentId).delete();

        if (threadId) {
            const remainingLogs = await db.logs.where('threadId').equals(threadId).sortBy('threadOrder');

            if (remainingLogs.length > 0) {
                // Re-sequence remaining logs to ensure there's a 0 order and it's contiguous
                await db.transaction('rw', db.logs, async () => {
                    for (let i = 0; i < remainingLogs.length; i++) {
                        await db.logs.update(remainingLogs[i].id!, { threadOrder: i });
                    }
                });
            }
        }

        // Always clear last log ID and navigate to empty state after deletion as requested
        localStorage.removeItem('llmemo_last_log_id');
        setIsDeleteModalOpen(false);
        navigate('/', { replace: true });
    };

    const performDeleteThread = async () => {
        if (!log || !log.threadId) return;
        setIsDeleting(true);

        const threadId = log.threadId;
        const threadLogs = await db.logs.where('threadId').equals(threadId).toArray();
        const logIds = threadLogs.map(l => l.id!);

        await db.transaction('rw', [db.logs, db.comments], async () => {
            await db.logs.bulkDelete(logIds);
            for (const lid of logIds) {
                await db.comments.where('logId').equals(lid).delete();
            }
        });

        // Clear last log ID to prevent auto-redirect by EmptyState
        localStorage.removeItem('llmemo_last_log_id');

        setIsDeleteModalOpen(false);
        navigate('/', { replace: true });
    };

    const handleAddThread = async () => {
        if (!log || !id) return;

        const now = new Date();
        let threadId = log.threadId;
        let threadOrder = 0;

        try {
            if (!threadId) {
                // Create new thread for current log
                threadId = crypto.randomUUID();
                await db.logs.update(Number(id), {
                    threadId,
                    threadOrder: 0
                });
                threadOrder = 1;
            } else {
                // Find max order in this thread
                const threadLogs = await db.logs.where('threadId').equals(threadId).toArray();
                const maxOrder = Math.max(...threadLogs.map(l => l.threadOrder || 0));
                threadOrder = maxOrder + 1;
            }

            // Create new log in thread
            const newLogId = await db.logs.add({
                folderId: log.folderId, // Inherit folder
                title: '', // Empty title implies continuation
                content: '',
                tags: log.tags, // Inherit tags
                modelId: log.modelId, // Inherit model
                createdAt: now,
                updatedAt: now,
                threadId,
                threadOrder
            });

            navigate(`/log/${newLogId}?edit=true`, { replace: true });
        } catch (error) {
            console.error("Failed to add thread:", error);
            await confirm({ message: "Failed to add thread. Please try again.", cancelText: null });
        }
    };

    const currentModelName = models?.find(m => m.id === modelId)?.name || t.log_detail.unknown_model;


    const handleExit = async () => {
        if (!isCurrentlyDirty) {
            if (isNew) {
                navigate('/');
            } else if (searchParams.get('edit')) {
                navigate(`/log/${id}`, { replace: true });
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
            if (isNew) {
                navigate('/');
            } else if (searchParams.get('edit')) {
                navigate(`/log/${id}`, { replace: true });
            }
            currentAutosaveIdRef.current = undefined;
            restoredIdRef.current = null;
            setIsEditing(false);
        }
    };

    if (isDeleting || (!isNew && !log)) {
        if (isDeleting) return null;
        return <ScrollContainer>{t.log_detail.loading}</ScrollContainer>;
    }

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
                            placeholder={t.log_detail.title_placeholder}
                            autoFocus
                        />
                    ) : (
                        <TitleDisplay>{log?.title}</TitleDisplay>
                    )}

                    <HeaderRow>
                        <MetaRow>
                            {isEditing ? (
                                <>
                                    <ModelSelect
                                        value={modelId || ''}
                                        onChange={e => setModelId(Number(e.target.value))}
                                    >
                                        {models?.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </ModelSelect>
                                    <TagInput
                                        value={tags}
                                        onChange={e => setTags(e.target.value)}
                                        placeholder={t.log_detail.tags_placeholder}
                                    />
                                </>
                            ) : (
                                <>
                                    <span>{currentModelName}</span>
                                    <span>•</span>
                                    <span>{log && format(log.createdAt, language === 'ko' ? 'yyyy년 M월 d일' : 'MMM d, yyyy')}</span>
                                    {log?.tags.map(t => (
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
                                onClick={handleSave}
                                disabled={!isCurrentlyDirty}
                                style={{
                                    opacity: !isCurrentlyDirty ? 0.5 : 1,
                                    cursor: !isCurrentlyDirty ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <FiSave size={14} /> {t.log_detail.save}
                            </ActionButton>
                            <ActionButton $variant="cancel" onClick={handleExit}>
                                <FiX size={14} /> {t.log_detail.exit}
                            </ActionButton>
                        </>
                    ) : (
                        <>
                            {!isReadOnly && (
                                <ActionButton onClick={handleStartEdit} $mobileOrder={1}>
                                    <FiEdit2 size={14} /> {t.log_detail.edit}
                                </ActionButton>
                            )}
                            {!isNew && (
                                <ActionButton onClick={handleAddThread} $mobileOrder={2}>
                                    <FiGitMerge size={14} /> {t.log_detail.add_thread}
                                </ActionButton>
                            )}
                            {!isNew && (
                                <ActionButton onClick={() => setIsFolderMoveModalOpen(true)} $mobileOrder={4}>
                                    <FiFolder size={14} /> {language === 'ko' ? '폴더 이동' : 'Folder'}
                                </ActionButton>
                            )}
                            <ActionButton onClick={() => setIsShareModalOpen(true)} $mobileOrder={5}>
                                <FiShare2 size={14} /> {t.log_detail.share_log}
                            </ActionButton>
                            <ActionButton onClick={() => window.print()} $mobileOrder={7}>
                                <FiPrinter size={14} /> {language === 'ko' ? '인쇄' : 'Print'}
                            </ActionButton>
                            {!isNew && (
                                <ActionButton
                                    $variant={isMovingLocal ? "primary" : undefined}
                                    onClick={() => {
                                        if (isMovingLocal) {
                                            setMovingLogId?.(null);
                                        } else {
                                            setMovingLogId?.(Number(id));
                                        }
                                    }}
                                    $mobileOrder={6}
                                >
                                    <FiArrowRightCircle size={14} />
                                    {isMovingLocal ? t.log_detail.moving : t.log_detail.move}
                                </ActionButton>
                            )}
                            {!isReadOnly && (
                                <ActionButton $variant="danger" onClick={handleDelete} $mobileOrder={8}>
                                    <FiTrash2 size={14} /> {t.log_detail.delete}
                                </ActionButton>
                            )}
                        </>
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
                    <ContentPadding>
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
                    </ContentPadding>
                )}
                {!isEditing && !isNew && log && (
                    <CommentsWrapper>
                        <CommentsSection
                            logId={log.id!}
                            initialEditingState={commentDraft}
                            onEditingChange={setCommentDraft}
                        />
                    </CommentsWrapper>
                )}
                {isFabricModalOpen && (
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
                                await db.logs.update(Number(id), {
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
                )}

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
                            await db.logs.update(Number(id), {
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
                {log && (
                    <SyncModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        adapter={llmemoSyncAdapter}
                        initialItemId={log.id!}
                        t={t}
                        language={language}
                    />
                )}
                {isDeleteModalOpen && (
                    <DeleteChoiceModal
                        onClose={() => setIsDeleteModalOpen(false)}
                        onDeleteLogOnly={performDeleteLogOnly}
                        onDeleteThread={performDeleteThread}
                        isThreadHead={isDeletingThreadHead}
                    />
                )}
                {isFolderMoveModalOpen && log?.id && (
                    <FolderMoveModal
                        memoId={log.id}
                        currentFolderId={log.folderId || null}
                        onClose={() => setIsFolderMoveModalOpen(false)}
                        onSuccess={() => { }}
                    />
                )}
                {folderMoveToast && (
                    <Toast
                        message={folderMoveToast}
                        onClose={() => setFolderMoveToast(null)}
                        duration={3000}
                    />
                )}
            </ScrollContainer>
            <GoToTopButton $show={showGoToTop} onClick={handleGoToTop} aria-label="Go to top">
                <FiArrowUp size={24} />
            </GoToTopButton>
        </MainWrapper>
    );
};