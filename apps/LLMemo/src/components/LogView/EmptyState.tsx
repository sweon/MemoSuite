import React from 'react';
import styled from 'styled-components';
import { FiFileText } from 'react-icons/fi';

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
    return (
        <Container>
            <IconWrapper>
                <FiFileText size={48} />
            </IconWrapper>
            <h2>Select a log or create a new one</h2>
        </Container>
    );
};
