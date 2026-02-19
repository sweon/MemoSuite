import React from 'react';
import styled from 'styled-components';
import { FiFolder } from 'react-icons/fi';
import { LogItemLink, LogTitle } from './itemStyles';

const FolderIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.8;
  width: 20px;
`;

const FolderItemContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`;

interface Props {
    name: string;
    onClick: () => void;
    isUp?: boolean;
}

export const SidebarFolderItem: React.FC<Props> = ({ name, onClick, isUp }) => {
    return (
        <LogItemLink
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
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', lineHeight: 1, marginTop: '-4px' }}>..</span>
                    ) : (
                        <FiFolder size={16} />
                    )}
                </FolderIconWrapper>
                <LogTitle style={{ color: isUp ? 'inherit' : 'inherit', opacity: isUp ? 0.7 : 1 }}>
                    {!isUp && name}
                </LogTitle>
            </FolderItemContainer>
        </LogItemLink>
    );
};
