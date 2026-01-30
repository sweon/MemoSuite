import React, { useState, useEffect, useRef } from 'react';
import { SyncModal, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CommentDraft } from '../../db';
import { useSearch } from '../../contexts/SearchContext';

import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiSave, FiX, FiShare2, FiGitMerge } from 'react-icons/fi';
import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';
import { format } from 'date-fns';
import { CommentsSection } from './CommentsSection';

import { llmemoSyncAdapter } from '../../utils/backupAdapter';
import { DeleteChoiceModal } from './DeleteChoiceModal';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  width: 100%;
  background-color: ${({ theme }) => theme.colors.background};
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
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'cancel' }>`
  display: flex;
  align-items: center;
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
    const { t, language } = useLanguage();
    const isNew = id === undefined;

    const [isEditing, setIsEditing] = useState(isNew);

    // Track Sidebar interactions via t parameter to ensure stable modal opening
    const tParam = searchParams.get('t');
    const prevTParam = useRef<string | null>(null);
    const currentAutosaveIdRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        currentAutosaveIdRef.current = undefined;
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

    const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
    const commentDraftRef = useRef<CommentDraft | null>(null);
    useEffect(() => { commentDraftRef.current = commentDraft; }, [commentDraft]);

    // Memoize drawing data extraction to prevent unnecessary re-computations or modal glitches
    const contentDrawingData = React.useMemo(() => {
        const match = content.match(/```fabric\s*([\s\S]*?)\s*```/);
        return match ? match[1] : undefined;
    }, [content]);

    const log = useLiveQuery(
        () => (id ? db.logs.get(Number(id)) : undefined),
        [id]
    );

    const models = useLiveQuery(() => db.models.orderBy('order').toArray());

    useEffect(() => {
        // Check for edit mode from URL first
        const shouldEdit = searchParams.get('edit') === 'true';

        if (log) {
            const loadData = async () => {
                setTitle(log.title);
                setContent(log.content);
                setTags(log.tags.join(', '));
                setModelId(log.modelId);
                setIsEditing(shouldEdit);
                setCommentDraft(null);
                return;
            };
            loadData();

            // Restoration prompt for existing log
            const checkExistingAutosave = async () => {
                if (!shouldEdit && !searchParams.get('comment') && searchParams.get('restore') !== 'true') return;
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
                        setTags(draft.tags.join(', '));
                        setModelId(draft.modelId);
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }
                    }
                }
            };
            checkExistingAutosave();
        } else if (isNew) {
            setTitle('');
            setContent('');
            setTags('');
            setEditingDrawingData(undefined);
            setEditingSpreadsheetData(undefined);
            setModelId(undefined);
            setCommentDraft(null);
            setIsEditing(true);

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
                        setTags(draft.tags.join(', '));
                        setModelId(draft.modelId);
                        if (draft.commentDraft) {
                            setCommentDraft(draft.commentDraft);
                        }
                    }
                }
            };
            checkNewAutosave();
        }

        if (searchParams.get('drawing') === 'true') {
            setIsFabricModalOpen(true);
        }
    }, [log, isNew, id, searchParams]);

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
                cModelId !== lastSavedState.current.modelId ||
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
    }, [id]); // Only depend on id to keep interval stable

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

            // Clear edit param if present to prevent re-entering edit mode
            if (searchParams.get('edit')) {
                navigate(`/log/${id}`, { replace: true });
            }
        } else {
            const newId = await db.logs.add({
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

        const threadId = log.threadId;
        const currentId = Number(id);

        await db.logs.delete(currentId);
        await db.comments.where('logId').equals(currentId).delete();

        let nextLogId: number | undefined = undefined;

        if (threadId) {
            const remainingLogs = await db.logs.where('threadId').equals(threadId).sortBy('threadOrder');

            if (remainingLogs.length > 0) {
                // Re-sequence remaining logs to ensure there's a 0 order and it's contiguous
                await db.transaction('rw', db.logs, async () => {
                    for (let i = 0; i < remainingLogs.length; i++) {
                        await db.logs.update(remainingLogs[i].id!, { threadOrder: i });
                    }
                });
                nextLogId = remainingLogs[0].id;
            }
        }

        setIsDeleteModalOpen(false);
        if (nextLogId) {
            navigate(`/log/${nextLogId}`, { replace: true });
        } else {
            navigate('/', { replace: true });
        }
    };

    const performDeleteThread = async () => {
        if (!log || !log.threadId) return;

        const threadId = log.threadId;
        const threadLogs = await db.logs.where('threadId').equals(threadId).toArray();
        const logIds = threadLogs.map(l => l.id!);

        await db.transaction('rw', [db.logs, db.comments], async () => {
            await db.logs.bulkDelete(logIds);
            for (const lid of logIds) {
                await db.comments.where('logId').equals(lid).delete();
            }
        });

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
            alert("Failed to add thread. Please try again.");
        }
    };

    const currentModelName = models?.find(m => m.id === modelId)?.name || t.log_detail.unknown_model;

    if (!isNew && !log) return <Container>{t.log_detail.loading}</Container>;

    return (
        <Container>
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

                <ActionBar>
                    {isEditing ? (
                        <>
                            <ActionButton $variant="primary" onClick={handleSave}>
                                <FiSave size={14} /> {t.log_detail.save}
                            </ActionButton>
                            {!isNew && (
                                <ActionButton onClick={() => {
                                    if (searchParams.get('edit')) {
                                        navigate(`/log/${id}`, { replace: true });
                                    }
                                    setIsEditing(false);
                                }}>
                                    <FiX size={14} /> {t.log_detail.cancel}
                                </ActionButton>
                            )}
                        </>
                    ) : (
                        <>
                            <ActionButton onClick={() => setIsEditing(true)}>
                                <FiEdit2 size={14} /> {t.log_detail.edit}
                            </ActionButton>
                            <ActionButton onClick={handleAddThread}>
                                <FiGitMerge size={14} /> {t.log_detail.add_thread}
                            </ActionButton>
                            <ActionButton $variant="danger" onClick={handleDelete}>
                                <FiTrash2 size={14} /> {t.log_detail.delete}
                            </ActionButton>
                            <ActionButton onClick={() => setIsShareModalOpen(true)}>
                                <FiShare2 size={14} /> {t.log_detail.share_log}
                            </ActionButton>
                        </>
                    )}
                </ActionBar>
            </Header>

            {isEditing ? (
                <ContentPadding>
                    <MarkdownEditor value={content} onChange={setContent} />
                </ContentPadding>
            ) : (
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
                    {!isNew && log && (
                        <CommentsSection
                            logId={log.id!}
                            initialEditingState={commentDraft}
                            onEditingChange={setCommentDraft}
                        />
                    )}
                </ContentPadding>
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
        </Container>
    );
};