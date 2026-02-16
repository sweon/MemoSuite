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

  // Check if current folder has any memos
  const folderMemoCount = useLiveQuery(
    () => currentFolderId !== null ? db.memos.where('folderId').equals(currentFolderId).count() : Promise.resolve(0),
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
    if (folderMemoCount && folderMemoCount > 0) {
      const lastId = localStorage.getItem('handmemo_last_memo_id');

      const navigateToLatest = async () => {
        const latestMemo = await db.memos
          .where('folderId').equals(currentFolderId!)
          .reverse()
          .sortBy('updatedAt');

        if (latestMemo.length > 0) {
          navigate(`/memo/${latestMemo[0].id}`, { replace: true });
        }
      };

      if (lastId) {
        const id = parseInt(lastId, 10);
        db.memos.get(id).then(memo => {
          if (memo && memo.folderId === currentFolderId) {
            navigate(`/memo/${lastId}`, { replace: true });
          } else {
            navigateToLatest();
          }
        });
      } else {
        navigateToLatest();
      }
    }
  }, [navigate, folderMemoCount, currentFolderId, isMobile]);

  const isEmptyFolder = folderMemoCount === 0;

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
          ? (language === 'ko' ? '새 메모를 작성하여 시작해보세요' : 'Get started by creating a new memo')
          : (language === 'ko' ? '메모를 선택하여 내용을 확인하세요' : 'Select a memo to view its content')
        }
      </Description>
    </Container>
  );
};