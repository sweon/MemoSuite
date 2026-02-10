import React from 'react';
import styled from 'styled-components';
import { FiHome, FiChevronRight, FiFolder } from 'react-icons/fi';

interface BreadcrumbItem {
    id: number;
    name: string;
    isHome?: boolean;
}

interface BreadcrumbNavProps {
    items: BreadcrumbItem[];
    onNavigate: (folderId: number) => void;
    onNavigateHome: () => void;
    compact?: boolean;
}

const BreadcrumbContainer = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $compact }) => $compact ? '4px 0' : '6px 12px'};
  background: ${({ theme, $compact }) => $compact ? 'transparent' : theme.colors.background};
  border-radius: ${({ $compact }) => $compact ? '0' : '12px'};
  border: ${({ theme, $compact }) => $compact ? 'none' : `1px solid ${theme.colors.border}`};
  flex-wrap: wrap;
  width: 100%;
  margin-top: ${({ $compact }) => $compact ? '0' : '4px'};
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const BreadcrumbItemStyled = styled.button<{ $isActive?: boolean; $isHome?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: ${({ theme, $isActive }) => $isActive ? `${theme.colors.primary}22` : 'transparent'};
  color: ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.textSecondary};
  font-size: 0.8rem;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: normal;
  text-align: left;
  word-break: break-all;
  min-height: 28px;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary}22;
    color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    flex-shrink: 0;
  }
`;

const Separator = styled(FiChevronRight)`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.5;
  font-size: 12px;
`;

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
    items,
    onNavigate,
    onNavigateHome,
    compact = false
}) => {
    if (items.length === 0) return null;

    return (
        <BreadcrumbContainer $compact={compact}>
            {items.map((item, index) => (
                <React.Fragment key={item.id}>
                    {index > 0 && <Separator size={12} />}
                    <BreadcrumbItemStyled
                        $isActive={index === items.length - 1}
                        $isHome={item.isHome}
                        onClick={() => {
                            if (item.isHome) {
                                onNavigateHome();
                            } else {
                                onNavigate(item.id);
                            }
                        }}
                        title={item.name}
                    >
                        {item.isHome ? (
                            <FiHome size={14} />
                        ) : (
                            <FiFolder size={12} />
                        )}
                        {!item.isHome && <span>{item.name}</span>}
                    </BreadcrumbItemStyled>
                </React.Fragment>
            ))}
        </BreadcrumbContainer>
    );
};

export default BreadcrumbNav;
