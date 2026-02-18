import React from 'react';
import { useColorTheme, useConfirm, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Comment, type CommentDraft } from '../../db';
import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiMessageSquare, FiArrowUp } from 'react-icons/fi';
import { format } from 'date-fns';

import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';

const Section = styled.div`
  margin-top: 0;
  padding-bottom: 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  
  h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .count {
    background: ${({ theme }) => theme.colors.primary}15;
    color: ${({ theme }) => theme.colors.primary};
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 700;
  }
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CommentItem = styled.div`
  border-left: 3px solid ${({ theme }) => theme.colors.primary}40;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 0 8px 8px 0;
  transition: all 0.15s ease;

  &:hover {
    border-left-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.125rem;
  opacity: 0.6;
  transition: opacity 0.15s;

  ${CommentItem}:hover & {
    opacity: 1;
  }
`;

const ActionIcon = styled.button<{ $variant?: 'danger' | 'primary' }>`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme, $variant }) => $variant === 'danger' ? theme.colors.danger : theme.colors.primary};
  }
`;

const EditorContainer = styled.div`
  margin-top: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.primary}60;
  border-radius: 8px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const HeaderButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  
  background: ${({ theme, $variant }) => $variant === 'primary' ? theme.colors.primary : 'transparent'};
  color: ${({ theme, $variant }) => $variant === 'primary' ? 'white' : theme.colors.textSecondary};
  border: ${({ theme, $variant }) => $variant === 'primary' ? 'none' : `1px solid ${theme.colors.border}`};

  &:hover {
    filter: brightness(1.1);
    ${({ theme, $variant }) => $variant !== 'primary' && `background: ${theme.colors.border};`}
  }
`;

const AddButton = styled.button`
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  width: 100%;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}08;
  }
