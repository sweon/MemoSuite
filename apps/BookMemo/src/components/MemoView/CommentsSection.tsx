import React from 'react';
import { useColorTheme, useConfirm, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Comment, type CommentDraft } from '../../db';
import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiMessageSquare, FiImage, FiGrid } from 'react-icons/fi';
import { format } from 'date-fns';

import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';

const Section = styled.div`
  margin-top: 0;
  border-top: 2px solid ${({ theme }) => theme.colors.border};
  padding-top: 2.5rem;
  padding-bottom: 2.5rem;
  padding-left: 32px;
  padding-right: 32px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.text};
  }
  
  .count {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textSecondary};
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const CommentItem = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 1.25rem;
  background: ${({ theme }) => theme.colors.surface};
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const ActionIcon = styled.button<{ $variant?: 'danger' | 'primary' }>`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme, $variant }) => $variant === 'danger' ? theme.colors.danger : theme.colors.primary};
  }
`;

const EditorContainer = styled.div`
  margin-top: 1rem;
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  animation: slideDown 0.2s ease-out;

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const HeaderButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${({ theme, $variant }) => $variant === 'primary' ? theme.colors.primary : 'transparent'};
  color: ${({ theme, $variant }) => $variant === 'primary' ? 'white' : theme.colors.text};
  border: ${({ theme, $variant }) => $variant === 'primary' ? 'none' : `1px solid ${theme.colors.border}`};

  &:hover {
    filter: brightness(1.1);
    ${({ theme, $variant }) => $variant !== 'primary' && `background: ${theme.colors.border};`}
  }
`;

const AddButton = styled.button`
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 2px dashed ${({ theme }) => theme.colors.border};
  width: 100%;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

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

    const handleOpenFabricForNew = () => {
        setActiveCommentId(-1);
        setEditingDrawingData(undefined);
        setIsFabricModalOpen(true);
    };

    const handleOpenSpreadsheetForNew = () => {
        setActiveCommentId(-1);
        setEditingSpreadsheetData(undefined);
        setIsSpreadsheetModalOpen(true);
    };

    const handleOpenFabricForEdit = (id: number, drawingJson?: string) => {
        setActiveCommentId(id);
        setEditingDrawingData(drawingJson);
        setIsFabricModalOpen(true);
    };

    const handleOpenSpreadsheetForEdit = (id: number, sheetData?: any) => {
        setActiveCommentId(id);
        setEditingSpreadsheetData(sheetData);
        setIsSpreadsheetModalOpen(true);
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
                    <CommentItem key={c.id}>
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
                                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                        <HeaderButton onClick={() => handleOpenFabricForEdit(c.id!, editingId === c.id ? undefined : undefined)} title={t.memo_detail.add_drawing}>
                                            <FiImage />
                                        </HeaderButton>
                                        <HeaderButton onClick={() => handleOpenSpreadsheetForEdit(c.id!, editingId === c.id ? undefined : undefined)} title={t.memo_detail.add_spreadsheet}>
                                            <FiGrid />
                                        </HeaderButton>
                                    </div>
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
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                            <HeaderButton onClick={handleOpenFabricForNew} title={t.memo_detail.add_drawing}>
                                <FiImage />
                            </HeaderButton>
                            <HeaderButton onClick={handleOpenSpreadsheetForNew} title={t.memo_detail.add_spreadsheet}>
                                <FiGrid />
                            </HeaderButton>
                        </div>
                        <HeaderButton onClick={() => setIsAdding(false)} $variant="secondary">{t.comments.cancel}</HeaderButton>
                        <HeaderButton onClick={handleAdd} $variant="primary">{t.comments.save_comment}</HeaderButton>
                    </EditorHeader>
                    <MarkdownEditor
                        value={newContent}
                        onChange={setNewContent}
                    />
                </EditorContainer>
            ) : (
                <AddButton onClick={() => setIsAdding(true)}>
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