import { useLanguage } from '@memosuite/shared';
import { useLiveQuery } from 'dexie-react-hooks';
import React from 'react';
import { FiFolderPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useFolder } from '../../contexts/FolderContext';
import { db } from '../../db';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 2rem;
  text-align: center;
`;

const IconWrapper = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  padding: 2.5rem;
  border-radius: 50%;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: ${({ theme }) => theme.shadows.medium};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  margin: 0.5rem 0 0;
  font-size: 1rem;
  opacity: 0.7;
`;

export const EmptyState: React.FC = () => {
  const { t, language } = useLanguage();
  const { currentFolderId, currentFolder } = useFolder();
  const navigate = useNavigate();

  // Check if current folder has any books
  const folderBookCount = useLiveQuery(
    () => currentFolderId !== null ? db.books.where('folderId').equals(currentFolderId).count() : Promise.resolve(0),
    [currentFolderId]
  );

  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (isMobile) return;
    if (folderBookCount && folderBookCount > 0) {
      const lastBookId = localStorage.getItem('bookmemo_last_book_id');
      const lastMemoId = localStorage.getItem('bookmemo_last_memo_id');

      const navigateToLatest = async () => {
        const latestBook = await db.books
          .where('folderId').equals(currentFolderId!)
          .reverse()
          .sortBy('updatedAt');

        if (latestBook.length > 0) {
          navigate(`/book/${latestBook[0].id}`, { replace: true });
        }
      };

      if (lastBookId) {
        const bid = parseInt(lastBookId, 10);
        db.books.get(bid).then(book => {
          if (book && book.folderId === currentFolderId) {
            if (lastMemoId) {
              navigate(`/book/${lastBookId}/memo/${lastMemoId}`, { replace: true });
            } else {
              navigate(`/book/${lastBookId}`, { replace: true });
            }
          } else {
            navigateToLatest();
          }
        });
      } else {
        navigateToLatest();
      }
    }
  }, [navigate, folderBookCount, currentFolderId, isMobile]);

  const isEmptyFolder = folderBookCount === 0;

  return (
    <Container>
      <IconWrapper>
        <FiFolderPlus size={64} />
      </IconWrapper>
      <Title>
        {isEmptyFolder
          ? (language === 'ko' ? `${currentFolder?.name || '폴더'}가 비어 있습니다` : `${currentFolder?.name || 'Folder'} is empty`)
          : t.memo_detail.empty_state_title
        }
      </Title>
      <Description>
        {isEmptyFolder
          ? (language === 'ko' ? '새 책을 추가하여 시작해보세요' : 'Get started by adding a new book')
          : (language === 'ko' ? '책을 선택하여 내용을 확인하세요' : 'Select a book to view its content')
        }
      </Description>
    </Container>
  );
};