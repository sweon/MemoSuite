import React, { useMemo, useRef, useState } from 'react';
import { ThreadableList, useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams, useNavigate, useLocation, Outlet, useOutletContext } from 'react-router-dom';
import { db } from '../../db';
import { FiEdit2, FiEdit3, FiTrash2, FiRotateCcw, FiMaximize, FiChevronLeft, FiChevronRight, FiFolder } from 'react-icons/fi';
import { format } from 'date-fns';
import { BookMoveModal } from '../FolderView/BookMoveModal';
import { useFolder } from '../../contexts/FolderContext';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceArea
} from 'recharts';

import type { DropResult } from '@hello-pangea/dnd';

const Container = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
`;

const LeftPane = styled.div<{ $isMemoOpen: boolean }>`
  display: ${props => props.$isMemoOpen ? 'none' : 'flex'};
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  transition: all 0.2s ease;
`;

const RightPane = styled.div`
  flex: 1;
  height: 100%;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
`;

const Header = styled.div`
  padding: 1rem 2rem 2rem 2rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 768px) {
    padding: 1rem 0.5rem 1.5rem 0.5rem;
  }
`;

const BookTitle = styled.h1`
  margin: 0 0 0.25rem 0;
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.primary};
`;
const MetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  white-space: normal;
  flex-wrap: wrap;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const ProgressSection = styled.div`
  margin-top: 0.5rem;
`;

const ProgressBar = styled.div<{ $percent: number }>`
  height: 8px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  margin-top: 0.5rem;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.$percent}%;
    background: ${({ theme }) => theme.colors.primary};
    transition: width 0.3s ease;
  }
`;

const GraphContainer = styled.div`
  position: relative;
  height: 420px;
  width: 100%;
  margin-top: 0.5rem;
  padding-right: 20px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  outline: none;
  
  @media (max-width: 768px) {
    height: 360px;
    padding-right: 10px;
    margin-top: 1rem;
  }

  & .recharts-wrapper {
    outline: none;
  }
`;

const MemoListSection = styled.div`
  padding: 2rem;
  flex: 1;
`;

const MemoCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Quote = styled.div`
  font-style: italic;
  color: ${({ theme }) => theme.colors.textSecondary};
  border-left: 3px solid ${({ theme }) => theme.colors.primary};
  padding-left: 1rem;
  margin-bottom: 1rem;
  line-height: 1.6;
`;

const MemoContent = styled.div`
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
`;

const PageMeta = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 0.5rem;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
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

const MiniPillButton = styled.button`
  height: 22px;
  padding: 0 0.5rem;
  border-radius: 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background}dd;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  font-size: 0.6rem;
  font-weight: 500;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    stroke-width: 2.5px;
  }
