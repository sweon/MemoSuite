import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Sidebar } from '../Sidebar/Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiSave } from 'react-icons/fi';
import { metadataCache, useColorTheme, useLanguage } from '@memosuite/shared';
import { db } from '../../db';

const cleanImageUrl = (url: string): string => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // Handle Google/Bing/etc search result URLs (imgurl=..., imageUrl=..., etc)
    const imgParam = urlObj.searchParams.get('imgurl') ||
      urlObj.searchParams.get('imageUrl') ||
      urlObj.searchParams.get('img_url') ||
      urlObj.searchParams.get('tbnid');
    if (imgParam && (imgParam.startsWith('http') || imgParam.startsWith('data:'))) {
      return decodeURIComponent(imgParam);
    }
  } catch (e) { }
  return url;
};

const isImageUrl = (url: string) => {
  if (!url) return false;
  // standard extensions
  if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(url)) return true;
  // data urls
  if (url.startsWith('data:image/')) return true;
  // common cloud storage / cdn / google-specific paths
  if (url.includes('googleusercontent.com') || url.includes('.gstatic.com') || url.includes('bing.com/th?')) return true;
  return false;
};

const isYoutubeUrl = (url: string) => {
  if (!url) return false;
  return url.includes('youtube.com/watch') ||
    url.includes('youtu.be/') ||
    url.includes('youtube.com/embed/') ||
    url.includes('youtube.com/shorts/');
};

const parseHtmlTableToFortuneSheet = (html: string) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const sheets = [{
      name: "Sheet1",
      celldata: [] as any[],
      row: 60,
      column: 26,
      index: "0",
      status: 1,
      order: 0,
      config: {},
    }];

    const rows = table.querySelectorAll('tr');
    let maxR = 0;
    let maxC = 0;

    rows.forEach((tr, r) => {
      maxR = Math.max(maxR, r);
      const cells = tr.querySelectorAll('td, th');
      cells.forEach((td, c) => {
        maxC = Math.max(maxC, c);
        const text = td.textContent?.trim();
        if (text) {
          sheets[0].celldata.push({
            r, c, v: { v: text, m: text }
          });
        }
      });
    });

    sheets[0].row = Math.max(60, maxR + 10);
    sheets[0].column = Math.max(26, maxC + 5);

    return sheets;
  } catch (e) {
    return null;
  }
};

const parseTsvToFortuneSheet = (text: string) => {
  try {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return null;

    const sheets = [{
      name: "Sheet1",
      celldata: [] as any[],
      row: 60,
      column: 26,
      index: "0",
      status: 1,
      order: 0,
      config: {},
    }];

    let maxC = 0;
    lines.forEach((line, r) => {
      const cells = line.split('\t');
      cells.forEach((cell, c) => {
        maxC = Math.max(maxC, c);
        const text = cell.trim();
        if (text) {
          sheets[0].celldata.push({
            r, c, v: { v: text, m: text }
          });
        }
      });
    });

    sheets[0].row = Math.max(60, lines.length + 10);
    sheets[0].column = Math.max(26, maxC + 5);

    return sheets;
  } catch (e) {
    return null;
  }
};