`;

const YOUTUBE_TITLE_CACHE: Record<string, string> = {};

const fetchYoutubeTitle = async (videoId: string): Promise<string | null> => {
    if (YOUTUBE_TITLE_CACHE[videoId]) return YOUTUBE_TITLE_CACHE[videoId];
    try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (response.ok) {
            const data = await response.json();
            if (data.title) {
                YOUTUBE_TITLE_CACHE[videoId] = data.title;
                return data.title;
            }
        }
    } catch (e) { }
    return null;
};

export const CommentsSection: React.FC<{
    memoId: number,
    onEditingChange?: (draft: CommentDraft | null) => void,
    initialEditingState?: CommentDraft | null
}> = ({ memoId, onEditingChange, initialEditingState }) => {
    const { theme } = useColorTheme();
    const { confirm } = useConfirm();
    const { t, language } = useLanguage();
    const comments = useLiveQuery(
        () => db.comments.where('memoId').equals(memoId).sortBy('createdAt'),
        [memoId]
    );

    const [isAdding, setIsAdding] = React.useState(false);
    const [newContent, setNewContent] = React.useState('');

    const [editingId, setEditingId] = React.useState<number | null>(null);
    const [editContent, setEditContent] = React.useState('');

    const [isFabricModalOpen, setIsFabricModalOpen] = React.useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = React.useState(false);
    const [activeCommentId, setActiveCommentId] = React.useState<number | null>(null);
    const [editingDrawingData, setEditingDrawingData] = React.useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = React.useState<any>(undefined);

    const [lastJumpedCommentId, setLastJumpedCommentId] = React.useState<number | null>(null);

    const scrollToPlayer = (content: string, commentId: number) => {
        let videoId = '';
        try {
            const ytLike = content.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            if (ytLike) videoId = ytLike[1];
        } catch (e) { }

        if (videoId && videoId.length === 11) {
            const el = document.getElementById(`yt-player-container-${videoId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setLastJumpedCommentId(commentId);
                window.dispatchEvent(new CustomEvent('yt-jump-success', { detail: { videoId, commentId } }));
            }
        }
    };

    const scrollToComment = (commentId?: number | null) => {
        const id = commentId ?? lastJumpedCommentId;
        if (!id) return;
        const el = document.getElementById(`comment-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.backgroundColor = theme.colors.primary + '15';
            setTimeout(() => {
                el.style.backgroundColor = 'transparent';
            }, 2000);
        }
    };

    React.useEffect(() => {
        const handleReturn = (e: any) => {
            if (e.detail?.commentId) scrollToComment(e.detail.commentId);
        };
        window.addEventListener('return-to-comment', handleReturn);
        return () => window.removeEventListener('return-to-comment', handleReturn);
    }, [theme.colors.primary]);

    // Initialize from initialEditingState
    React.useEffect(() => {
        if (initialEditingState) {
            if (initialEditingState.isNew) {
                setIsAdding(true);
                setNewContent(initialEditingState.content);
            } else {
                setEditingId(initialEditingState.commentId || null);
                setEditContent(initialEditingState.content);
            }
        }
    }, [initialEditingState]);

    // Report editing changes
    React.useEffect(() => {
        if (!onEditingChange) return;

        if (isAdding && newContent.trim()) {
            onEditingChange({
                content: newContent,
                isNew: true
            });
        } else if (editingId && editContent.trim()) {
            onEditingChange({
                commentId: editingId,
                content: editContent,
                isNew: false
            });
        } else {
            onEditingChange(null);
        }
    }, [isAdding, newContent, editingId, editContent, onEditingChange]);

    const handleAdd = async () => {
        if (!newContent.trim()) return;
        await db.comments.add({
            memoId,
            content: newContent,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        setNewContent('');
        setIsAdding(false);
    };

    const handleDelete = async (id: number) => {
        if (await confirm({ message: t.comments.delete_confirm, isDestructive: true })) {
            await db.comments.delete(id);
        }
    };

    const startEdit = (c: Comment) => {
        setEditingId(c.id!);
        setEditContent(c.content);
    };

    const saveEdit = async () => {
        if (editingId && editContent.trim()) {
            await db.comments.update(editingId, {
                content: editContent,
                updatedAt: new Date()
            });
            setEditingId(null);
            setEditContent('');
        }
    };

    const handleStartAdding = async () => {
        setIsAdding(true);
        const lastActive = localStorage.getItem('yt_last_active');
        if (lastActive) {
            try {
                const { videoId, time, timestamp } = JSON.parse(lastActive);
                if (Date.now() - timestamp < 1000 * 60 * 60) {
                    const videoTitle = await fetchYoutubeTitle(videoId);
                    const timeStr = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
                    const videoLink = `[${videoTitle ? `${videoTitle} (${timeStr})` : timeStr}](https://www.youtube.com/watch?v=${videoId}&t=${time})`;

                    if (newContent.trim()) {
                        setNewContent(prev => prev.trim() + '\n' + videoLink);
                    } else {
                        setNewContent(videoLink);
                    }
                }
            } catch (e) { }
        }
    };

    return (
        <Section>
            <SectionHeader>
                <FiMessageSquare size={20} color={theme.colors.primary} />
                <h3>{t.comments.title}</h3>
                {comments && comments.length > 0 && (
                    <span className="count">{comments.length}</span>
                )}
            </SectionHeader>

            <CommentList>
                {comments?.map(c => (
                    <CommentItem key={c.id} id={`comment-${c.id}`}>
                        <CommentHeader>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {format(c.createdAt, language === 'ko' ? 'yyyy년 M월 d일 HH:mm' : 'MMM d, yyyy HH:mm')}
                                {(c.content.includes('youtube.com') || c.content.includes('youtu.be')) && (
                                    <button
                                        onClick={() => scrollToPlayer(c.content, c.id!)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: theme.colors.primary,
                                            cursor: 'pointer',
                                            padding: '2px 4px',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}
                                    >
                                        <FiArrowUp size={12} style={{ marginRight: '2px' }} /> {language === 'ko' ? '영상 이동' : 'Jump to Video'}
                                    </button>
                                )}
                            </span>
                            <Actions>
                                {editingId === c.id ? (
                                    <>
                                        <ActionIcon onClick={saveEdit} $variant="primary" title={t.comments.save_comment}>
                                            <FiSave />
                                        </ActionIcon>
                                        <ActionIcon onClick={() => setEditingId(null)} title={t.comments.cancel}>
                                            <FiX />
                                        </ActionIcon>
                                    </>
                                ) : (
                                    <>
                                        <ActionIcon onClick={() => startEdit(c)} title={t.memo_detail.edit}>
                                            <FiEdit2 />
                                        </ActionIcon>
                                        <ActionIcon onClick={() => handleDelete(c.id!)} $variant="danger" title={t.memo_detail.delete}>
                                            <FiTrash2 />
                                        </ActionIcon>
                                    </>
                                )}
                            </Actions>
                        </CommentHeader>

                        {editingId === c.id ? (
                            <div style={{ marginTop: '0.5rem' }}>
                                <EditorHeader style={{ padding: '0.5rem', borderRadius: '8px 8px 0 0' }}>
                                    <HeaderButton onClick={() => setEditingId(null)} $variant="secondary">{t.comments.cancel}</HeaderButton>
                                    <HeaderButton onClick={saveEdit} $variant="primary">{t.comments.save_comment}</HeaderButton>
                                </EditorHeader>
                                <MarkdownEditor value={editContent} onChange={setEditContent} />
                            </div>
                        ) : (
                            <MarkdownView
                                content={c.content}
                                memoId={memoId}
                                isComment={true}
                                tableHeaderBg={theme.colors.border}
                                onEditDrawing={(json) => {
                                    setActiveCommentId(c.id!);
                                    setEditingDrawingData(json);
                                    setIsFabricModalOpen(true);
                                }}
                                onEditSpreadsheet={(json) => {
                                    try {
                                        setActiveCommentId(c.id!);
                                        setEditingSpreadsheetData(JSON.parse(json));
                                        setIsSpreadsheetModalOpen(true);
                                    } catch (e) {
                                        console.error('Failed to parse spreadsheet JSON for editing', e);
                                    }
                                }}
                            />
                        )}
                    </CommentItem>
                ))}
            </CommentList>

            {isAdding ? (
                <EditorContainer>
                    <EditorHeader>
                        <div style={{ flex: 1 }} />
                        <HeaderButton onClick={() => setIsAdding(false)} $variant="secondary">{t.comments.cancel}</HeaderButton>
                        <HeaderButton onClick={handleAdd} $variant="primary">{t.comments.save_comment}</HeaderButton>
                    </EditorHeader>
                    <MarkdownEditor
                        value={newContent}
                        onChange={setNewContent}
                    />
                </EditorContainer>
            ) : (
                <AddButton onClick={handleStartAdding}>
                    <FiPlus /> {t.comments.add_button}
                </AddButton>
            )}
            {isFabricModalOpen && (
                <FabricCanvasModal
                    language={language}
                    initialData={editingDrawingData}
                    onSave={async (json: string) => {
                        const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;
                        let found = false;

                        if (editingId === activeCommentId) {
                            const updatedContent = editingDrawingData
                                ? editContent.replace(fabricRegex, (match, p1) => {
                                    if (!found && p1.trim() === editingDrawingData.trim()) {
                                        found = true;
                                        return `\`\`\`fabric\n${json}\n\`\`\``;
                                    }
                                    return match;
                                })
                                : (editContent.trim() ? `${editContent}\n\n\`\`\`fabric\n${json}\n\`\`\`` : `\`\`\`fabric\n${json}\n\`\`\``);
                            setEditContent(updatedContent);
                        } else if (isAdding && activeCommentId === -1) {
                            const updatedContent = editingDrawingData
                                ? newContent.replace(fabricRegex, (match, p1) => {
                                    if (!found && p1.trim() === editingDrawingData.trim()) {
                                        found = true;
                                        return `\`\`\`fabric\n${json}\n\`\`\``;
                                    }
                                    return match;
                                })
                                : (newContent.trim() ? `${newContent}\n\n\`\`\`fabric\n${json}\n\`\`\`` : `\`\`\`fabric\n${json}\n\`\`\``);
                            setNewContent(updatedContent);
                        } else if (activeCommentId) {
                            const comment = await db.comments.get(activeCommentId);
                            if (comment) {
                                const finalContent = editingDrawingData
                                    ? comment.content.replace(fabricRegex, (match, p1) => {
                                        if (!found && p1.trim() === editingDrawingData.trim()) {
                                            found = true;
                                            return `\`\`\`fabric\n${json}\n\`\`\``;
                                        }
                                        return match;
                                    })
                                    : (comment.content.trim() ? `${comment.content}\n\n\`\`\`fabric\n${json}\n\`\`\`` : `\`\`\`fabric\n${json}\n\`\`\``);

                                await db.comments.update(activeCommentId, {
                                    content: finalContent,
                                    updatedAt: new Date()
                                });
                            }
                        }

                        setIsFabricModalOpen(false);
                        setActiveCommentId(null);
                        setEditingDrawingData(undefined);
                    }}
                    onAutosave={async (json: string) => {
                        const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;
                        let found = false;

                        if (editingId === activeCommentId) {
                            const updatedContent = editingDrawingData
                                ? editContent.replace(fabricRegex, (match, p1) => {
                                    if (!found && p1.trim() === editingDrawingData.trim()) {
                                        found = true;
                                        return `\`\`\`fabric\n${json}\n\`\`\``;
                                    }
                                    return match;
                                })
                                : (editContent.trim() ? `${editContent}\n\n\`\`\`fabric\n${json}\n\`\`\`` : `\`\`\`fabric\n${json}\n\`\`\``);
                            if (updatedContent !== editContent) setEditContent(updatedContent);
                        } else if (isAdding && activeCommentId === -1) {
                            const updatedContent = editingDrawingData
                                ? newContent.replace(fabricRegex, (match, p1) => {
                                    if (!found && p1.trim() === editingDrawingData.trim()) {
                                        found = true;
                                        return `\`\`\`fabric\n${json}\n\`\`\``;
                                    }
                                    return match;
                                })
                                : (newContent.trim() ? `${newContent}\n\n\`\`\`fabric\n${json}\n\`\`\`` : `\`\`\`fabric\n${json}\n\`\`\``);
                            if (updatedContent !== newContent) setNewContent(updatedContent);
                        } else if (activeCommentId) {
                            const comment = await db.comments.get(activeCommentId);
                            if (comment) {
                                const finalContent = editingDrawingData
                                    ? comment.content.replace(fabricRegex, (match, p1) => {
                                        if (!found && p1.trim() === editingDrawingData.trim()) {
                                            found = true;
                                            return `\`\`\`fabric\n${json}\n\`\`\``;
                                        }
                                        return match;
                                    })
                                    : (comment.content.trim() ? `${comment.content}\n\n\`\`\`fabric\n${json}\n\`\`\`` : `\`\`\`fabric\n${json}\n\`\`\``);

                                if (finalContent !== comment.content) {
                                    await db.comments.update(activeCommentId, {
                                        content: finalContent,
                                        updatedAt: new Date()
                                    });
                                }
                            }
                        }
                    }}
                    onClose={() => {
                        setIsFabricModalOpen(false);
                        setActiveCommentId(null);
                        setEditingDrawingData(undefined);
                    }}
                />
            )}

            <SpreadsheetModal
                isOpen={isSpreadsheetModalOpen}
                onClose={() => {
                    setIsSpreadsheetModalOpen(false);
                    setActiveCommentId(null);
                    setEditingSpreadsheetData(undefined);
                }}
                onSave={async (data: any) => {
                    const json = JSON.stringify(data);
                    const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
                    let found = false;
                    const targetRaw = editingSpreadsheetData ? JSON.stringify(editingSpreadsheetData).trim() : '';

                    if (activeCommentId === editingId) {
                        const updatedContent = editingSpreadsheetData
                            ? editContent.replace(spreadsheetRegex, (match, p1) => {
                                if (!found && p1.trim() === targetRaw) {
                                    found = true;
                                    return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                                }
                                return match;
                            })
                            : (editContent.trim() ? `${editContent}\n\n\`\`\`spreadsheet\n${json}\n\`\`\`` : `\`\`\`spreadsheet\n${json}\n\`\`\``);
                        setEditContent(updatedContent);
                    } else if (isAdding && activeCommentId === -1) {
                        const updatedContent = editingSpreadsheetData
                            ? newContent.replace(spreadsheetRegex, (match, p1) => {
                                if (!found && p1.trim() === targetRaw) {
                                    found = true;
                                    return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                                }
                                return match;
                            })
                            : (newContent.trim() ? `${newContent}\n\n\`\`\`spreadsheet\n${json}\n\`\`\`` : `\`\`\`spreadsheet\n${json}\n\`\`\``);
                        setNewContent(updatedContent);
                    } else if (activeCommentId) {
                        const comment = await db.comments.get(activeCommentId);
                        if (comment) {
                            const updatedContent = editingSpreadsheetData
                                ? comment.content.replace(spreadsheetRegex, (match, p1) => {
                                    if (!found && p1.trim() === targetRaw) {
                                        found = true;
                                        return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                                    }
                                    return match;
                                })
                                : (comment.content.trim() ? `${comment.content}\n\n\`\`\`spreadsheet\n${json}\n\`\`\`` : `\`\`\`spreadsheet\n${json}\n\`\`\``);

                            await db.comments.update(activeCommentId, {
                                content: updatedContent,
                                updatedAt: new Date()
                            });
                        }
                    }

                    setIsSpreadsheetModalOpen(false);
                    setActiveCommentId(null);
                    setEditingSpreadsheetData(undefined);
                }}
                onAutosave={async (data) => {
                    const json = JSON.stringify(data);
                    const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
                    let found = false;
                    const targetRaw = editingSpreadsheetData ? JSON.stringify(editingSpreadsheetData).trim() : '';

                    if (activeCommentId === editingId) {
                        const updatedEditContent = editingSpreadsheetData
                            ? editContent.replace(spreadsheetRegex, (match: string, p1: string) => {
                                if (!found && p1.trim() === targetRaw) {
                                    found = true;
                                    return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                                }
                                return match;
                            })
                            : (editContent.trim() ? `${editContent}\n\n\`\`\`spreadsheet\n${json}\n\`\`\`` : `\`\`\`spreadsheet\n${json}\n\`\`\``);
                        if (updatedEditContent !== editContent) setEditContent(updatedEditContent);
                    } else if (isAdding && activeCommentId === -1) {
                        const updatedNewContent = editingSpreadsheetData
                            ? newContent.replace(spreadsheetRegex, (match: string, p1: string) => {
                                if (!found && p1.trim() === targetRaw) {
                                    found = true;
                                    return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                                }
                                return match;
                            })
                            : (newContent.trim() ? `${newContent}\n\n\`\`\`spreadsheet\n${json}\n\`\`\`` : `\`\`\`spreadsheet\n${json}\n\`\`\``);
                        if (updatedNewContent !== newContent) setNewContent(updatedNewContent);
                    } else if (activeCommentId) {
                        const comment = await db.comments.get(activeCommentId);
                        if (comment) {
                            const updatedCommentContent = editingSpreadsheetData
                                ? comment.content.replace(spreadsheetRegex, (match: string, p1: string) => {
                                    if (!found && p1.trim() === targetRaw) {
                                        found = true;
                                        return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                                    }
                                    return match;
                                })
                                : (comment.content.trim() ? `${comment.content}\n\n\`\`\`spreadsheet\n${json}\n\`\`\`` : `\`\`\`spreadsheet\n${json}\n\`\`\``);

                            if (updatedCommentContent !== comment.content) {
                                await db.comments.update(activeCommentId, {
                                    content: updatedCommentContent,
                                    updatedAt: new Date()
                                });
                            }
                        }
                    }
                }}
                initialData={editingSpreadsheetData}
                language={language as 'en' | 'ko'}
            />
        </Section>
    );
};