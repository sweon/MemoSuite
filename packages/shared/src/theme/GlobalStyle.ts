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
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
      width: 100% !important;
      position: static !important;
    }

    /* 2. Ancestral Path Isolation */
    body > *:not(#root):not(#print-hf-wrapper) {
      display: none !important;
    }

    #root {
      display: block !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      overflow: visible !important;
      position: static !important;
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
      position: static !important;
    }

    #app-main-layout-container > *:not(#app-content-wrapper-area) {
      display: none !important;
    }

    /* 3. Target Content Area */
    #app-content-wrapper-area {
      display: block !important;
      height: auto !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      position: static !important;
      overflow: visible !important;
    }

    /* 4. Internal Cleanup: Hide UI elements */
    header,
    nav,
    aside,
    [class*="Header"],
    [class*="header"],
    [class*="MobileHeader"],
    [class*="ActionBar"],
    [class*="ActionButton"],
    [class*="GoToBottomButton"],
    [class*="GoToTopButton"],
    [class*="ResizeHandle"],
    [class*="Overlay"],
    [class*="SidebarInactiveOverlay"],
    .no-print,
    button {
      display: none !important;
    }

    /* 5. Content Styling: Universal reset for all nested containers */
    [class*="MainWrapper"],
    [class*="ScrollContainer"],
    [class*="Detail"],
    [class*="LogDetail"],
    [class*="MemoDetail"],
    [class*="ContentPadding"],
    [class*="editor-container"],
    [class*="editor-inner"],
    [class*="editor-scroller"],
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
      position: static !important;
    }

    /* 6. Page Break Management */
    h1, h2, h3, h4, h5, h6 { 
      page-break-after: avoid;
      break-after: avoid;
    }
    img, table, pre, blockquote { 
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Page Break Support */
    .page-break,
    .page-break-container,
    [data-page-break="true"] {
      display: block !important;
      height: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
      visibility: hidden;
    }
    
    /* Ensure all descendants of content area are visible and expanding */
    #app-content-wrapper-area *:not(.page-break):not(.page-break-container):not([data-page-break]),
    .MarkdownView *:not(.page-break):not(.page-break-container):not([data-page-break]) {
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
    }
  }
`;