const extractContentFromEvent = (dt: DataTransfer): { url?: string; text?: string; title?: string; file?: File; spreadsheet?: any } | null => {
  if (!dt) return null;

  // 1. Try to get files first (e.g. dropped markdown or image)
  if (dt.files && dt.files.length > 0) {
    const file = dt.files[0];
    if (file.type.startsWith('image/') || file.name.endsWith('.md') || file.type === 'text/markdown' || file.type === 'text/plain') {
      return { file };
    }
  }

  // Synchronously read all data
  const html = dt.getData('text/html');
  const uriList = dt.getData('text/uri-list');
  const plain = dt.getData('text/plain')?.trim();

  // 1.5 Try to detect spreadsheet data from HTML or TSV
  if (html && (html.includes('<table') || html.includes('luckysheet') || html.includes('fortune'))) {
    const sheetData = parseHtmlTableToFortuneSheet(html);
    if (sheetData && sheetData[0].celldata.length > 0) {
      return { spreadsheet: sheetData, title: '스프레드시트' };
    }
  }

  // 2. Try to get image/link from HTML
  if (html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const img = doc.querySelector('img');
      const link = doc.querySelector('a');

      if (link && link.href) {
        const url = cleanImageUrl(link.href);
        const title = link.title || link.innerText?.trim() || (img ? (img.alt || img.title) : undefined);
        if (url && (url.startsWith('http') || url.startsWith('data:image/'))) {
          return { url, title: title?.trim() || undefined };
        }
      }

      if (img && img.src) {
        const url = cleanImageUrl(img.src);
        const title = img.alt || img.title || undefined;
        if (url && (url.startsWith('http') || url.startsWith('data:image/'))) {
          return { url, title: title?.trim() || undefined };
        }
      }
    } catch (err) { }
  }

  // 3. Try text/uri-list
  if (uriList) {
    const lines = uriList.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (lines.length > 0) {
      const url = cleanImageUrl(lines[0]);
      if (url.startsWith('http') || url.startsWith('data:image/')) {
        return { url };
      }
    }
  }

  // 4. Try text/plain
  if (plain) {
    const lines = plain.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const urlIndex = lines.findIndex(l => l.startsWith('http') || l.startsWith('data:image/'));
      if (urlIndex !== -1) {
        const url = cleanImageUrl(lines[urlIndex]);
        const title = lines[urlIndex === 0 ? 1 : 0];
        return { url, title: title.length < 200 ? title : undefined };
      }
    }

    if (plain.startsWith('http') || plain.startsWith('data:image/')) {
      const cleaned = cleanImageUrl(plain);
      return { url: cleaned };
    }

    if (plain.includes('\t') && plain.includes('\n')) {
      const sheetData = parseTsvToFortuneSheet(plain);
      if (sheetData && sheetData[0].celldata.length > 0) {
        return { spreadsheet: sheetData, title: '스프레드시트' };
      }
    }

    return { text: plain };
  }

  return null;
};

const getBestTitle = (url?: string, suggestedTitle?: string, text?: string): string => {
  const isYoutube = url ? isYoutubeUrl(url) : false;
  const isImage = url ? isImageUrl(url) : false;

  let title = suggestedTitle?.trim() || '';

  // If title is just the URL, empty, or generic, try to generate one
  if (!title || (url && title === url) || title === '공유된 메모' || title === '유튜브' || title === 'YouTube' || title === '웹 페이지') {
    try {
      if (url) {
        const urlObj = new URL(url);
        if (isYoutube) {
          // We set it to generic fallback first; calling code may try to fetch a better one
          if (!title || title === url || title === '웹 페이지') title = '유튜브 동영상';
        } else if (isImage) {
          if (!title || title === url || title === '웹 페이지') title = '이미지';
        } else {
          // Try to get a meaningful title from the path
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            // Clean up slug
            let generated = decodeURIComponent(lastPart)
              .replace(/[-_]/g, ' ')
              .replace(/\.[^/.]+$/, '') // Remove extension if any
              .trim();

            if (generated.length > 1) {
              title = generated.charAt(0).toUpperCase() + generated.slice(1);
            }
          }

          if (!title || title.length < 2 || title === url || title === '웹 페이지') {
            title = urlObj.hostname.replace('www.', '');
          }
        }
      } else if (text) {
        // For plain text, use first line or first few words
        const lines = text.split('\n').filter(Boolean);
        if (lines.length > 0) {
          const firstLine = lines[0].trim();
          title = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
        }
      }
    } catch (e) {
      if (!title || (url && title === url) || title === '웹 페이지') {
        title = isYoutube ? '유튜브 동영상' : isImage ? '이미지' : '웹 페이지';
      }
    }
  }

  if (!title) title = isYoutube ? '유튜브 동영상' : isImage ? '이미지' : '웹 페이지';

  return title;
};

const fetchYoutubeTitle = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return data.title || null;
    }
  } catch (e) { }
  return null;
};

const Container = styled.div<{ $isResizing: boolean }>`
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  ${({ $isResizing }) => $isResizing && `
    cursor: col-resize;
    user-select: none;
    -webkit-user-select: none;
  `}

  @media print {
    height: auto !important;
    width: 100% !important;
    overflow: visible !important;
    display: block !important;
  }
`;

