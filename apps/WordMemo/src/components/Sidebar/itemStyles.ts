import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const WordItemLink = styled(Link) <{ $isActive: boolean; $inThread?: boolean }>`
  display: block;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  padding-left: ${({ $inThread, theme }) => ($inThread ? theme.spacing.xl : theme.spacing.md)};
  border-radius: ${({ theme }) => theme.radius.medium};
  margin-bottom: 2px;
  text-decoration: none;
  background: ${({ $isActive, theme }) => ($isActive ? `${theme.colors.primary}11` : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  position: relative;
  transition: ${({ theme }) => theme.effects.transition};
  border: 1px solid ${({ $isActive, theme }) => ($isActive ? theme.colors.primary : 'transparent')};
  
  /* Connector for child logs */
  ${({ $inThread, theme }) => $inThread && `
    &::before {
      content: '';
      position: absolute;
      left: 14px;
      top: -4px;
      bottom: 50%;
      width: 2px;
      border-left: 2px solid ${theme.colors.border};
      border-bottom: 2px solid ${theme.colors.border};
      border-bottom-left-radius: 6px;
    }
  `}

  &:hover {
    background: ${({ theme, $isActive }) => ($isActive ? `${theme.colors.primary}18` : theme.colors.background)};
    transform: translateX(4px);
    ${({ $isActive, theme }) => !$isActive && `border-color: ${theme.colors.border};`}
  }

  &:active {
    transform: translateX(2px);
  }
`;

export const WordTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
`;

export const WordTitle = styled.div<{ $isUntitled?: boolean }>`
  font-weight: ${({ $isUntitled }) => ($isUntitled ? '400' : '600')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  opacity: ${({ $isUntitled }) => ($isUntitled ? 0.6 : 1)};
`;

export { BlurredText } from '../UI/BlurredText';

export const SpeakButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.small};
  opacity: 0.5;
  transition: ${({ theme }) => theme.effects.transition};
  
  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.background};
    transform: scale(1.1);
  }
`;

export const StarButton = styled.button<{ $active?: boolean }>`
  background: transparent;
  border: none;
  color: ${({ theme, $active }) => ($active ? '#f59e0b' : theme.colors.textSecondary)};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.small};
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
  transition: ${({ theme }) => theme.effects.transition};
  
  &:hover {
    opacity: 1;
    background-color: ${({ theme }) => theme.colors.background};
    ${({ $active }) => !$active && `color: #f59e0b;`}
    transform: scale(1.1);
  }
`;

export const WordDate = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
  opacity: 0.8;
`;

export const ItemFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
`;

export const ItemActions = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

export const ThreadContainer = styled.div`
    margin-left: ${({ theme }) => theme.spacing.md};
    padding-left: ${({ theme }) => theme.spacing.sm};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

export const ThreadHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.85rem;
    font-weight: 600;
    transition: ${({ theme }) => theme.effects.transition};
    
    &:hover {
        color: ${({ theme }) => theme.colors.text};
    }
`;

export const ThreadToggleBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    margin-left: 22px;
    margin-top: -2px;
    margin-bottom: 8px;
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: ${({ theme }) => theme.radius.small};
    transition: ${({ theme }) => theme.effects.transition};
    
    &:hover {
        color: ${({ theme }) => theme.colors.text};
        background: ${({ theme }) => theme.colors.surface};
        border-color: ${({ theme }) => theme.colors.textSecondary};
        transform: translateY(-1px);
    }
`;

export const PinToggleButton = styled.button<{ $pinned: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${({ $pinned, theme }) => ($pinned ? theme.colors.primary : theme.colors.textSecondary)};
    opacity: ${({ $pinned }) => ($pinned ? 1 : 0.3)};
    transition: ${({ theme }) => theme.effects.transition};
    
    &:hover {
        opacity: 1;
        color: ${({ theme }) => theme.colors.primary};
        transform: scale(1.2);
    }
`;
