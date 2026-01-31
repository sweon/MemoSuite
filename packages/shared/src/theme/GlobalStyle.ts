import { createGlobalStyle } from 'styled-components';
import type { Theme } from './types';

export const GlobalStyle = createGlobalStyle<{ theme: Theme }>`
  html {
    font-size: ${({ theme }) => theme.fontSize}px;
    scroll-behavior: smooth;
    overscroll-behavior: none;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    transition: ${({ theme }) => theme.effects.transition};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overscroll-behavior: none;
    
    --background: ${({ theme }) => theme.colors.background};
    --surface: ${({ theme }) => theme.colors.surface};
    --border: ${({ theme }) => theme.colors.border};
    --text: ${({ theme }) => theme.colors.text};
    --text-secondary: ${({ theme }) => theme.colors.textSecondary};
    --primary: ${({ theme }) => theme.colors.primary};
    --accent: ${({ theme }) => theme.colors.accent};
    --glass-bg: ${({ theme }) => theme.colors.glassBackground};
    --glass-border: ${({ theme }) => theme.colors.glassBorder};
    --shadow-small: ${({ theme }) => theme.shadows.small};
    --shadow-medium: ${({ theme }) => theme.shadows.medium};
    --shadow-large: ${({ theme }) => theme.shadows.large};
    --radius-md: ${({ theme }) => theme.radius.medium};
    --transition: ${({ theme }) => theme.effects.transition};
  }

  * {
    box-sizing: border-box;
    &::selection {
      background-color: ${({ theme }) => theme.colors.primary}55;
      color: inherit;
    }
  }

  button, input, select, textarea {
    font-family: inherit;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: opacity 0.2s ease;
    &:hover {
      opacity: 0.8;
    }
  }

  /* Scrollbar styling - Premium Minimalist Look */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 10px;
    transition: background 0.3s ease;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.textSecondary}88;
  }

  @media print {
    /* Hide navigation and UI elements */
    nav, 
    aside, 
    header, 
    .no-print, 
    button, 
    .ActionBar, 
    [class*="Sidebar"], 
    [class*="ActionBar"],
    [class*="Header"] {
      display: none !important;
    }

    /* Reset background and text for paper */
    body, html {
      background: white !important;
      color: black !important;
    }

    /* Ensure specific containers take full width and show content */
    main,
    .print-content,
    [class*="Container"],
    [class*="Content"] {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      box-shadow: none !important;
      position: static !important;
      overflow: visible !important;
    }

    /* Handle page breaks */
    img, table, pre, blockquote {
      page-break-inside: avoid;
    }
  }
`;