const SidebarWrapper = styled.div<{ $isOpen: boolean; $width: number }>`
  width: ${({ $width }) => $width}px;
  min-width: ${({ $width }) => $width}px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  flex-direction: column;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.1s linear;
  position: relative;
  z-index: 20;

  @media (max-width: 768px) {
    width: ${({ $width }) => $width}px !important;
    min-width: ${({ $width }) => $width}px !important;
    max-width: 90vw;
    position: absolute;
    height: 100%;
    transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '-110%')});
    box-shadow: ${({ $isOpen, theme }) => $isOpen ? theme.shadows.large : 'none'};
  }

  @media print {
    display: none !important;
  }
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: ${({ theme }) => theme.colors.background};

  @media print {
    height: auto !important;
    width: 100% !important;
    overflow: visible !important;
    display: block !important;
  }
`;

const ResizeHandle = styled.div<{ $isResizing: boolean; $isVisible: boolean }>`
  width: 4px;
  cursor: col-resize;
  background: ${({ $isResizing, theme }) => $isResizing ? theme.colors.primary : 'transparent'};
  transition: ${({ theme }) => theme.effects.transition};
  z-index: 15;
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  touch-action: none;
  display: ${({ $isVisible }) => ($isVisible ? 'block' : 'none')};

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -10px;
    right: -10px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    opacity: 0.6;
  }

  @media print {
    display: none !important;
  }
`;

const MobileHeader = styled.div`
  display: none;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.glassBackground};
  backdrop-filter: blur(${({ theme }) => theme.effects.blur});
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.small};
  z-index: 10;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    background: ${({ theme }) => `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.accent})`};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 768px) {
    display: flex;
  }

  @media print {
    display: none !important;
  }
`;

const Overlay = styled.div<{ $isOpen: boolean }>`
  display: none;
  @media (max-width: 768px) {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 15;
    opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
    pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
    transition: opacity 0.3s ease;
  }

  @media print {
    display: none !important;
  }
`;

const STORAGE_KEY = 'handmemo-sidebar-width';
const DEFAULT_WIDTH_DESKTOP = 280;
const DEFAULT_WIDTH_MOBILE = 280;
const MIN_WIDTH_DESKTOP = 280;
const MAX_WIDTH_DESKTOP = 600;
const MIN_WIDTH_MOBILE = 280;
const MAX_WIDTH_MOBILE = Math.min(450, window.innerWidth * 0.95);