`;

const MemoTooltipContent = ({ data }: { data: any }) => {
  const { language } = useLanguage();
  if (!data) return null;

  const dateStr = format(new Date(data.x), language === 'ko' ? 'yyyy년 M월 d일 HH:mm' : 'MMM d, yyyy HH:mm');

  let typeLabel = '';
  if (data.displayType === 1) typeLabel = ''; // Hide "Progress Record" label
  else if (data.displayType === 2) typeLabel = 'Current Page Memo';
  else if (data.displayType === 3) typeLabel = 'Past Page Memo (Interpolated)';
  else if (data.displayType === 4) typeLabel = 'Whole Book Memo';
  else if (data.displayType === 0) typeLabel = 'Start';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      padding: '8px 12px',
      border: 'none',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      color: '#fff',
      pointerEvents: 'none',
      zIndex: 100
    }}>
      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.85em' }}>
        {dateStr}
      </p>
      {data.pageNumber > 0 && (
        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.8em' }}>
          Page {data.pageNumber}
        </p>
      )}
      {typeLabel && (
        <p style={{ margin: '2px 0 0 0', fontSize: '0.75em', color: data.color }}>
          {typeLabel}
        </p>
      )}
      {data.title && <p style={{ margin: '4px 0 0 0', fontSize: '0.9em' }}>{data.title}</p>}
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return <MemoTooltipContent data={payload[0].payload} />;
  }
  return null;
};

export const BookDetail: React.FC = () => {
  const { bookId, id: memoId } = useParams<{ bookId: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();

  const [refAreaLeft, setRefAreaLeft] = useState<any>(null);
  const [refAreaRight, setRefAreaRight] = useState<any>(null);
  const [zoomDomain, setZoomDomain] = useState<[any, any] | null>(null);
  const [zoomHistory, setZoomHistory] = useState<[any, any][]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const lastMouseIndex = useRef<number | null>(null);

  // Hover state for global memos tooltip
  const [hoveredGlobalMemo, setHoveredGlobalMemo] = useState<{ data: any, top: number, left: number } | null>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const { currentFolder } = useFolder();
  const isReadOnly = currentFolder?.isReadOnly || false;
  const [isBookMoveModalOpen, setIsBookMoveModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setIsDirty, setAppIsEditing } = useOutletContext<{ setIsDirty: (d: boolean) => void; setAppIsEditing: (e: boolean) => void }>() || {};

  const numericBookId = Number(bookId);
  const book = useLiveQuery(() => isNaN(numericBookId) ? undefined : db.books.get(numericBookId), [numericBookId]);
  const memos = useLiveQuery(() =>
    isNaN(numericBookId) ? Promise.resolve([] as any[]) :
      db.memos
        .where('bookId')
        .equals(numericBookId)
        .reverse()
        .sortBy('createdAt')
    , [numericBookId]) || [];

  if (isNaN(numericBookId)) return null;

  const displayMemos = useMemo(() => {
    return memos?.filter(m => {
      const isProgress = m.type === 'progress' || (!m.title && !m.quote && (!m.content || m.content.trim() === '') && (m.pageNumber || 0) > 0);
      return !isProgress;
    })
      .sort((a, b) => {
        // Sort by 'order' first if available
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // If only one has order, put ordered ones first
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;

        // Fallback to Page -> CreatedAt
        if ((a.pageNumber || 0) !== (b.pageNumber || 0)) {
          return (a.pageNumber || 0) - (b.pageNumber || 0);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [memos]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    const newItems = [...displayMemos];
    const [removed] = newItems.splice(source.index, 1);
    newItems.splice(destination.index, 0, removed);

    // Update DB with new order
    await db.transaction('rw', db.memos, async () => {
      for (let i = 0; i < newItems.length; i++) {
        await db.memos.update(newItems[i].id, { order: i });
      }
    });
  };

  const { allChartData, globalMemos } = useMemo(() => {
    if (!memos || !book) return { allChartData: [], globalMemos: [] };

    const sorted = memos.map(m => ({
      x: m.createdAt.getTime(),
      pageNumber: m.pageNumber || 0,
      y: m.pageNumber || 0,
      id: m.id,
      title: m.title,
      type: m.type,
      hasTitle: !!(m.title && m.title.trim().length > 0),
      hasQuote: !!(m.quote && m.quote.trim().length > 0),
      hasContent: !!(m.content && m.content.trim().length > 0)
    })).sort((a, b) => a.x - b.x);

    const type1_progress: typeof sorted = [];
    const type2_current: typeof sorted = [];
    const type3_past: typeof sorted = [];
    const type4_global: typeof sorted = [];

    let maxPageSoFar = 0;
    const mainLinePoints: { x: number, y: number }[] = [{ x: book.startDate.getTime(), y: 0 }];

    for (const point of sorted) {
      if (point.y === 0) {
        type4_global.push(point);
      } else if (point.y >= maxPageSoFar) {
        maxPageSoFar = point.y;
        mainLinePoints.push({ x: point.x, y: point.y });

        const isProgressTitle = point.title && point.title.trim().toLowerCase() === 'progress record';

        if (isProgressTitle || (!point.hasTitle && !point.hasQuote)) {
          // Treat as Type 1 if title is "Progress Record" or if no title/quote
          type1_progress.push(point);
        } else {
          type2_current.push(point);
        }
      } else {
        type3_past.push(point);
      }
    }

    const type3_processed = type3_past.map(point => {
      const targetY = point.y;
      let lower = mainLinePoints[0];
      let upper = mainLinePoints[mainLinePoints.length - 1];

      for (let i = 0; i < mainLinePoints.length - 1; i++) {
        if (mainLinePoints[i].y <= targetY && mainLinePoints[i + 1].y >= targetY) {
          lower = mainLinePoints[i];
          upper = mainLinePoints[i + 1];
          break;
        }
      }

      let interpolatedX = lower.x;
      if (upper.y !== lower.y) {
        const ratio = (targetY - lower.y) / (upper.y - lower.y);
        interpolatedX = lower.x + ratio * (upper.x - lower.x);
      }

      return {
        ...point,
        x: interpolatedX,
        displayType: 3,
        color: '#009E73' // Bluish Green
      };
    });

    const type1_processed = type1_progress.map(p => ({ ...p, displayType: 1, color: '#0072B2' })); // Blue
    const type2_processed = type2_current.map(p => ({ ...p, displayType: 2, color: '#D55E00' })); // Vermilion

    const startPoint = {
      x: book.startDate.getTime(),
      y: 0,
      pageNumber: 0,
      displayType: 0,
      title: 'Started',
      color: '#999999',
      id: undefined,
      hasContent: false,
      hasTitle: false,
      hasQuote: false,
      type: undefined
    };

    const chartData = [
      startPoint,
      ...type1_processed,
      ...type2_processed,
      ...type3_processed
    ].sort((a, b) => a.x - b.x);

    // Global Memos (Type 4)
    // Simply return as list, sorted by time
    const globalMemos = type4_global.sort((a, b) => a.x - b.x).map(p => ({
      ...p,
      displayType: 4,
      color: '#CC79A7'
    }));

    return { allChartData: chartData, globalMemos };
  }, [memos, book]);

  // Adjust Y domain
  const yDomainMax = book ? book.totalPages : 100;

  React.useEffect(() => {
    if (!book) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (allChartData.length === 0) return;

      if (e.key === 'ArrowRight') {
        setFocusedIndex(prev => {
          const current = prev ?? -1;
          if (current + 1 < allChartData.length) return current + 1;
          return current;
        });
      } else if (e.key === 'ArrowLeft') {
        setFocusedIndex(prev => {
          const current = prev ?? allChartData.length;
          if (current - 1 >= 0) return current - 1;
          return current;
        });
      } else if (e.key === 'Enter') {
        if (focusedIndex !== null) {
          const data = allChartData[focusedIndex];
          if (data.id) handlePointClick(data);
        }
      } else if (e.key === 'Escape') {
        setFocusedIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allChartData, focusedIndex, book]);

  if (isDeleting || !book) {
    if (isDeleting) return null;
    return <div style={{ padding: '2rem' }}>{t.memo_detail.loading}</div>;
  }

  const progressPercent = Math.round(((book.currentPage || 0) / book.totalPages) * 100);

  const handleDelete = async () => {
    if (confirm(t.book_detail.confirm_delete)) {
      setIsDeleting(true);
      // Delete associated memos first
      const associatedMemos = await db.memos.where('bookId').equals(book.id!).toArray();
      await db.memos.bulkDelete(associatedMemos.map(m => m.id!));
      await db.books.delete(book.id!);

      // Clear last book/memo IDs to prevent auto-redirect by EmptyState
      localStorage.removeItem('bookmemo_last_book_id');
      localStorage.removeItem('bookmemo_last_memo_id');

      navigate('/');
    }
  };

  const handlePointClick = (data: any, index?: number) => {
    if (index !== undefined) {
      setFocusedIndex(index);
      lastMouseIndex.current = index;
    }

    if (data.id) {
      // If it's just progress, go to edit mode directly so they can "add" a memo to it.
      const query = data.type === 'progress' ? '?edit=true' : '';
      navigate(`/book/${bookId}/memo/${data.id}${query}`, {
        replace: !!memoId,
        state: { isGuard: true }
      });
    }
  };

  const handleZoom = () => {
    if (refAreaLeft === refAreaRight || !refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    let [l, r] = [refAreaLeft, refAreaRight];
    if (l > r) [l, r] = [r, l];

    if (zoomDomain) {
      setZoomHistory(prev => [...prev, zoomDomain]);
    }
    setZoomDomain([l, r]);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const zoomBack = () => {
    if (zoomHistory.length > 0) {
      const prevZoom = zoomHistory[zoomHistory.length - 1];
      setZoomDomain(prevZoom);
      setZoomHistory(prev => prev.slice(0, -1));
    } else {
      setZoomDomain(null);
    }
  };

  const resetZoom = () => {
    setZoomDomain(null);
    setZoomHistory([]);
  };

  const scrollChart = (direction: 'left' | 'right') => {
    if (!zoomDomain || allChartData.length === 0) return;

    const minX = allChartData[0].x;
    const maxX = allChartData[allChartData.length - 1].x;

    const [left, right] = zoomDomain;
    const range = right - left;
    const step = range * 0.2; // 20% scroll

    if (direction === 'left') {
      let newLeft = left - step;
      let newRight = right - step;

      if (newLeft < minX) {
        newLeft = minX;
        newRight = minX + range;
      }
      setZoomDomain([newLeft, newRight]);
    } else {
      let newLeft = left + step;
      let newRight = right + step;

      if (newRight > maxX) {
        newRight = maxX;
        newLeft = maxX - range;
      }
      setZoomDomain([newLeft, newRight]);
    }
  };

  const isMemoOpen = !!memoId || location.pathname === `/book/${bookId}/new` || location.pathname === `/book/${bookId}/edit`;

  const renderDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (cx === undefined || cy === undefined) return null;
    const isFocused = focusedIndex === index;
    const size = isFocused ? 8 : 6;
    const opacity = (payload.displayType === 3) ? 0.7 : 1;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={payload.color || '#888'}
        stroke={isFocused ? '#fff' : 'none'}
        strokeWidth={isFocused ? 2 : 0}
        fillOpacity={opacity}
        style={{ cursor: 'pointer', zIndex: isFocused ? 20 : 1 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePointClick(payload, index);
        }}
      />
    );
  };

  const renderMemoItem = (memo: any, isOverlay?: boolean, isDragging?: boolean) => (
    <MemoCard
      key={memo.id}
      onClick={() => navigate(`/book/${bookId}/memo/${memo.id}`, { replace: !!memoId, state: { isGuard: true } })}
      style={{
        opacity: isDragging ? 0.5 : 1,
        background: isOverlay ? '#f8fafc' : undefined,
        boxShadow: isOverlay ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <PageMeta>
        <span>{memo.pageNumber ? `${t.book_detail.page} ${memo.pageNumber}` : t.book_detail.whole_book}</span>
        <span>{format(memo.createdAt, language === 'ko' ? 'M월 d일 HH:mm' : 'MMM d, HH:mm')}</span>
      </PageMeta>
      {memo.quote && <Quote>“{memo.quote}”</Quote>}
      <MemoContent>{memo.title}</MemoContent>
    </MemoCard>
  );

  return (
    <Container shadow-root="false">
      <LeftPane $isMemoOpen={isMemoOpen}>
        <Header>
          <BookTitle>{book.title}</BookTitle>
          {book.author && book.author.trim() !== '' && (
            <MetaInfo>
              <span>{book.author}</span>
            </MetaInfo>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            {!isReadOnly && (
              <ActionButton $variant="primary" onClick={() => navigate(`/book/${book.id}/new`, { state: { isGuard: true } })}>
                <FiEdit3 size={14} /> {t.book_detail.write_memo}
              </ActionButton>
            )}
            <ActionButton onClick={() => setIsBookMoveModalOpen(true)}>
              <FiFolder size={14} /> {language === 'ko' ? '이동' : 'Move'}
            </ActionButton>
            {!isReadOnly && (
              <ActionButton onClick={() => navigate(`/book/${book.id}/edit`, { state: { isGuard: true } })}>
                <FiEdit2 size={14} /> {t.book_detail.edit_book}
              </ActionButton>
            )}
            {!isReadOnly && (
              <ActionButton $variant="danger" onClick={handleDelete}>
                <FiTrash2 size={14} /> {t.book_detail.delete_book}
              </ActionButton>
            )}
          </div>

          <ProgressSection>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              <span>{t.book_detail.progress}</span>
              <span style={{ color: progressPercent === 100 ? '#22c55e' : 'inherit', fontWeight: progressPercent === 100 ? '600' : '400' }}>
                {book.currentPage || 0} / {book.totalPages} pages ({progressPercent}%)
              </span>
            </div>
            <ProgressBar $percent={progressPercent} />
          </ProgressSection>

          {(allChartData.length > 0 || globalMemos.length > 0) && (
            <GraphContainer ref={graphContainerRef} style={{ height: 'auto', minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
              {zoomDomain && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '25px',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 10
                }}>
                  <MiniPillButton onClick={() => scrollChart('left')}>
                    <FiChevronLeft size={11} />
                  </MiniPillButton>
                  <MiniPillButton onClick={() => scrollChart('right')} style={{ marginRight: '8px' }}>
                    <FiChevronRight size={11} />
                  </MiniPillButton>
                  <MiniPillButton onClick={zoomBack}>
                    <FiRotateCcw size={11} /> {t.book_detail.zoom_back}
                  </MiniPillButton>
                  <MiniPillButton onClick={resetZoom}>
                    <FiMaximize size={11} /> {t.book_detail.reset_zoom}
                  </MiniPillButton>
                </div>
              )}

              {/* Chart: Progress Plot (Type 1, 2, 3) */}
              <div style={{ height: '360px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    margin={{ top: 20, right: 20, bottom: 0, left: 0 }}
                    data={allChartData}
                    {...({ activeTooltipIndex: focusedIndex ?? undefined } as any)}
                    onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel)}
                    onMouseMove={(e) => {
                      if (refAreaLeft) setRefAreaRight(e?.activeLabel);
                      if (e && e.activeTooltipIndex !== undefined) {
                        const newIndex = e.activeTooltipIndex as number;
                        if (newIndex !== lastMouseIndex.current) {
                          setFocusedIndex(newIndex);
                          lastMouseIndex.current = newIndex;
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      //
                    }}
                    onMouseUp={handleZoom}
                  >
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={zoomDomain || [book.startDate.getTime(), 'dataMax']}
                      allowDataOverflow={true}
                      tick={{ fontSize: 11, fill: '#888' }}
                      tickFormatter={(timestamp) => format(new Date(timestamp), language === 'ko' ? 'yy.M.d' : 'yy/M/d')}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      yAxisId="left"
                      type="number"
                      dataKey="y"
                      domain={[0, yDomainMax]}
                      tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ strokeDasharray: '3 3' }}
                      offset={50}
                      active={focusedIndex !== null}
                    />

                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={(p) => (p.displayType === 0 || p.displayType === 1 || p.displayType === 2) ? p.y : null}
                      connectNulls={true}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={renderDot}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={(p) => (p.displayType === 3) ? p.y : null}
                      stroke="none"
                      dot={renderDot}
                      activeDot={false}
                      isAnimationActive={false}
                    />

                    {refAreaLeft && refAreaRight && (
                      <ReferenceArea
                        yAxisId="left"
                        x1={refAreaLeft}
                        x2={refAreaRight}
                        strokeOpacity={0.3}
                        fill="#3b82f6"
                        fillOpacity={0.1}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom Section: Global Memos (Type 4) */}
              {globalMemos.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  padding: '10px 0 20px 0',
                  alignContent: 'flex-start',
                  marginLeft: '60px',
                  position: 'relative' // relative context for tooltip? No, we use absolute on GraphContainer
                }}>
                  {globalMemos.map((memo) => (
                    <div
                      key={memo.id}
                      // title attr removed in favor of custom tooltip
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePointClick(memo);
                      }}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: memo.color,
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                        // Calculate position relative to GraphContainer
                        if (graphContainerRef.current) {
                          const rect = graphContainerRef.current.getBoundingClientRect();
                          const targetRect = e.currentTarget.getBoundingClientRect();
                          setHoveredGlobalMemo({
                            data: memo,
                            left: targetRect.left - rect.left + targetRect.width / 2,
                            top: targetRect.top - rect.top - 10
                          });
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        setHoveredGlobalMemo(null);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Render Tooltip for Global Memos */}
              {hoveredGlobalMemo && (
                <div style={{
                  position: 'absolute',
                  left: hoveredGlobalMemo.left,
                  top: hoveredGlobalMemo.top,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  zIndex: 100
                }}>
                  <MemoTooltipContent data={hoveredGlobalMemo.data} />
                </div>
              )}
            </GraphContainer>
          )}
        </Header>

        <MemoListSection>
          {displayMemos && displayMemos.length > 0 ? (
            <ThreadableList
              items={displayMemos}
              droppableId="book-memos"
              getItemId={(memo) => memo.id!}
              onDragEnd={onDragEnd}
              renderItem={(memo) => renderMemoItem(memo)}
              isCombineEnabled={false}
            />

          ) : (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>
              {t.book_detail.start_reading}
            </div>
          )}
        </MemoListSection>
      </LeftPane>

      {isMemoOpen && (
        <RightPane>
          <Outlet context={{ setIsDirty, setAppIsEditing }} />
        </RightPane>
      )}
      {isBookMoveModalOpen && (
        <BookMoveModal
          bookId={numericBookId}
          currentFolderId={book.folderId || null}
          onClose={() => setIsBookMoveModalOpen(false)}
          onSuccess={() => { }}
        />
      )}
    </Container>
  );
};