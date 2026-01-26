import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Sidebar } from '../Sidebar/Sidebar';
import { Outlet } from 'react-router-dom';
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

const ResizeHandle = styled.div<{ $isResizing: boolean }>`
  width: 4px;
  cursor: col-resize;
  background: ${({ $isResizing, theme }) => $isResizing ? theme.colors.primary : 'transparent'};
  transition: ${({ theme }) => theme.effects.transition};
  z-index: 25;
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  touch-action: none;

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
  
  @media (max-width: 768px) {
    width: 6px;
    background: ${({ theme, $isResizing }) => $isResizing ? theme.colors.primary : theme.colors.border};
    opacity: ${({ $isResizing }) => $isResizing ? 1 : 0.2};
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

const STORAGE_KEY = 'llmemo-sidebar-width';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(() => /Android/i.test(navigator.userAgent));
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    return Math.max(MIN_WIDTH, parsed);
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      // Shorter long press for mobile - just 200ms to start resizing
      longPressTimer.current = setTimeout(() => {
        setIsResizing(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 200);
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
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isResizing) {
      const newWidth = e.touches[0].clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

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

  // CSS Variable to sync handle position on mobile
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-x', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  return (
    <Container ref={containerRef} $isResizing={isResizing}>
      <Overlay $isOpen={isSidebarOpen} onClick={() => setSidebarOpen(false)} />
      <SidebarWrapper $isOpen={isSidebarOpen} $width={sidebarWidth}>
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
        {/* Resize handle - always attached to the right edge of sidebar */}
        <ResizeHandle
          $isResizing={isResizing}
          onMouseDown={startResizing}
          onTouchStart={startResizing}
          onTouchEnd={stopResizing}
        />
      </SidebarWrapper>
      <ContentWrapper>
        <MobileHeader>
          <FiMenu size={24} onClick={() => setSidebarOpen(true)} />
          <h3>LLMemo</h3>
        </MobileHeader>
        <Outlet />
      </ContentWrapper>
    </Container>
  );
};
