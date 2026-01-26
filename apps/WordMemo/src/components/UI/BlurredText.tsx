import styled from 'styled-components';

export const BlurredText = styled.span<{ $isBlurred?: boolean; $forceReveal?: boolean }>`
  transition: filter 0.2s ease, opacity 0.2s ease;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  
  ${({ $isBlurred, $forceReveal }) => $isBlurred && `
    filter: ${$forceReveal ? 'blur(0)' : 'blur(8px)'};
    opacity: ${$forceReveal ? '1' : '0.7'};
    cursor: default;
    padding-right: 2ch;
    margin-right: -2ch; /* Compensation to keep original layout */
    
    &:hover, &:active {
      filter: blur(0);
      opacity: 1;
      transition: filter 0.3s ease 1.2s, opacity 0.3s ease 1.2s;
    }

    /* Mobile/Touch optimization: Instant reveal on touch */
    @media (hover: none) {
        &:active {
            transition-delay: 0s;
        }
    }
  `}
`;
