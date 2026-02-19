import React from 'react';
import styled from 'styled-components';
import { FiFolder, FiFileText } from 'react-icons/fi';
import { MemoItemLink, MemoTitle } from './itemStyles';

const FolderIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.8;
  width: 18px;
`;

const FolderItemContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
`;

const StatsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  padding-left: 8px;
  opacity: 0.5;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: opacity 0.2s;

  ${MemoItemLink}:hover & {
    opacity: 0.8;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

interface Props {
    name: string;
    onClick: () => void;
    isUp?: boolean;
    memoCount?: number;
    subfolderCount?: number;
}

export const SidebarFolderItem: React.FC<Props> = ({ name, onClick, isUp, memoCount, subfolderCount }) => {
    return (
        <MemoItemLink
            to="#"
            $isActive={false}
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            style={{ marginBottom: '2px', padding: '8px 12px' }}
        >
            <FolderItemContainer>
                <FolderIconWrapper>
                    {isUp ? (
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, marginTop: '-4px' }}>..</span>
                    ) : (
                        <FiFolder size={15} />
                    )}
                </FolderIconWrapper>
                <MemoTitle style={{ color: isUp ? 'inherit' : 'inherit', opacity: isUp ? 0.7 : 1 }}>
                    {!isUp && name}
                </MemoTitle>

                {!isUp && ((memoCount || 0) > 0 || (subfolderCount || 0) > 0) && (
                    <StatsWrapper>
                        {memoCount !== undefined && memoCount > 0 && (
                            <StatItem title="Memos">
                                <FiFileText size={12} />
                                <span>{memoCount}</span>
                            </StatItem>
                        )}
                        {subfolderCount !== undefined && subfolderCount > 0 && (
                            <StatItem title="Subfolders">
                                <FiFolder size={12} />
                                <span>{subfolderCount}</span>
                            </StatItem>
                        )}
                    </StatsWrapper>
                )}
            </FolderItemContainer>
        </MemoItemLink>
    );
};
