import React, { useState } from 'react';
import { useColorTheme, useConfirm, useLanguage } from '@memosuite/shared';

import styled, { keyframes } from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Comment } from '../../db';
import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiMessageSquare } from 'react-icons/fi';
import { format } from 'date-fns';

import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';

const Section = styled.div`
  margin-top: 4rem;
  border-top: 2px solid ${({ theme }) => theme.colors.border};
  padding-top: 2.5rem;
  padding-bottom: 2.5rem;
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

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const EditorContainer = styled.div`
  margin-top: 1rem;
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  animation: ${slideDown} 0.2s ease-out;
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

export const CommentsSection: React.FC<{ logId: number }> = ({ logId }) => {
    const { theme } = useColorTheme();
    const { t, language } = useLanguage();
    const { confirm } = useConfirm();
    const comments = useLiveQuery(
        () => db.comments.where('logId').equals(logId).sortBy('createdAt'),
        [logId]
    );

    const [isAdding, setIsAdding] = useState(false);
    const [newContent, setNewContent] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');

    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
    const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
    const [editingDrawingData, setEditingDrawingData] = useState<string | undefined>(undefined);
    const [editingSpreadsheetData, setEditingSpreadsheetData] = useState<any>(undefined);
    const [editingSpreadsheetRaw, setEditingSpreadsheetRaw] = useState<string | undefined>(undefined);

    const handleAdd = async () => {
        if (!newContent.trim()) return;
        await db.comments.add({
            logId,
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
                    <CommentItem key={c.id}>
                        <CommentHeader>
                            <span>{format(c.createdAt, 'MMM d, yyyy HH:mm')}</span>
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
                                        <ActionIcon onClick={() => startEdit(c)} title={t.log_detail.edit}>
                                            <FiEdit2 />
                                        </ActionIcon>
                                        <ActionIcon onClick={() => handleDelete(c.id!)} $variant="danger" title={t.log_detail.delete}>
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
                                tableHeaderBg={theme.colors.border}
                                onEditDrawing={(json) => {
                                    setActiveCommentId(c.id!);
                                    setEditingDrawingData(json);
                                    setIsFabricModalOpen(true);
                                }}
                                onEditSpreadsheet={(json) => {
                                    try {
                                        setActiveCommentId(c.id!);
                                        setEditingSpreadsheetRaw(json);
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
            {isFabricModalOpen && activeCommentId && (
                <FabricCanvasModal
                    language={language}
                    initialData={editingDrawingData}
                    onSave={async (json: string) => {
                        const comment = await db.comments.get(activeCommentId);
                        if (comment) {
                            const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;
                            let found = false;
                            const newContent = comment.content.replace(fabricRegex, (match, p1) => {
                                if (!found && p1.trim() === editingDrawingData?.trim()) {
                                    found = true;
                                    return `\`\`\`fabric\n${json}\n\`\`\``;
                                }
                                return match;
                            });

                            await db.comments.update(activeCommentId, {
                                content: newContent,
                                updatedAt: new Date()
                            });
                        }
                        setIsFabricModalOpen(false);
                        setActiveCommentId(null);
                        setEditingDrawingData(undefined);
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
                    setEditingSpreadsheetRaw(undefined);
                }}
                onSave={async (data: any) => {
                    if (activeCommentId) {
                        const comment = await db.comments.get(activeCommentId);
                        if (comment) {
                            const json = JSON.stringify(data);
                            const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
                            let found = false;

                            const newContent = comment.content.replace(spreadsheetRegex, (match, p1) => {
                                if (editingSpreadsheetRaw && !found && p1.trim() === editingSpreadsheetRaw.trim()) {
                                    found = true;
                                    return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                                }
                                return match;
                            });

                            await db.comments.update(activeCommentId, {
                                content: newContent,
                                updatedAt: new Date()
                            });
                        }
                    }
                    setIsSpreadsheetModalOpen(false);
                    setActiveCommentId(null);
                    setEditingSpreadsheetData(undefined);
                    setEditingSpreadsheetRaw(undefined);
                }}
                initialData={editingSpreadsheetData}
                language={language as 'en' | 'ko'}
            />
        </Section>
    );
};