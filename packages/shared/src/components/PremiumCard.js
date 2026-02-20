import styled, { keyframes } from 'styled-components';
const fadeIn = keyframes `
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;
const shimmer = keyframes `
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
export const PremiumCard = styled.div `
  background: ${({ theme, $glass }) => $glass ? theme.colors.glassBackground : theme.colors.surface};
  ${({ $glass, theme }) => $glass && `
    backdrop-filter: blur(${theme.effects.blur});
    -webkit-backdrop-filter: blur(${theme.effects.blur});
    border: 1px solid ${theme.colors.glassBorder};
  `}
  border-radius: ${({ theme }) => theme.radius.large};
  box-shadow: ${({ theme }) => theme.shadows.medium};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: ${({ theme }) => theme.effects.transition};
  animation: ${({ $animate }) => $animate ? fadeIn : 'none'} 0.5s ease forwards;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.large};
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.05) 50%,
        rgba(255, 255, 255, 0) 100%
      );
      background-size: 200% 100%;
      animation: ${shimmer} 2s infinite linear;
      pointer-events: none;
    }
  }
`;
export const PremiumButton = styled.button `
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radius.medium};
  font-weight: 600;
  cursor: pointer;
  transition: ${({ theme }) => theme.effects.transition};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  border: none;
  font-size: 0.95rem;
  
  ${({ $variant, theme }) => {
    switch ($variant) {
        case 'accent':
            return `
          background: ${theme.colors.accent};
          color: white;
          &:hover { filter: brightness(1.1); transform: scale(1.02); }
          &:active { transform: scale(0.98); }
        `;
        case 'outline':
            return `
          background: transparent;
          border: 1px solid ${theme.colors.border};
          color: ${theme.colors.text};
          &:hover { background: ${theme.colors.background}; border-color: ${theme.colors.textSecondary}; }
        `;
        default:
            return `
          background: ${theme.colors.primary};
          color: white;
          &:hover { background: ${theme.colors.primaryHover}; transform: scale(1.02); }
          &:active { transform: scale(0.98); }
        `;
    }
}}
`;
export const PremiumTitle = styled.h2 `
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.025em;
  background: ${({ theme }) => `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.accent})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
`;
