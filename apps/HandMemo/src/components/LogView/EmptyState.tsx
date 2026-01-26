import React from 'react';
import styled from 'styled-components';
import { FiFileText } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const IconWrapper = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  padding: 2rem;
  border-radius: 50%;
  margin-bottom: 1rem;
`;

export const EmptyState: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Container>
      <IconWrapper>
        <FiFileText size={48} />
      </IconWrapper>
      <h2>{t.memo_detail.empty_state_title}</h2>
    </Container>
  );
};