export const MainLayout: React.FC = () => {
  const { theme } = useColorTheme();
  const { language } = useLanguage();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isMobileInitial = window.innerWidth <= 768;
    const defaultW = isMobileInitial ? DEFAULT_WIDTH_MOBILE : DEFAULT_WIDTH_DESKTOP;
    const minW = isMobileInitial ? MIN_WIDTH_MOBILE : MIN_WIDTH_DESKTOP;

    const parsed = saved ? parseInt(saved, 10) : defaultW;
    return Math.max(minW, parsed);
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isAppEditing, setAppIsEditing] = useState(false);
  const [movingMemoId, setMovingMemoId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const globalLongPressTimer = useRef<any>(null);
  const [pasteButton, setPasteButton] = useState<{ x: number, y: number } | null>(null);

  // Track mobile state
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      // Long press logic for touch
      longPressTimer.current = setTimeout(() => {
        setIsResizing(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    } else {
      e.preventDefault();
      setIsResizing(true);
    }
  }, []);

  const stopResizing = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsResizing(false);
    localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      const minW = isMobile ? MIN_WIDTH_MOBILE : MIN_WIDTH_DESKTOP;
      const maxW = isMobile ? Math.min(MAX_WIDTH_MOBILE, window.innerWidth * 0.9) : MAX_WIDTH_DESKTOP;
      if (newWidth >= minW && newWidth <= maxW) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing, isMobile]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isResizing) {
      e.preventDefault(); // Prevent scrolling while resizing
      const newWidth = e.touches[0].clientX;
      const minW = isMobile ? MIN_WIDTH_MOBILE : MIN_WIDTH_DESKTOP;
      const maxW = isMobile ? Math.min(MAX_WIDTH_MOBILE, window.innerWidth * 0.9) : MAX_WIDTH_DESKTOP;
      if (newWidth >= minW && newWidth <= maxW) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing, isMobile]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', stopResizing);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [isResizing, handleMouseMove, handleTouchMove, stopResizing]);

  // Global long press for paste
  const handleGlobalTouchStart = useCallback((e: React.TouchEvent) => {
    // Dismiss existing paste button on ANY new touch
    if (pasteButton) {
      setPasteButton(null);
    }

    const target = e.target as HTMLElement;
    // Don't trigger on interactive elements or editors
    if (target.closest('.CodeMirror') || target.closest('.EasyMDEContainer') ||
      target.closest('input') || target.closest('textarea') || target.closest('button') ||
      target.closest('a') || target.closest('[role="button"]')) {
      return;
    }

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    if (globalLongPressTimer.current) clearTimeout(globalLongPressTimer.current);

    globalLongPressTimer.current = setTimeout(() => {
      setPasteButton({ x, y });
      if (navigator.vibrate) navigator.vibrate(50);
      globalLongPressTimer.current = null;
    }, 600);
  }, [pasteButton]);

  const handleGlobalTouchMove = useCallback(() => {
    if (globalLongPressTimer.current) {
      clearTimeout(globalLongPressTimer.current);
      globalLongPressTimer.current = null;
    }
  }, []);

  const handleGlobalTouchEnd = useCallback(() => {
    if (globalLongPressTimer.current) {
      clearTimeout(globalLongPressTimer.current);
      globalLongPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const dismissPaste = () => setPasteButton(null);
    window.addEventListener('click', dismissPaste);
    window.addEventListener('touchstart', dismissPaste);
    return () => {
      window.removeEventListener('click', dismissPaste);
      window.removeEventListener('touchstart', dismissPaste);
    };
  }, []);

  const triggerPaste = async () => {
    setPasteButton(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const urlMatch = text.match(/^https?:\/\/[^\s]+$/);
        const url = urlMatch ? urlMatch[0] : undefined;
        let title = getBestTitle(url, undefined, text);
        let content = text;

        if (url) {
          const cleaned = cleanImageUrl(url);
          if (isImageUrl(cleaned)) {
            content = `![](${cleaned})\n\n`;
            metadataCache.fetchImageMetadata(cleaned);
            title = '이미지';
          } else if (isYoutubeUrl(cleaned)) {
            const fetched = await fetchYoutubeTitle(cleaned);
            if (fetched) title = fetched;
          }
        }

        const now = new Date();
        const newId = await db.memos.add({
          title: title || '붙여넣은 메모',
          content: content,
          tags: [],
          createdAt: now,
          updatedAt: now,
          type: 'normal'
        });

        await db.autosaves.where('originalId').equals(newId).delete();
        navigate(`/memo/${newId}`);
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  // Handle sidebar toggle with history on mobile
  const toggleSidebar = useCallback((open: boolean, skipHistory = false) => {
    setSidebarOpen(open);
    if (isMobile) {
      if (open) {
        if (!window.history.state?.sidebarOpen) {
          window.history.pushState({ sidebarOpen: true, isGuard: true }, '');
        }
      } else if (!skipHistory) {
        if (window.history.state?.sidebarOpen) {
          window.history.back();
        }
      }
    }
  }, [isMobile]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isMobile) {
        setSidebarOpen(!!e.state?.sidebarOpen);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile]);

  const location = useLocation();
  useEffect(() => {
    if (isMobile && (location.pathname === '/' || location.pathname === '/index.html')) {
      setSidebarOpen(true);
    }
  }, [location.pathname, isMobile]);

  const navigate = useNavigate();

  useEffect(() => {
    const handleShare = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const shareTitle = searchParams.get('title');
      const shareText = searchParams.get('text');
      const shareUrl = searchParams.get('url');

      if (shareTitle || shareText || shareUrl) {
        // Clear search params so it doesn't re-trigger on refresh
        window.history.replaceState({}, '', window.location.pathname + window.location.hash);

        let content = (shareText || '') + (shareUrl && (!shareText || !shareText.includes(shareUrl)) ? (shareText ? '\n\n' : '') + shareUrl : '');
        if (!content) return;

        // Try to identify if it's a YouTube or Image URL
        const urls = content.match(/https?:\/\/[^\s]+/g) || [];
        let identifiedTitle = shareTitle || '';
        let finalContent = content;

        // If title is missing or generic, try to extract it from shareText
        if (!identifiedTitle || identifiedTitle === '공유된 메모' || identifiedTitle === '유튜브' || identifiedTitle === 'YouTube') {
          if (shareText && urls.length > 0) {
            const firstUrl = urls[0];
            if (firstUrl) {
              const parts = shareText.split(firstUrl);
              const textBefore = parts[0]?.trim();
              const textAfter = parts[1]?.trim();
              const candidate = textBefore || textAfter;
              if (candidate && candidate.length > 2) {
                identifiedTitle = candidate;
              }
            }
          }
        }

        if (!identifiedTitle) identifiedTitle = '공유된 메모';

        if (urls.length > 0) {
          const firstUrl = urls[0];
          if (firstUrl) {
            const cleaned = cleanImageUrl(firstUrl);
            if (isYoutubeUrl(cleaned)) {
              finalContent = firstUrl;
            } else if (isImageUrl(cleaned)) {
              finalContent = `![](${cleaned})\n\n`;
              metadataCache.fetchImageMetadata(cleaned);
            } else if (cleaned.startsWith('http')) {
              finalContent = cleaned;
            }

            // Get the best possible title
            identifiedTitle = getBestTitle(cleaned, identifiedTitle, shareText || undefined);

            // Special async fetch for YouTube titles if we still have a generic fallback
            if (isYoutubeUrl(cleaned) && (identifiedTitle === '유튜브 동영상' || identifiedTitle === '공유된 메모')) {
              const fetched = await fetchYoutubeTitle(cleaned);
              if (fetched) identifiedTitle = fetched;
            }
          }
        }

        const now = new Date();
        const newId = await db.memos.add({
          title: identifiedTitle,
          content: finalContent,
          tags: [],
          createdAt: now,
          updatedAt: now,
          type: 'normal'
        });

        // Cleanup any stale autosave for this ID (extra safety)
        await db.autosaves.where('originalId').equals(newId).delete();

        navigate(`/memo/${newId}`);
      }
    };

    handleShare();
  }, [navigate, location.search]);

  useEffect(() => {
    const handleSWShare = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('share-target') === 'true') {
        window.history.replaceState({}, '', window.location.pathname);

        const getPendingShare = (): Promise<any> => {
          return new Promise((resolve) => {
            const req = indexedDB.open('handmemo-share-db', 1);
            req.onsuccess = (e: any) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('shares')) { resolve(null); return; }
              const tx = db.transaction('shares', 'readwrite');
              const store = tx.objectStore('shares');
              const getReq = store.get('latest');
              getReq.onsuccess = () => {
                const val = getReq.result;
                if (val) store.delete('latest');
                resolve(val);
              };
              getReq.onerror = () => resolve(null);
            };
            req.onerror = () => resolve(null);
          });
        };

        const data = await getPendingShare();
        if (data) {
          let { title: sTitle, text: sText, url: sUrl, files } = data;
          let title = typeof sTitle === 'string' ? sTitle : '';
          let content = '';

          // 1. Handle Files
          if (files && files.length > 0) {
            const file = files[0];
            const fileBlob = file.blob; // Stored as blob in IDB

            if (file.type.startsWith('image/')) {
              title = title || '공유된 이미지';
              content = `[Image File: ${file.name}]\n(이미지 파일 공유는 아직 지원되지 않습니다)`;
            } else if (file.name.endsWith('.md') || file.type === 'text/markdown' || file.type === 'text/plain' || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
              title = title || file.name.replace(/\.[^/.]+$/, '');
              if (fileBlob) {
                content = await new Response(fileBlob).text();
              }
            } else if (file.name.endsWith('.xlsx')) {
              title = title || file.name.replace(/\.[^/.]+$/, '');
              content = `[Spreadsheet File: ${file.name}]\n(엑셀 파일 공유는 아직 지원되지 않습니다)`;
            }
          }

          // 2. Handle Text/URL if no content extracted from files
          if (!content) {
            let rawText = (sText || '') + (sUrl && (!sText || !sText.includes(sUrl)) ? (sText ? '\n\n' : '') + sUrl : '');
            if (rawText) {
              const urlMatch = rawText.match(/https?:\/\/[^\s]+/);
              const firstUrl = urlMatch ? urlMatch[0] : undefined;

              content = rawText;

              if (firstUrl) {
                const cleaned = cleanImageUrl(firstUrl);

                // Try to improve title
                title = getBestTitle(cleaned, title || undefined, sText || undefined);

                if (isYoutubeUrl(cleaned)) {
                  content = firstUrl; // Just the URL for youtube embeds
                  if (title === '유튜브 동영상' || title === '공유된 메모') {
                    const fetched = await fetchYoutubeTitle(cleaned);
                    if (fetched) title = fetched;
                  }
                } else if (isImageUrl(cleaned)) {
                  content = `![](${cleaned})\n\n`;
                  metadataCache.fetchImageMetadata(cleaned);
                  title = title || '이미지';
                }
              }
            }
          }

          if (content) {
            const now = new Date();
            const newId = await db.memos.add({
              title: title || '공유된 메모',
              content: content,
              tags: [],
              createdAt: now,
              updatedAt: now,
              type: 'normal'
            });
            await db.autosaves.where('originalId').equals(newId).delete();
            navigate(`/memo/${newId}`);
          }
        }
      }
    };
    handleSWShare();
  }, [navigate]);

  useEffect(() => {
    const handleGlobalDrop = async (e: DragEvent) => {
      // Check if we are in a CodeMirror editor area. If so, let the editor handle it.
      const target = e.target as HTMLElement;
      if (target.closest?.('.CodeMirror') || target.closest?.('.EasyMDEContainer') ||
        target.closest?.('input') || target.closest?.('textarea') ||
        target.closest?.('.fortune-container') || target.closest?.('.luckysheet')) {
        return; // Editor will handle it
      }

      if (!e.dataTransfer) return;
      const extracted = extractContentFromEvent(e.dataTransfer);

      if (extracted) {
        e.preventDefault();
        e.stopPropagation();

        const { url, text, title: extractedTitle, file, spreadsheet } = extracted;
        let title = '';
        let content = '';

        if (spreadsheet) {
          title = extractedTitle || '스프레드시트';
          content = `\`\`\`spreadsheet\n${JSON.stringify(spreadsheet)}\n\`\`\``;
        } else if (file) {
          title = file.name.replace(/\.[^/.]+$/, '');
          if (file.type.startsWith('image/')) {
            // Handle image file? For now keep it simple or convert to base64 if small?
            // Actually, we usually want to upload, but this app is local-first.
            // Let's create a temporary object URL or just say "Image File"
            content = `[Image File: ${file.name}]`;
          } else {
            content = await file.text();
          }
        } else {
          title = getBestTitle(url, extractedTitle, text);
          content = url || text || '';

          if (url && isImageUrl(url)) {
            content = `![](${url})\n\n`;
            metadataCache.fetchImageMetadata(url);
          }
        }

        // Special async fetch for YouTube titles
        if (url && isYoutubeUrl(url) && (title === '유튜브 동영상' || title === '공유된 메모')) {
          const fetched = await fetchYoutubeTitle(url);
          if (fetched) title = fetched;
        }

        // Create and save the memo immediately, then navigate to preview
        const now = new Date();
        const newId = await db.memos.add({
          title: title || '공유된 메모',
          content,
          tags: [],
          createdAt: now,
          updatedAt: now,
          type: 'normal'
        });

        // Cleanup any stale autosave for this ID (extra safety)
        await db.autosaves.where('originalId').equals(newId).delete();

        // Navigate to the saved memo's preview (not edit mode)
        navigate(`/memo/${newId}`);
      }
    };

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Same target detection as drop
      const target = e.target as HTMLElement;
      if (target.closest?.('.CodeMirror') || target.closest?.('.EasyMDEContainer') ||
        target.closest?.('input') || target.closest?.('textarea') ||
        target.closest?.('.fortune-container') || target.closest?.('.luckysheet')) {
        return;
      }

      if (!e.clipboardData) return;
      const extracted = extractContentFromEvent(e.clipboardData);

      if (extracted) {
        e.preventDefault();
        e.stopPropagation();

        const { url, text, title: extractedTitle, file, spreadsheet } = extracted;
        let title = '';
        let content = '';

        if (spreadsheet) {
          title = extractedTitle || '스프레드시트';
          content = `\`\`\`spreadsheet\n${JSON.stringify(spreadsheet)}\n\`\`\``;
        } else if (file) {
          title = file.name.replace(/\.[^/.]+$/, '');
          if (file.type.startsWith('image/')) {
            content = `[Image File: ${file.name}]`;
          } else {
            content = await file.text();
          }
        } else {
          title = getBestTitle(url, extractedTitle, text);
          content = url || text || '';

          if (url && isImageUrl(url)) {
            content = `![](${url})\n\n`;
            metadataCache.fetchImageMetadata(url);
          }
        }

        // Special async fetch for YouTube titles
        if (url && isYoutubeUrl(url) && (title === '유튜브 동영상' || title === '공유된 메모' || title === '웹 페이지')) {
          const fetched = await fetchYoutubeTitle(url);
          if (fetched) title = fetched;
        }

        // Create and save the memo
        const now = new Date();
        const newId = await db.memos.add({
          title: title || '공유된 메모',
          content,
          tags: [],
          createdAt: now,
          updatedAt: now,
          type: 'normal'
        });

        // Cleanup any stale autosave for this ID (extra safety)
        await db.autosaves.where('originalId').equals(newId).delete();

        navigate(`/memo/${newId}`);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types || [];
      if (types.includes('text/uri-list') || types.includes('text/plain') || types.includes('text/html')) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow context menu only on inputs or textareas if absolutely needed,
      // otherwise block to prevent "Download/Share/Print" popup on long-press.
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.CodeMirror') || target.closest('.fortune-container')) {
        return;
      }
      e.preventDefault();
    };

    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('paste', handleGlobalPaste);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [location.pathname, navigate]);

  // Resize handle is visible:
  // - Desktop: always visible
  // - Mobile: only when sidebar is open
  const isResizeHandleVisible = !isMobile || isSidebarOpen;

  return (
    <Container
      id="app-main-layout-container"
      ref={containerRef}
      $isResizing={isResizing}
      onTouchStart={handleGlobalTouchStart}
      onTouchMove={handleGlobalTouchMove}
      onTouchEnd={handleGlobalTouchEnd}
      onTouchCancel={handleGlobalTouchEnd}
    >
      <Overlay $isOpen={isSidebarOpen} onClick={() => toggleSidebar(false)} />
      <SidebarWrapper id="app-sidebar-area" $isOpen={isSidebarOpen} $width={sidebarWidth}>
        <Sidebar
          onCloseMobile={(skip: boolean | undefined) => toggleSidebar(false, skip)}
          isEditing={isAppEditing}
          movingMemoId={movingMemoId}
          setMovingMemoId={setMovingMemoId}
        />
        <ResizeHandle
          $isResizing={isResizing}
          $isVisible={isResizeHandleVisible}
          onMouseDown={startResizing}
          onTouchStart={startResizing}
          onTouchEnd={stopResizing}
        />
      </SidebarWrapper>
      <ContentWrapper id="app-content-wrapper-area">
        <MobileHeader>
          {!isSidebarOpen && <FiMenu size={24} onClick={() => toggleSidebar(true)} />}
          <h3>HandMemo</h3>
        </MobileHeader>
        <Outlet context={{ setAppIsEditing, movingMemoId, setMovingMemoId }} />
      </ContentWrapper>

      {pasteButton && (
        <div
          style={{
            position: 'fixed',
            left: pasteButton.x,
            top: pasteButton.y - 50,
            transform: 'translateX(-50%)',
            zIndex: 10000,
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '8px',
            boxShadow: theme.shadows.medium,
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 600,
            color: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => {
            e.stopPropagation();
            triggerPaste();
          }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <FiSave size={14} /> {language === 'ko' ? '붙여넣기' : 'Paste'}
        </div>
      )}
    </Container >
  );
};
