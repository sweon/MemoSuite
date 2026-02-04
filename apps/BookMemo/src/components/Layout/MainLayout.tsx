import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Sidebar, type SidebarRef } from '../Sidebar/Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { FiMenu } from 'react-icons/fi';

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

const STORAGE_KEY = 'bookmemo-sidebar-width';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH_DESKTOP = 280;
const MAX_WIDTH_DESKTOP = 600;
const MIN_WIDTH_MOBILE = 280;
const MAX_WIDTH_MOBILE = Math.min(400, window.innerWidth * 0.9);

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    return Math.max(MIN_WIDTH_MOBILE, parsed);
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isDirty, setIsDirty] = useState(false);
  const [isAppEditing, setAppIsEditing] = useState(false);
  const [movingMemoId, setMovingMemoId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<SidebarRef>(null);
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
      <Container id="app-main-layout-container" ref={containerRef} $isResizing={isResizing}>
        <Overlay $isOpen={isSidebarOpen} onClick={() => toggleSidebar(false)} />
        <SidebarWrapper id="app-sidebar-area" $isOpen={isSidebarOpen} $width={sidebarWidth}>
          <Sidebar
            ref={sidebarRef}
            onCloseMobile={(skip) => toggleSidebar(false, skip)}
            isEditing={isAppEditing || isDirty}
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
            <h3>BookMemo</h3>
          </MobileHeader>
          <Outlet context={{ setIsDirty, setAppIsEditing, movingMemoId, setMovingMemoId }} />
        </ContentWrapper>
      </Container>
    </DragDropContext>
  );
};
