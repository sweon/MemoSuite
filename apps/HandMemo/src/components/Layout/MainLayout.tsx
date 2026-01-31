import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Sidebar } from '../Sidebar/Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import { metadataCache } from '@memosuite/shared';
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

const extractUrlFromEvent = (dt: DataTransfer): string | null => {
  if (!dt) return null;

  // 1. Try to get image from HTML (Google Images often sends HTML with <img> tag)
  const html = dt.getData('text/html');
  if (html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const img = doc.querySelector('img');
      if (img && img.src) {
        const cleaned = cleanImageUrl(img.src);
        if (cleaned) return cleaned;
      }
    } catch (err) { }
  }

  // 2. Try text/uri-list
  const uriList = dt.getData('text/uri-list');
  if (uriList) {
    const lines = uriList.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (lines.length > 0) {
      const cleaned = cleanImageUrl(lines[0]);
      return cleaned;
    }
  }

  // 3. Try text/plain
  const plain = dt.getData('text/plain');
  if (plain && (plain.startsWith('http') || plain.startsWith('data:image/'))) {
    const cleaned = cleanImageUrl(plain.trim());
    return cleaned;
  }

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
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: ${({ theme }) => theme.colors.background};
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
`;

const STORAGE_KEY = 'handmemo-sidebar-width';
const DEFAULT_WIDTH_DESKTOP = 280;
const DEFAULT_WIDTH_MOBILE = 280;
const MIN_WIDTH_DESKTOP = 280;
const MAX_WIDTH_DESKTOP = 600;
const MIN_WIDTH_MOBILE = 280;
const MAX_WIDTH_MOBILE = Math.min(450, window.innerWidth * 0.95);

export const MainLayout: React.FC = () => {
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
  const [isDirty, setIsDirty] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);

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
        let identifiedTitle = shareTitle || '공유된 메모';
        let finalContent = content;

        if (urls.length > 0) {
          const firstUrl = urls[0];
          if (firstUrl) {
            const cleaned = cleanImageUrl(firstUrl);
            if (isYoutubeUrl(cleaned)) {
              identifiedTitle = '유튜브 동영상';
              finalContent = firstUrl;
            } else if (isImageUrl(cleaned)) {
              identifiedTitle = '이미지';
              finalContent = `![](${cleaned})\n\n`;
              metadataCache.fetchImageMetadata(cleaned);
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

        navigate(`/memo/${newId}`);
      }
    };

    handleShare();
  }, [navigate]);

  useEffect(() => {
    const handleGlobalDrop = async (e: DragEvent) => {
      // Check if we are in a CodeMirror editor area. If so, let the editor handle it.
      const target = e.target as HTMLElement;
      if (target.closest?.('.CodeMirror') || target.closest?.('.EasyMDEContainer')) {
        return; // Editor will handle it
      }

      if (!e.dataTransfer) return;
      const url = extractUrlFromEvent(e.dataTransfer);

      if (url && (isImageUrl(url) || isYoutubeUrl(url))) {
        e.preventDefault();
        e.stopPropagation();

        const isYoutube = isYoutubeUrl(url);
        if (!isYoutube) metadataCache.fetchImageMetadata(url);

        // Create and save the memo immediately, then navigate to preview
        const now = new Date();
        const newId = await db.memos.add({
          title: isYoutube ? '유튜브 동영상' : '이미지',
          content: isYoutube ? url : `![](${url})\n\n`,
          tags: [],
          createdAt: now,
          updatedAt: now,
          type: 'normal'
        });

        // Navigate to the saved memo's preview (not edit mode)
        navigate(`/memo/${newId}`);
      }
    };

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Same target detection as drop
      const target = e.target as HTMLElement;
      if (target.closest?.('.CodeMirror') || target.closest?.('.EasyMDEContainer') ||
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (!e.clipboardData) return;
      const url = extractUrlFromEvent(e.clipboardData);

      if (url && (isImageUrl(url) || isYoutubeUrl(url))) {
        e.preventDefault();
        e.stopPropagation();

        const isYoutube = isYoutubeUrl(url);
        if (!isYoutube) metadataCache.fetchImageMetadata(url);

        // Create and save the memo
        const now = new Date();
        const newId = await db.memos.add({
          title: isYoutube ? '유튜브 동영상' : '이미지',
          content: isYoutube ? url : `![](${url})\n\n`,
          tags: [],
          createdAt: now,
          updatedAt: now,
          type: 'normal'
        });

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

    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [location.pathname, navigate]);

  // Resize handle is visible:
  // - Desktop: always visible
  // - Mobile: only when sidebar is open
  const isResizeHandleVisible = !isMobile || isSidebarOpen;

  return (
    <Container ref={containerRef} $isResizing={isResizing}>
      <Overlay $isOpen={isSidebarOpen} onClick={() => toggleSidebar(false)} />
      <SidebarWrapper $isOpen={isSidebarOpen} $width={sidebarWidth}>
        <Sidebar onCloseMobile={(skip: boolean | undefined) => toggleSidebar(false, skip)} isDirty={isDirty} />
        <ResizeHandle
          $isResizing={isResizing}
          $isVisible={isResizeHandleVisible}
          onMouseDown={startResizing}
          onTouchStart={startResizing}
          onTouchEnd={stopResizing}
        />
      </SidebarWrapper>
      <ContentWrapper>
        <MobileHeader>
          {!isSidebarOpen && <FiMenu size={24} onClick={() => toggleSidebar(true)} />}
          <h3>HandMemo</h3>
        </MobileHeader>
        <Outlet context={{ setIsDirty }} />
      </ContentWrapper>
    </Container>
  );
};
