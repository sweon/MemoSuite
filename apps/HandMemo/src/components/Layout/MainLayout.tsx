import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Sidebar, type SidebarRef } from '../Sidebar/Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { FiMenu, FiSave } from 'react-icons/fi';
import { metadataCache, useColorTheme, useLanguage, useModal } from '@memosuite/shared';
import { AndroidExitHandler } from '../AndroidExitHandler';
import { useFolder } from '../../contexts/FolderContext';
import { db } from '../../db';
import { AndroidExitHandler } from '../AndroidExitHandler';

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

const isYoutubePlaylistUrl = (url: string) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes('youtube.com') && !host.includes('youtu.be')) return false;

    const listId = u.searchParams.get('list');

    // Handle new format: /show/VL[ID]
    if (u.pathname.includes('/show/VL')) return true;

    if (listId) return true;

    // If it's the dedicated /playlist path, it's a playlist
    const path = u.pathname.toLowerCase();
    if (path.includes('/playlist') || path.includes('/view_as_playlist')) return true;

    return false;
  } catch (e) { return false; }
};

const isYoutubeUrl = (url: string) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes('youtube.com') && !host.includes('youtu.be')) return false;

    const path = u.pathname.toLowerCase();
    return path.includes('/watch') ||
      path.includes('/embed/') ||
      path.includes('/shorts/') ||
      path.includes('/playlist') ||
      path.includes('/v/') ||
      host.includes('youtu.be');
  } catch (e) {
    const u = url.toLowerCase();
    return u.includes('youtube.com/watch') ||
      u.includes('youtu.be/') ||
      u.includes('youtube.com/embed/') ||
      u.includes('youtube.com/shorts/') ||
      u.includes('youtube.com/playlist');
  }
};

const hasYoutubeVideoId = (url: string) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return !!u.searchParams.get('v') ||
      u.pathname.includes('/embed/') ||
      u.pathname.includes('/shorts/') ||
      u.pathname.includes('/v/') ||
      (u.hostname.toLowerCase().includes('youtu.be') && u.pathname.length > 1);
  } catch (e) {
    return url.includes('v=') || url.includes('youtu.be/') || url.includes('embed/') || url.includes('shorts/');
  }
};

