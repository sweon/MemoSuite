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
    /* 1. Global Reset: Remove all viewport and sizing constraints */
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
    }

    /* 2. Ancestral Path Isolation: Hide all siblings at each level to prevent layout interference */
    body > *:not(#root) {
      display: none !important;
    }

    #root {
      display: block !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #root > *:not(#app-main-layout-container) {
      display: none !important;
    }

    #app-main-layout-container {
      display: block !important;
      height: auto !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }

    #app-main-layout-container > *:not(#app-content-wrapper-area) {
      display: none !important;
    }

    /* 3. Target Content Area: Force it to the very top */
    #app-content-wrapper-area {
      display: block !important;
      height: auto !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      position: static !important; /* Flow across pages */
      overflow: visible !important;
    }

    /* 4. Internal Cleanup: Hide UI elements inside the content area */
    [class*="MobileHeader"],
    [class*="ActionBar"],
    [class*="ActionButton"],
    .no-print,
    button {
      display: none !important;
    }

    /* 5. Content Styling: Ensure detail views take full width and expand */
    [class*="Detail"],
    [class*="LogDetail"],
    [class*="MemoDetail"],
    [class*="ContentPadding"],
    .MarkdownView {
      display: block !important;
      height: auto !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      box-shadow: none !important;
      border: none !important;
      overflow: visible !important;
    }

    /* 6. Page Break Optimizations */
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
    img, table, pre, blockquote { page-break-inside: avoid; }
    
    .MarkdownView * {
      overflow: visible !important;
      height: auto !important;
    }
  }
`;
