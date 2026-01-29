import React, { useState, useEffect, useRef } from 'react';
import { SyncModal, useLanguage, useConfirm } from '@memosuite/shared';

import styled from 'styled-components';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useSearch } from '../../contexts/SearchContext';

import { MarkdownEditor } from '../Editor/MarkdownEditor';
import { MarkdownView } from '../Editor/MarkdownView';
import { FiEdit2, FiTrash2, FiSave, FiX, FiShare2, FiArrowLeft, FiCalendar } from 'react-icons/fi';
import { format } from 'date-fns';
import { CommentsSection } from './CommentsSection';

import { bookMemoSyncAdapter } from '../../utils/backupAdapter';
import { DeleteChoiceModal } from './DeleteChoiceModal';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  width: 100%;
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
    const isNew = !id;

    // Guard Hook
    const { registerGuard, unregisterGuard } = useExitGuard();
    const [showExitToast, setShowExitToast] = useState(false);
    const lastBackPress = useRef(0);
    const isClosingRef = useRef(false);
    const { confirm } = useConfirm();

    const [isEditingInternal, setIsEditingInternal] = useState(isNew);

    const startEditing = () => {
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

    useEffect(() => {
        if (tParam && tParam !== prevTParam.current) {
            prevTParam.current = tParam;

            // Reset editing states for fresh requests
            setEditingDrawingData(undefined);
            setEditingSpreadsheetData(undefined);
            setEditingSpreadsheetRaw(undefined);

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
    const [editingSpreadsheetRaw, setEditingSpreadsheetRaw] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (isEditingInternal) {
            const guardId = 'memo-edit-guard';

            registerGuard(guardId, () => {
                if (isFabricModalOpen || isSpreadsheetModalOpen || isShareModalOpen || isDeleteModalOpen) {
                    return ExitGuardResult.CONTINUE;
                }

                if (isClosingRef.current) {
                    setIsEditingInternal(false);
                    return ExitGuardResult.ALLOW_NAVIGATION;
                }

                const now = Date.now();
                if (now - lastBackPress.current < 2000) {
                    isClosingRef.current = true;
                    setIsEditingInternal(false);
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

    useEffect(() => {
        const shouldEdit = searchParams.get('edit') === 'true';
        const autosaveId = searchParams.get('autosaveId');

        if (memo) {
            setTitle(memo.title);
            setContent(memo.content);
            setTags(memo.tags.join(', '));
            setPageNumber(memo.pageNumber?.toString() || '');
            setQuote(memo.quote || '');
            setDate(language === 'ko' ? format(memo.createdAt, 'yyyy. MM. dd.') : formatDateForInput(memo.createdAt));
            setIsEditing(shouldEdit);

            // Restoration prompt for existing memo
            const checkExistingAutosave = async () => {
                if (!shouldEdit) return;
                const existing = await db.autosaves
                    .where('originalId')
                    .equals(Number(id))
                    .reverse()
                    .sortBy('createdAt');

                if (existing.length > 0) {
                    const draft = existing[0];
                    if (draft.content !== memo.content || draft.title !== memo.title) {
                        if (await confirm({ message: t.memo_detail.autosave_restore_confirm })) {
                            setTitle(draft.title);
                            setContent(draft.content);
                            setTags(draft.tags.join(', '));
                            setPageNumber(draft.pageNumber?.toString() || '');
                            setQuote(draft.quote || '');
                        }
                    }
                }
            };
            checkExistingAutosave();

        } else if (isNew) {
            if (autosaveId) {
                const loadAutosave = async () => {
                    const as = await db.autosaves.get(Number(autosaveId));
                    if (as) {
                        setTitle(as.title);
                        setContent(as.content);
                        setTags(as.tags.join(', '));
                        setPageNumber(as.pageNumber?.toString() || '');
                        setQuote(as.quote || '');
                        setDate(language === 'ko' ? format(new Date(), 'yyyy. MM. dd.') : formatDateForInput(new Date()));
                        setIsEditing(true);
                    }
                };
                loadAutosave();
            } else {
                setTitle('');
                setContent('');
                setTags('');
                const p = searchParams.get('page');
                setPageNumber(p || '');
                setQuote('');
                setEditingDrawingData(undefined);
                setEditingSpreadsheetData(undefined);
                setEditingSpreadsheetRaw(undefined);
                setDate(language === 'ko' ? format(new Date(), 'yyyy. MM. dd.') : formatDateForInput(new Date()));
                setIsEditing(true);

                if (searchParams.get('drawing') === 'true') {
                    setIsFabricModalOpen(true);
                }

                // Restoration prompt for new memo
                const checkNewAutosave = async () => {
                    const targetBookId = bookId ? Number(bookId) : undefined;
                    const latest = await db.autosaves
                        .filter(a => a.originalId === undefined && a.bookId === targetBookId)
                        .reverse()
                        .sortBy('createdAt');

                    if (latest.length > 0) {
                        const draft = latest[0];
                        if (draft.content.trim() || draft.title.trim()) {
                            if (await confirm({ message: t.memo_detail.autosave_restore_confirm })) {
                                setTitle(draft.title);
                                setContent(draft.content);
                                setTags(draft.tags.join(', '));
                                setPageNumber(draft.pageNumber?.toString() || '');
                                setQuote(draft.quote || '');
                            }
                        }
                    }
                };
                checkNewAutosave();
            }
        }
    }, [memo, isNew, searchParams, language]);

    useEffect(() => {
        if (isNew && book?.currentPage && !searchParams.get('page')) {
            setPageNumber(prev => (prev === '' ? book.currentPage!.toString() : prev));
        }
    }, [isNew, book?.currentPage, searchParams]);

    const lastSavedState = useRef({ title, content, tags, pageNumber, quote });

    useEffect(() => {
        if (!isEditing || localStorage.getItem('editor_autosave') === 'false') return;

        const interval = setInterval(async () => {
            const currentTagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
            const lastTagArray = lastSavedState.current.tags.split(',').map(t => t.trim()).filter(Boolean);

            const hasChanged = title !== lastSavedState.current.title ||
                content !== lastSavedState.current.content ||
                pageNumber !== lastSavedState.current.pageNumber ||
                quote !== lastSavedState.current.quote ||
                JSON.stringify(currentTagArray) !== JSON.stringify(lastTagArray);

            if (!hasChanged) return;
            if (!title.trim() && !content.trim() && !quote.trim()) return;

            lastSavedState.current = { title, content, tags, pageNumber, quote };

            await db.autosaves.add({
                originalId: id ? Number(id) : undefined,
                bookId: bookId ? Number(bookId) : memo?.bookId,
                title,
                content,
                tags: currentTagArray,
                pageNumber: pageNumber ? parseInt(pageNumber, 10) : undefined,
                quote,
                createdAt: new Date()
            });

            // Keep only latest 20 autosaves
            const allAutosaves = await db.autosaves.orderBy('createdAt').toArray();
            if (allAutosaves.length > 20) {
                const toDelete = allAutosaves.slice(0, allAutosaves.length - 20);
                await db.autosaves.bulkDelete(toDelete.map(a => a.id!));
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [isEditing, title, content, tags, pageNumber, quote, id, bookId, memo]);

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
            setIsEditing(false);
        } else {
            const newId = await db.memos.add({
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

            // If we loaded from an autosave, delete it
            const autosaveId = searchParams.get('autosaveId');
            if (autosaveId) {
                await db.autosaves.delete(Number(autosaveId));
            } else {
                // Also cleanup any "new memo" autosaves for this book
                await db.autosaves.where('bookId').equals(targetBookId || -1).filter(a => a.originalId === undefined).delete();
            }

            navigate(`/book/${targetBookId}/memo/${newId}`);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setIsDeleteModalOpen(true);
    };

    const performDeleteMemoOnly = async () => {
        if (!id) return;
        const bookIdToRedirect = memo?.bookId;

        await db.memos.delete(Number(id));
        await db.comments.where('memoId').equals(Number(id)).delete();

        setIsDeleteModalOpen(false);
        if (bookIdToRedirect) {
            navigate(`/book/${bookIdToRedirect}`, { replace: true });
        } else {
            navigate('/', { replace: true });
        }
    };

    if (!isNew && !memo) return <Container>{t.memo_detail.loading}</Container>;

    return (
        <Container>
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

                {isEditing ? (
                    <QuoteInput
                        placeholder="Quote from book (optional)..."
                        value={quote}
                        onChange={e => setQuote(e.target.value)}
                    />
                ) : (
                    quote && <QuoteDisplay>“{quote}”</QuoteDisplay>
                )}

                <ActionBar>
                    {isEditing ? (
                        <>
                            <ActionButton
                                $variant="primary"
                                onClick={handleSave}
                                disabled={
                                    (!title.trim() && !pageNumber && !content.trim() && !quote.trim()) ||
                                    (!!quote.trim() && !pageNumber)
                                }
                                style={{
                                    opacity: ((!title.trim() && !pageNumber && !content.trim() && !quote.trim()) || (!!quote.trim() && !pageNumber)) ? 0.5 : 1,
                                    cursor: ((!title.trim() && !pageNumber && !content.trim() && !quote.trim()) || (!!quote.trim() && !pageNumber)) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <FiSave size={14} /> {t.memo_detail.save}
                            </ActionButton>
                            {!isNew && (
                                <>
                                    <ActionButton $variant="danger" onClick={handleDelete}>
                                        <FiTrash2 size={14} /> {t.memo_detail.delete}
                                    </ActionButton>
                                    <ActionButton onClick={() => {
                                        if (searchParams.get('edit')) {
                                            navigate(`/memo/${id}`, { replace: true });
                                        }
                                        setIsEditing(false);
                                    }}>
                                        <FiX size={14} /> {t.memo_detail.cancel}
                                    </ActionButton>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <ActionButton onClick={() => setIsEditing(true)}>
                                <FiEdit2 size={14} /> {t.memo_detail.edit}
                            </ActionButton>
                            <ActionButton $variant="danger" onClick={handleDelete}>
                                <FiTrash2 size={14} /> {t.memo_detail.delete}
                            </ActionButton>
                            <ActionButton onClick={() => setIsShareModalOpen(true)}>
                                <FiShare2 size={14} /> {t.memo_detail.share_memo}
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
                                    setEditingSpreadsheetRaw(json);
                                    setEditingSpreadsheetData(JSON.parse(json));
                                    setIsSpreadsheetModalOpen(true);
                                } catch (e) {
                                    console.error('Failed to parse spreadsheet JSON for editing', e);
                                }
                            }}
                        />
                    </ContentPadding>
                    <ContentPadding>
                        {!isNew && memo && <CommentsSection memoId={memo.id!} />}
                    </ContentPadding>
                </>
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

            {showExitToast && (
                <Toast
                    variant="warning"
                    position="centered"
                    icon={<FiAlertTriangle size={14} />}
                    message={t.android?.exit_warning || "Press back again\nto exit editing."}
                    onClose={() => setShowExitToast(false)}
                />
            )}

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

                    if (editingSpreadsheetRaw) {
                        let found = false;
                        const targetRaw = editingSpreadsheetRaw.trim();
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
                    setEditingSpreadsheetRaw(undefined);
                }}
                initialData={editingSpreadsheetData}
                language={language as 'en' | 'ko'}
            />
        </Container>
    );
};