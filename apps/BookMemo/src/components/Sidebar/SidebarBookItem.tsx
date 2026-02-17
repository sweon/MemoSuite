import React, { useState } from 'react';
import { useColorTheme, useLanguage } from '@memosuite/shared';

import { NavLink, useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { Book, Memo } from '../../db';

import { MemoItemLink, MemoTitle, MemoDate, ThreadToggleBtn, PinToggleButton, ItemFooter, ItemActions } from './itemStyles';
import { FiCornerDownRight } from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';
import { format } from 'date-fns';
import { useSearch } from '../../contexts/SearchContext';

const GroupContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ItemContainer = styled(NavLink) <{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radius.medium};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme, $isActive }) => $isActive ? `${theme.colors.primary}11` : 'transparent'};
  border: 1px solid ${({ theme, $isActive }) => $isActive ? theme.colors.primary : 'transparent'};
  transition: ${({ theme }) => theme.effects.transition};
  position: relative;
  margin-bottom: 4px;
  &:hover {
    background: ${({ theme, $isActive }) => $isActive ? `${theme.colors.primary}18` : theme.colors.background};
    transform: translateX(4px);
    ${({ $isActive, theme }) => !$isActive && `border-color: ${theme.colors.border};`}
  }

  &:active {
    transform: translateX(2px);
  }

  &.active {
    font-weight: 600;
  }
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
  color: ${({ theme }) => theme.colors.text};
`;

const Meta = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-weight: 500;
  opacity: 0.8;
`;

const StatusDot = styled.div<{ $status: string }>`
  width: 6px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.full};
  background-color: ${({ $status, theme }) =>
    $status === 'completed' ? theme.colors.success :
      $status === 'reading' ? theme.colors.primary : theme.colors.textSecondary};
  box-shadow: 0 0 4px ${({ $status, theme }) =>
    $status === 'completed' ? `${theme.colors.success}66` :
      $status === 'reading' ? `${theme.colors.primary}66` : 'transparent'};
`;

const ThreadList = styled.div`
  margin-left: 0;
  padding-left: 0;
  margin-top: 4px;
`;

interface Props {
  book: Book;
  memos: Memo[];
  onClick?: (skipHistory?: boolean) => void;
  onSafeNavigate: (action: () => void) => void;
  onTogglePin?: (id: number, e: React.MouseEvent) => void;
  onMove?: (id: number, type: 'book' | 'memo') => void;
  isMoving?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const SidebarBookItem: React.FC<Props> = ({ book, memos, onClick, onSafeNavigate, onTogglePin, onMove, isMoving, isCollapsed: isCollapsedProp, onToggle }) => {
  const { bookId: activeId, id: activeMemoId } = useParams();
  const { t, language } = useLanguage();
  const { searchQuery } = useSearch();
  const { theme } = useColorTheme();
  const navigate = useNavigate();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(true);

  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : internalIsCollapsed;
  const setIsCollapsed = onToggle ? () => onToggle() : setInternalIsCollapsed;

  const progressPercent = book.totalPages > 0
    ? Math.round(((book.currentPage || 0) / book.totalPages) * 100)
    : 0;

  const isActive = activeId === String(book.id) && !activeMemoId;

  // Expand automatically if searching and any memo matches
  const q = searchQuery.toLowerCase();
  const matchingMemos = q ? memos.filter(m =>
    m.title.toLowerCase().includes(q) ||
    m.content.toLowerCase().includes(q) ||
    m.tags.some(t => t.toLowerCase().includes(q))
  ) : [];

  const shouldShowMemos = !isCollapsed || (q && matchingMemos.length > 0);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  const handleBookClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMoving && onMove && book.id) {
      onMove(book.id, 'book');
      return;
    }
    onSafeNavigate(() => {
      // Always replace when coming from sidebar to properly consume the sidebar-open state entry.
      // We pass isGuard: true to satisfy AndroidExitHandler without pushing extra entries.
      navigate(`/book/${book.id}`, { replace: true, state: { isGuard: true } });
      if (onClick) onClick(true);
    });
  };

  const handleMemoClick = (memoId: number) => {
    if (isMoving && onMove) {
      onMove(memoId, 'memo');
      return;
    }
    onSafeNavigate(() => {
      // Always replace when coming from sidebar to properly consume the sidebar-open state entry.
      // We pass isGuard: true to satisfy AndroidExitHandler without pushing extra entries.
      navigate(`/book/${book.id}/memo/${memoId}`, { replace: true, state: { isGuard: true } });
      if (onClick) onClick(true);
    });
  };

  // Sort memos by page number, then date
  const sortedMemos = [...memos].sort((a, b) => {
    if ((a.pageNumber || 0) !== (b.pageNumber || 0)) {
      return (a.pageNumber || 0) - (b.pageNumber || 0);
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <GroupContainer data-book-id={book.id}>
      <ItemContainer
        to={`/book/${book.id}`}
        onClick={handleBookClick}
        $isActive={isActive}
        className={isActive ? 'active' : ''}
        end
      >
        <Info>
          <Title title={book.title}>
            {book.title}
          </Title>
          <ItemFooter>
            <Meta>
              <StatusDot $status={book.status} />
              <span>{progressPercent}%</span>
            </Meta>
            <ItemActions>
              {onTogglePin && book.id && (
                <PinToggleButton
                  $pinned={!!book.pinnedAt}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTogglePin(book.id!, e);
                  }}
                  title={book.pinnedAt ? 'Unpin' : 'Pin to top'}
                  style={{ opacity: book.pinnedAt ? 1 : undefined }}
                >
                  <BsPinAngle size={12} style={{ transform: book.pinnedAt ? 'none' : 'rotate(45deg)' }} />
                </PinToggleButton>
              )}
            </ItemActions>
          </ItemFooter>
        </Info>
      </ItemContainer>

      {memos.length > 0 && (
        <div style={{ paddingLeft: '0.5rem' }}>
          <ThreadToggleBtn onClick={handleToggle}>
            <FiCornerDownRight />
            {shouldShowMemos
              ? t.sidebar.collapse
              : t.sidebar.more_memos.replace('{count}', String(memos.length))}
          </ThreadToggleBtn>
        </div>
      )}

      {shouldShowMemos && memos.length > 0 && (
        <ThreadList>
          {sortedMemos.map(memo => {
            const isMatch = q && (
              memo.title.toLowerCase().includes(q) ||
              memo.content.toLowerCase().includes(q) ||
              memo.tags.some(t => t.toLowerCase().includes(q))
            );

            if (q && !isMatch) return null;

            return (
              <MemoItemLink
                key={memo.id}
                data-memo-id={memo.id}
                to={`/book/${book.id}/memo/${memo.id}`}
                $isActive={activeMemoId === String(memo.id)}
                $inThread={true}
                onClick={(e) => {
                  e.preventDefault();
                  handleMemoClick(memo.id!);
                }}
                style={isMatch ? { borderRight: `2px solid ${theme.colors.primary}` } : {}}
              >
                <MemoTitle title={memo.title || t.sidebar.untitled} $isUntitled={!memo.title}>
                  {memo.title || t.sidebar.untitled}
                </MemoTitle>
                <MemoDate>
                  {memo.pageNumber ? `p.${memo.pageNumber} • ` : ''}
                  {format(memo.createdAt, language === 'ko' ? 'M월 d일 HH:mm' : 'MMM d, HH:mm')}
                </MemoDate>
              </MemoItemLink>
            );
          })}
        </ThreadList>
      )}
    </GroupContainer>
  );
};