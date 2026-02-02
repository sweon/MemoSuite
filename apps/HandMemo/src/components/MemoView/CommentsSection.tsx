import React, { useState, useEffect, useRef } from 'react';
import { useColorTheme, useConfirm, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CommentDraft } from '../../db';
import type { Comment } from '../../db';
import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';
import { FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiMessageSquare, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { format } from 'date-fns';

const YOUTUBE_TITLE_CACHE: Record<string, string> = {};

function findCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return "";
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        while (strings[i].indexOf(prefix) !== 0) {
            prefix = prefix.substring(0, prefix.length - 1);
            if (prefix === "") return "";
        }
    }
    return prefix;
}

function findCommonSuffix(strings: string[]): string {
    if (strings.length === 0) return "";
    let suffix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        while (!strings[i].endsWith(suffix)) {
            suffix = suffix.substring(1);
            if (suffix === "") return "";
        }
    }
    return suffix;
}

const fetchYoutubeTitle = async (videoId: string): Promise<string> => {
    if (YOUTUBE_TITLE_CACHE[videoId]) return YOUTUBE_TITLE_CACHE[videoId];
    try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (res.ok) {
            const data = await res.json();
            if (data.title) {
                YOUTUBE_TITLE_CACHE[videoId] = data.title;
                return data.title;
            }
        }
    } catch (e) { }
    return '';
};

const Section = styled.div`
  margin-top: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;

  @media print {
    border-top: none;
    padding-top: 0;
  }
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

  @media print {
    display: none !important;
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

    border-left-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }

  @media print {
    border-left: none;
    background: transparent;
    padding: 0;
    margin-bottom: 1rem;
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  @media print {
    display: none !important;
  }
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

    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}08;
  }

  @media print {
    display: none !important;
  }
`;