const quoteText = (text: string): string => {
  if (!text) return '';
  const trimmed = text.trim();
  // Don't quote if it already looks like markdown or special content
  if (trimmed.startsWith('>') || trimmed.startsWith('![](') || trimmed.startsWith('```') || trimmed.startsWith('[Spreadsheet File:')) {
    return text;
  }
  return text.split('\n').map(line => `> ${line}`).join('\n');
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

  // 1.2 If we have plain text and it's NOT a single URL, return it as text and avoid aggressive URL extraction from HTML.
  const isPlainSingleUrl = plain && /^https?:\/\/[^\s]+$/.test(plain);
  const isPlainDataImage = plain && plain.startsWith('data:image/');

  // If plain text is present and not just a single URL, prioritize it as text content.
  // This prevents HTML/URI-list parsing from overriding multi-line text.
  if (plain && !isPlainSingleUrl && !isPlainDataImage) {
    // Check for spreadsheet data within plain text first
    if (plain.includes('\t') && plain.includes('\n')) {
      const sheetData = parseTsvToFortuneSheet(plain);
      if (sheetData && sheetData[0].celldata.length > 0) {
        return { spreadsheet: sheetData, title: '스프레드시트' };
      }
    }
    return { text: plain };
  }

  // 1.5 Try to detect spreadsheet data from HTML or TSV
  if (html && (html.includes('<table') || html.includes('luckysheet') || html.includes('fortune'))) {
    const sheetData = parseHtmlTableToFortuneSheet(html);
    if (sheetData && sheetData[0].celldata.length > 0) {
      return { spreadsheet: sheetData, title: '스프레드시트' };
    }
  }

  // 2. Try to get image/link from HTML ONLY if plain text is empty or a single URL
  if (html && (!plain || isPlainSingleUrl || isPlainDataImage)) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const img = doc.querySelector('img');
      const link = doc.querySelector('a');

      if (link && link.href) {
        const url = cleanImageUrl(link.href);
        const title = link.title || link.innerText?.trim() || (img ? (img.alt || img.title) : undefined);
        if (url && (url.startsWith('http') || url.startsWith('data:image/'))) {
          return { url, title: title?.trim() || undefined, text: plain };
        }
      }

      if (img && img.src) {
        const url = cleanImageUrl(img.src);
        const title = img.alt || img.title || undefined;
        if (url && (url.startsWith('http') || url.startsWith('data:image/'))) {
          return { url, title: title?.trim() || undefined, text: plain };
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
        return { url, text: plain };
      }
    }
  }

  // 4. Handle plain text if it's a single URL or data image (which was not prioritized earlier)
  if (plain) {
    // If it's a single URL or data image, return it as a URL
    if (isPlainSingleUrl || isPlainDataImage) {
      const cleaned = cleanImageUrl(plain);
      return { url: cleaned };
    }

    // If it's plain text that wasn't caught by the early prioritization (e.g., single line, not a URL)
    // or if it contains multiple lines but no URL, treat it as text.
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
  const isPlaylist = url ? isYoutubePlaylistUrl(url) : false;
  const isYoutube = url ? isYoutubeUrl(url) : false;
  const isImage = url ? isImageUrl(url) : false;

  let title = suggestedTitle?.trim() || '';

  if (!title || (url && title === url) || title === '공유된 메모' || title === '유튜브' || title === 'YouTube' || title === '웹 페이지') {
    try {
      if (url) {
        const urlObj = new URL(url);
        if (isPlaylist) {
          title = '유튜브 재생목록';
        } else if (isYoutube) {
          title = '유튜브 동영상';
        } else if (isImage) {
          title = '이미지';
        } else {
          // Try to get a meaningful title from the path
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            let generated = decodeURIComponent(lastPart)
              .replace(/[-_]/g, ' ')
              .replace(/\.[^/.]+$/, '')
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
        const lines = text.split('\n').filter(Boolean);
        if (lines.length > 0) {
          const firstLine = lines[0].trim();
          title = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
        }
      }
    } catch (e) {
      if (!title || (url && title === url) || title === '웹 페이지') {
        title = isPlaylist ? '유튜브 재생목록' : isYoutube ? '유튜브 동영상' : isImage ? '이미지' : '웹 페이지';
      }
    }
  }

  if (!title) title = isPlaylist ? '유튜브 재생목록' : isYoutube ? '유튜브 동영상' : isImage ? '이미지' : '웹 페이지';
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

const fetchYoutubePlaylistData = async (url: string): Promise<{ title: string, items: { videoId: string, title: string }[] } | null> => {
  try {
    const u = new URL(url);
    let listId = u.searchParams.get('list');

    // Support new format: /show/VL[ID]
    if (!listId && u.pathname.includes('/show/VL')) {
      const match = u.pathname.match(/\/show\/VL([^/?#]+)/);
      if (match) listId = match[1];
    }

    if (!listId) return null;

    const targetUrl = `https://www.youtube.com/playlist?list=${listId}`;
    let playlistTitle = '유튜브 재생목록';
    let html = '';

    // 1. Run title fetch and HTML fetch in parallel to maximize speed
    const [titleResult, htmlResult] = await Promise.allSettled([
      // Title via oEmbed (usually fastest for title)
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${listId}&format=json`)
        .then(res => res.ok ? res.json() : null)
        .then(d => d?.title || null),
      // HTML via multiple proxies (first one to respond wins)
      Promise.any([
        // corsproxy.io is generally very fast
        fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`).then(res => res.ok ? res.text() : Promise.reject()),
        // codetabs is a solid alternative
        fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`).then(res => res.ok ? res.text() : Promise.reject()),
        // AllOrigins as a reliable fallback
        fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`)
          .then(res => res.ok ? res.json() : Promise.reject())
          .then(data => data.contents || Promise.reject())
      ])
    ]);

    if (titleResult.status === 'fulfilled' && titleResult.value) {
      playlistTitle = titleResult.value;
    }

    if (htmlResult.status === 'fulfilled' && htmlResult.value) {
      html = htmlResult.value;
    }

    if (!html) return { title: playlistTitle, items: [] };

    // Update title from HTML if oEmbed failed or was generic
    if (playlistTitle === '유튜브 재생목록') {
      const tMatch = html.match(/<title>(.*?)<\/title>/i);
      if (tMatch) playlistTitle = tMatch[1].replace(' - YouTube', '').trim();
    }

    const items: { videoId: string, title: string }[] = [];
    const match = html.match(/var ytInitialData = (\{.*?\});/);
    if (match) {
      try {
        const json = JSON.parse(match[1]);
        const videos = json.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
        if (Array.isArray(videos)) {
          videos.forEach((it: any) => {
            const v = it.playlistVideoRenderer;
            if (v && v.videoId) {
              items.push({
                videoId: v.videoId,
                title: v.title?.runs?.[0]?.text || v.title?.simpleText || '영상 제목 없음'
              });
            }
          });
        }
      } catch (e) { }
    }

    if (items.length === 0) {
      // Improved regex to catch titles in various formats (runs or simpleText)
      const vRegex = /"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{(?:[^}]*?"runs":\[\{"text":"(.*?)"\}\]|"simpleText":"(.*?)"\})/g;
      let m;
      while ((m = vRegex.exec(html)) !== null) {
        const id = m[1];
        let t = m[2] || m[3] || '영상 제목 없음';
        t = t.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        if (!items.find(it => it.videoId === id)) items.push({ videoId: id, title: t });
      }
    }

    // Absolute fallback: if still zero, just search for videoIds alone
    if (items.length === 0) {
      const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      let m;
      while ((m = idRegex.exec(html)) !== null) {
        const id = m[1];
        if (!items.find(it => it.videoId === id)) {
          items.push({ videoId: id, title: '영상 제목 없음' });
        }
      }
    }

    return { title: playlistTitle, items: items.slice(0, 500) };
  } catch (e) {
    console.error('Failed to fetch playlist items', e);
  }
  return null;
};

const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  backdrop-filter: blur(2px);
`;

const LoadingBox = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  padding: 24px 32px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 280px;
`;

const Spinner = keyframes`
  to { transform: rotate(360deg); }
`;

const SpinnerIcon = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid ${({ theme }) => theme.colors.primary}30;
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${Spinner} 0.8s linear infinite;
`;

const LoadingText = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

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
  user-select: none;
  -webkit-user-select: none;

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
  user-select: text;
  -webkit-user-select: text;

  @media print {
    height: auto !important;
    width: 100% !important;
    overflow: visible !important;
    display: block !important;
  }
`;

const SidebarInactiveOverlay = styled.div<{ $isEditing: boolean }>`
  position: absolute;
  inset: 0;
  background-color: transparent;
  z-index: 100;
  display: ${({ $isEditing }) => ($isEditing ? 'block' : 'none')};
  cursor: not-allowed;
  pointer-events: auto;
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
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #9C640C;
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
  const { currentFolderId } = useFolder();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAppEditing, setAppIsEditing] = useState(false);
  const [movingMemoId, setMovingMemoId] = useState<number | null>(null);

  useEffect(() => {
    if (isMobile && (location.pathname === '/' || location.pathname === '/index.html')) {
      setSidebarOpen(true);
    }
  }, [location.pathname, isMobile]);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isMobileInitial = window.innerWidth <= 768;
    const defaultW = isMobileInitial ? DEFAULT_WIDTH_MOBILE : DEFAULT_WIDTH_DESKTOP;
    const minW = isMobileInitial ? MIN_WIDTH_MOBILE : MIN_WIDTH_DESKTOP;

    const parsed = saved ? parseInt(saved, 10) : defaultW;
    return Math.max(minW, parsed);
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<SidebarRef>(null);
  const longPressTimer = useRef<any>(null);
  const globalLongPressTimer = useRef<any>(null);
  const [pasteButton, setPasteButton] = useState<{ x: number, y: number } | null>(null);
  const [isPlaylistExtracting, setIsPlaylistExtracting] = useState(false);
  const { confirm } = useModal();

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

    // Check for global inhibit flag (e.g. from Drawing Modal)
    if ((window as any).__FABRIC_MODAL_OPEN__) {
      return;
    }

    const target = e.target as HTMLElement;

    // Only allow on sidebar area
    if (!target.closest('#app-sidebar-area')) {
      return;
    }

    // Don't trigger on interactive elements or editors
    if (target.closest('.CodeMirror') || target.closest('.EasyMDEContainer') ||
      target.closest('input') || target.closest('textarea') || target.closest('button') ||
      target.closest('a') || target.closest('[role="button"]') || target.closest('canvas')) {
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

  const triggerPaste = useCallback(async () => {
    setPasteButton(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : undefined;
      const cleaned = url ? cleanImageUrl(url) : undefined;

      let title = getBestTitle(cleaned, undefined, text);
      let content = text;

      if (cleaned) {
        if (isImageUrl(cleaned)) {
          content = `![](${cleaned})\n\n`;
          metadataCache.fetchImageMetadata(cleaned);
          title = '이미지';
        } else if (isYoutubePlaylistUrl(cleaned)) {
          setIsPlaylistExtracting(true);
          try {
            const playlistData = await fetchYoutubePlaylistData(cleaned);
            if (playlistData) {
              title = playlistData.title;
              if (playlistData.items.length > 0) {
                content = playlistData.items.map(item => `${item.title}\nhttps://www.youtube.com/watch?v=${item.videoId}`).join('\n\n');
              } else {
                content = cleaned; // Fallback to just the URL if items failed but it's a playlist
              }
            }
          } finally {
            setIsPlaylistExtracting(false);
          }
        } else if (isYoutubeUrl(cleaned)) {
          content = cleaned;
          const fetched = await fetchYoutubeTitle(cleaned);
          if (fetched) title = fetched;
        } else {
          content = quoteText(text);
        }
      } else {
        content = quoteText(text);
      }

      const now = new Date();
      const newId = await db.memos.add({
        folderId: currentFolderId || undefined,
        title: title || '붙여넣은 메모',
        content: content,
        tags: [],
        createdAt: now,
        updatedAt: now,
        type: 'normal'
      });

      await db.autosaves.where('originalId').equals(newId).delete();
      navigate(`/memo/${newId}`);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  }, [currentFolderId, navigate]);

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
            const isPlaylist = isYoutubePlaylistUrl(cleaned);
            const isVideo = isYoutubeUrl(cleaned);
            let usePlaylist = isPlaylist;

            if (isPlaylist && isVideo && hasYoutubeVideoId(cleaned)) {
              usePlaylist = await confirm({
                message: language === 'ko'
                  ? "동영상과 재생목록이 모두 포함되어 있습니다. 재생목록 전체를 등록하시겠습니까?"
                  : "Both video and playlist IDs are present. Register the entire playlist?",
                confirmText: language === 'ko' ? "재생목록 전체" : "Playlist",
                cancelText: language === 'ko' ? "동영상만" : "Video only"
              });
            }

            if (usePlaylist) {
              setIsPlaylistExtracting(true);
              try {
                const playlistData = await fetchYoutubePlaylistData(cleaned);
                if (playlistData) {
                  identifiedTitle = playlistData.title;
                  finalContent = playlistData.items.map(item => `${item.title}\nhttps://www.youtube.com/watch?v=${item.videoId}`).join('\n\n');
                }
              } finally {
                setIsPlaylistExtracting(false);
              }
            } else if (isVideo) {
              finalContent = firstUrl;
            } else if (isImageUrl(cleaned)) {
              finalContent = `![](${cleaned})\n\n`;
              metadataCache.fetchImageMetadata(cleaned);
            } else {
              finalContent = firstUrl;
            }

            // Get the best possible title if not playlist (playlist sets its own)
            // Get the best possible title if it wasn't already set by a successful playlist extraction
            if (!finalContent.includes('\nhttps://www.youtube.com/watch?v=')) {
              identifiedTitle = getBestTitle(cleaned, identifiedTitle, shareText || undefined);

              // Special async fetch for YouTube titles if we still have a generic fallback
              if (isVideo && (identifiedTitle === '유튜브 동영상' || identifiedTitle === '공유된 메모')) {
                const fetched = await fetchYoutubeTitle(cleaned);
                if (fetched) identifiedTitle = fetched;
              }
            }
          }
        } else {
          // No URL found, but we have text
          finalContent = quoteText(content);
        }

        const now = new Date();
        const newId = await db.memos.add({
          folderId: currentFolderId || undefined,
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
  }, [navigate, location.search, currentFolderId, language, confirm]);

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

                // Check for playlist FIRST
                if (isYoutubePlaylistUrl(cleaned)) {
                  setIsPlaylistExtracting(true);
                  try {
                    const playlistData = await fetchYoutubePlaylistData(cleaned);
                    if (playlistData) {
                      title = playlistData.title;
                      content = playlistData.items.map(item => `${item.title}\nhttps://www.youtube.com/watch?v=${item.videoId}`).join('\n\n');
                    }
                  } finally {
                    setIsPlaylistExtracting(false);
                  }
                } else {
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
                  } else {
                    content = firstUrl;
                  }
                }
              } else {
                content = quoteText(rawText);
              }
            }
          }

          if (content) {
            const now = new Date();
            const newId = await db.memos.add({
              folderId: currentFolderId || undefined,
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
  }, [navigate, currentFolderId]);

  useEffect(() => {
    const handleGlobalDrop = async (e: DragEvent) => {
      // If we are editing, we shouldn't trigger the global drop behavior which creates a NEW memo
      if (isAppEditing) return;

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
          title = getBestTitle(url, extractedTitle, text || undefined);
          content = url || text || '';

          if (url) {
            const cleaned = cleanImageUrl(url);
            if (isImageUrl(cleaned)) {
              content = `![](${cleaned})\n\n`;
              metadataCache.fetchImageMetadata(cleaned);
            } else {
              const isPlaylist = isYoutubePlaylistUrl(cleaned);
              const isVideo = isYoutubeUrl(cleaned);
              let usePlaylist = isPlaylist;

              if (isPlaylist && isVideo && hasYoutubeVideoId(cleaned)) {
                usePlaylist = await confirm({
                  message: language === 'ko'
                    ? "동영상과 재생목록이 모두 포함되어 있습니다. 재생목록 전체를 등록하시겠습니까?"
                    : "Both video and playlist IDs are present. Register the entire playlist?",
                  confirmText: language === 'ko' ? "재생목록 전체" : "Playlist",
                  cancelText: language === 'ko' ? "동영상만" : "Video only"
                });
              }

              if (usePlaylist) {
                setIsPlaylistExtracting(true);
                try {
                  const playlistData = await fetchYoutubePlaylistData(cleaned);
                  if (playlistData) {
                    title = playlistData.title;
                    content = playlistData.items.map(item => `${item.title}\nhttps://www.youtube.com/watch?v=${item.videoId}`).join('\n\n');
                  }
                } finally {
                  setIsPlaylistExtracting(false);
                }
              } else if (isVideo) {
                const fetched = await fetchYoutubeTitle(cleaned);
                if (fetched) title = fetched;
              } else {
                content = url;
              }
            }
          } else if (text) {
            content = quoteText(text);
          }
        }

        // Create and save the memo immediately, then navigate to preview
        const now = new Date();
        const newId = await db.memos.add({
          folderId: currentFolderId || undefined,
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
      // If we are editing, we shouldn't trigger the global paste behavior which creates a NEW memo
      if (isAppEditing) return;

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
          title = getBestTitle(url, extractedTitle, text || undefined);
          content = url || text || '';

          if (url) {
            const cleaned = cleanImageUrl(url);
            if (isImageUrl(cleaned)) {
              content = `![](${cleaned})\n\n`;
              metadataCache.fetchImageMetadata(cleaned);
            } else {
              const isPlaylist = isYoutubePlaylistUrl(cleaned);
              const isVideo = isYoutubeUrl(cleaned);
              let usePlaylist = isPlaylist;

              if (isPlaylist && isVideo && hasYoutubeVideoId(cleaned)) {
                usePlaylist = await confirm({
                  message: language === 'ko'
                    ? "동영상과 재생목록이 모두 포함되어 있습니다. 재생목록 전체를 등록하시겠습니까?"
                    : "Both video and playlist IDs are present. Register the entire playlist?",
                  confirmText: language === 'ko' ? "재생목록 전체" : "Playlist",
                  cancelText: language === 'ko' ? "동영상만" : "Video only"
                });
              }

              if (usePlaylist) {
                setIsPlaylistExtracting(true);
                try {
                  const playlistData = await fetchYoutubePlaylistData(cleaned);
                  if (playlistData) {
                    title = playlistData.title;
                    content = playlistData.items.map(item => `${item.title}\nhttps://www.youtube.com/watch?v=${item.videoId}`).join('\n\n');
                  }
                } finally {
                  setIsPlaylistExtracting(false);
                }
              } else if (isVideo) {
                const fetched = await fetchYoutubeTitle(cleaned);
                if (fetched) title = fetched;
              } else {
                content = url;
              }
            }
          } else if (text) {
            content = quoteText(text);
          }
        }

        // Create and save the memo
        const now = new Date();
        const newId = await db.memos.add({
          folderId: currentFolderId || undefined,
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

      // Always allow context menu if there is a text selection
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }

      // Allow context menu only on inputs, textareas, or markdown preview areas
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('.CodeMirror') ||
        target.closest('.fortune-container') ||
        target.closest('.markdown-content')
      ) {
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
  }, [location.pathname, navigate, currentFolderId, language, confirm, isAppEditing]);

  // Resize handle is visible:
  // - Desktop: always visible
  // - Mobile: only when sidebar is open
  const isResizeHandleVisible = !isMobile || isSidebarOpen;

  const handleDragEnd = async (result: DropResult) => {
    if (sidebarRef.current) {
      await sidebarRef.current.handleDragEnd(result);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Container
        id="app-main-layout-container"
        ref={containerRef}
        $isResizing={isResizing}
        onTouchStart={handleGlobalTouchStart}
        onTouchMove={handleGlobalTouchMove}
        onTouchEnd={handleGlobalTouchEnd}
        onTouchCancel={handleGlobalTouchEnd}
      >
        <AndroidExitHandler
          isSidebarOpen={isSidebarOpen}
          onOpenSidebar={() => toggleSidebar(true)}
        />
        <Overlay $isOpen={isSidebarOpen} onClick={() => toggleSidebar(false)} />
        <SidebarWrapper id="app-sidebar-area" $isOpen={isSidebarOpen} $width={sidebarWidth}>
          <Sidebar
            ref={sidebarRef}
            onCloseMobile={(skip: boolean | undefined) => toggleSidebar(false, skip)}
            isEditing={isAppEditing}
            movingMemoId={movingMemoId}
            setMovingMemoId={setMovingMemoId}
          />
          <SidebarInactiveOverlay $isEditing={isAppEditing} />
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
        {isPlaylistExtracting && (
          <LoadingOverlay>
            <LoadingBox>
              <SpinnerIcon />
              <LoadingText>
                {language === 'ko' ? '유튜브에서 재생목록을 가져오는 중입니다' : 'Fetching playlist from YouTube...'}
              </LoadingText>
            </LoadingBox>
          </LoadingOverlay>
        )}
      </Container >
    </DragDropContext>
  );
};