export interface CommentsSectionProps {
    memoId: number;
    initialEditingState?: CommentDraft | null;
    onEditingChange?: (state: CommentDraft | null) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
    memoId,
    initialEditingState,
    onEditingChange
}) => {
    const { theme } = useColorTheme();
    const { confirm } = useConfirm();
    const { t, language } = useLanguage();
    const comments = useLiveQuery(
        () => db.comments.where('memoId').equals(memoId).sortBy('createdAt'),
        [memoId]
    );

    const [isAdding, setIsAdding] = useState(initialEditingState?.isNew ?? false);
    const [newContent, setNewContent] = useState(initialEditingState?.isNew ? initialEditingState.content : '');

    const [editingId, setEditingId] = useState<number | null>(initialEditingState && !initialEditingState.isNew ? initialEditingState.commentId! : null);
    const [editContent, setEditContent] = useState(initialEditingState && !initialEditingState.isNew ? initialEditingState.content : '');

    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
    const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
    const [editingDrawingData, setEditingDrawingData] = useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = useState<any>(undefined);
    const [lastJumpedCommentId, setLastJumpedCommentId] = useState<number | null>(null);

    const scrollToPlayer = (content: string, commentId: number) => {
        let videoId = '';
        try {
            // Match youtu.be/ID or youtube.com/...v=ID
            const ytLike = content.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            if (ytLike) {
                videoId = ytLike[1];
            } else {
                // Fallback for cases where regex might miss but URL is present
                const urlStr = content.match(/https?:\/\/[^\s)]+/)?.[0];
                if (urlStr) {
                    const url = new URL(urlStr.replace('youtu.be/', 'youtube.com/watch?v='));
                    videoId = url.searchParams.get('v') || url.pathname.split('/').pop() || '';
                }
            }
        } catch (e) { }

        if (videoId && videoId.length === 11) {
            const el = document.getElementById(`yt-player-${videoId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setLastJumpedCommentId(commentId);
            }
        }
    };

    const scrollToComment = () => {
        if (lastJumpedCommentId) {
            const el = document.getElementById(`comment-${lastJumpedCommentId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    // Sync editing state up to parent for autosave
    const onEditingChangeRef = useRef(onEditingChange);
    useEffect(() => { onEditingChangeRef.current = onEditingChange; }, [onEditingChange]);

    useEffect(() => {
        if (!onEditingChangeRef.current) return;

        if (isAdding) {
            onEditingChangeRef.current({
                content: newContent,
                isNew: true
            });
        } else if (editingId) {
            onEditingChangeRef.current({
                commentId: editingId,
                content: editContent,
                isNew: false
            });
        } else {
            onEditingChangeRef.current(null);
        }
    }, [isAdding, newContent, editingId, editContent]);

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

    const handleStartAdding = async () => {
        setIsAdding(true);
        try {
            const lastActiveStr = localStorage.getItem('yt_last_active');
            if (!lastActiveStr) return;

            const { videoId: activeVideoId, time, timestamp } = JSON.parse(lastActiveStr);
            // Ignore if more than 30 minutes old
            if (Date.now() - timestamp > 30 * 60 * 1000) return;

            // Verify if this video is in the current memo
            const memo = await db.memos.get(memoId);
            if (!memo || !memo.content.includes(activeVideoId)) return;

            // Check if there are other YouTube videos in the memo
            const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/g;
            const allVideoIds = Array.from(new Set(Array.from(memo.content.matchAll(ytRegex)).map(m => m[1])));

            let prefixLabel = '';
            if (allVideoIds.length > 1) {
                // Fetch titles for all videos to find unique parts
                const titles: Record<string, string> = {};
                await Promise.all(allVideoIds.map(async (id) => {
                    titles[id] = await fetchYoutubeTitle(id);
                }));

                const validTitles = allVideoIds.map(id => titles[id]).filter(Boolean);
                if (validTitles.length > 1) {
                    const commonPrefix = findCommonPrefix(validTitles);
                    const commonSuffix = findCommonSuffix(validTitles.map(t => t.substring(commonPrefix.length)));

                    const activeTitle = titles[activeVideoId] || '';
                    if (activeTitle) {
                        let unique = activeTitle.substring(commonPrefix.length);
                        if (commonSuffix.length > 0) {
                            unique = unique.substring(0, unique.length - commonSuffix.length);
                        }
                        unique = unique.trim();
                        if (unique) {
                            prefixLabel = unique.substring(0, 10).trim() + ' ';
                        }
                    }
                }
            }

            // Format time
            const hours = Math.floor(time / 3600);
            const mins = Math.floor((time % 3600) / 60);
            const secs = time % 60;
            const timeStr = hours > 0
                ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            const link = `[${prefixLabel}${timeStr}](https://youtu.be/${activeVideoId}?t=${time}) `;
            setNewContent(prev => (prev.trim() ? link + '\n\n' + prev : link));
        } catch (e) {
            console.error('Failed to auto-insert YT link', e);
        }
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



    return (
        <Section>
            <SectionHeader>
                <FiMessageSquare size={20} color={theme.colors.primary} />
                <h3>{t.comments.title}</h3>
                {comments && comments.length > 0 && (
                    <span className="count">{comments.length}</span>
                )}
                {lastJumpedCommentId && (
                    <ActionIcon
                        onClick={scrollToComment}
                        title={t.comments.scroll_to_comment}
                        style={{ marginLeft: 'auto', opacity: 1 }}
                    >
                        <FiArrowDown />
                    </ActionIcon>
                )}
            </SectionHeader>

            <CommentList>
                {comments?.map(c => (
                    <CommentItem key={c.id} id={`comment-${c.id}`}>
                        <CommentHeader>
                            <span>{format(c.createdAt, language === 'ko' ? 'yyyy년 M월 d일 HH:mm' : 'MMM d, yyyy HH:mm')}</span>
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
                                        {c.content.match(/youtube\.com|youtu\.be/) && (
                                            <ActionIcon onClick={() => scrollToPlayer(c.content, c.id!)} title={t.comments.scroll_to_video}>
                                                <FiArrowUp />
                                            </ActionIcon>
                                        )}
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
                                    {editContent.match(/youtube\.com|youtu\.be/) && (
                                        <HeaderButton onClick={() => scrollToPlayer(editContent, editingId!)} title={t.comments.scroll_to_video} $variant="secondary">
                                            <FiArrowUp />
                                        </HeaderButton>
                                    )}
                                    <HeaderButton onClick={() => setEditingId(null)} $variant="secondary">{t.comments.cancel}</HeaderButton>
                                    <HeaderButton onClick={saveEdit} $variant="primary">{t.comments.save_comment}</HeaderButton>
                                </EditorHeader>
                                <MarkdownEditor value={editContent} onChange={setEditContent} />
                            </div>
                        ) : (
                            <MarkdownView
                                content={c.content}
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
                        {newContent.match(/youtube\.com|youtu\.be/) && (
                            <HeaderButton onClick={() => scrollToPlayer(newContent, -1)} title={t.comments.scroll_to_video} $variant="secondary">
                                <FiArrowUp />
                            </HeaderButton>
                        )}
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
            {isFabricModalOpen && activeCommentId && (
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
                        } else {
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
                        } else {
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
                    if (activeCommentId) {
                        const json = JSON.stringify(data);
                        const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
                        let found = false;
                        const targetRaw = JSON.stringify(editingSpreadsheetData).trim();

                        if (editingId === activeCommentId) {
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
                        } else {
                            const comment = await db.comments.get(activeCommentId);
                            if (comment) {
                                const updatedContent = editingSpreadsheetData
                                    ? comment.content.replace(spreadsheetRegex, (match: string, p1: string) => {
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
                    }
                    setIsSpreadsheetModalOpen(false);
                    setActiveCommentId(null);
                    setEditingSpreadsheetData(undefined);
                }}
                onAutosave={async (data) => {
                    if (activeCommentId) {
                        const json = JSON.stringify(data);
                        const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
                        let found = false;
                        const targetRaw = JSON.stringify(editingSpreadsheetData).trim();

                        if (editingId === activeCommentId) {
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
                        } else {
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
                    }
                }}
                initialData={editingSpreadsheetData}
                language={language as 'en' | 'ko'}
            />
        </Section>
    );
};