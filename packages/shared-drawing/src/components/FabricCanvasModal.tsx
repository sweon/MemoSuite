import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import styled from 'styled-components';
import { fabric } from 'fabric';
import { ConfirmModal } from './ConfirmModal';
import { FiX, FiCheck, FiMousePointer, FiMinus, FiSquare, FiCircle, FiTriangle, FiType, FiArrowDown, FiSettings, FiRotateCcw, FiRotateCw, FiDownload, FiTrash2, FiHelpCircle, FiEdit2, FiMaximize, FiMinimize, FiLock, FiUnlock } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { HexColorPicker } from 'react-colorful';
import { translations, type Language, type TranslationKeys } from '../translations';
import { useExitGuard } from '../contexts/ExitGuardContext';
import { PdfPageSelector } from './PdfPageSelector';
import type {
    BackgroundType,
    BackgroundColorType,
    BackgroundConfig,
} from '../utils/background';
import {
    calculateBackgroundColor,
    createBackgroundPattern
} from '../utils/background';
import { isMobileDevice } from '../utils/device';



// Pixel Eraser Icon - 3D pink block eraser
const PixelEraserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 14L14 3L22 7L13 18L5 14Z" fill="#ffc9c9" />
        <path d="M5 14L5 19L13 23L13 18" fill="#fa5252" />
        <path d="M13 23L22 12L22 7" fill="#e03131" />
    </svg>
);

// Object Eraser Icon - 3D blue block eraser with indicator
const ObjectEraserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 14L14 3L22 7L13 18L5 14Z" fill="#e7f5ff" />
        <path d="M5 14L5 19L13 23L13 18" fill="#339af0" />
        <path d="M13 23L22 12L22 7" fill="#1c7ed6" />
        <circle cx="13" cy="11" r="2.5" fill="#f03e3e" stroke="#f03e3e" strokeWidth="1" />
    </svg>
);

const EllipseIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="9" ry="5" />
    </svg>
);



const CircleBrushIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="4" />
        <circle cx="15" cy="15" r="5" />
    </svg>
);

const HighlighterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 11-6 6v3h9l3-3" />
        <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
);

const GlowIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2V4M12 20V22M4 12H2M22 12H20M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66M6.34 6.34L4.93 4.93" />
    </svg>
);

const DiamondIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 12L12 22L22 12L12 2Z" />
    </svg>
);

const PentagonIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 10L5 21H19L22 10L12 2Z" />
    </svg>
);

const HexagonIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" />
    </svg>
);

const OctagonIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2L2 7V17L7 22H17L22 17V7L17 2H7Z" />
    </svg>
);

const StarIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
);

const ZoomOneIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M11 15V7L9 9" />
    </svg>
);

const BackgroundIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
);

const VerticalExpandIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16" />
        <path d="M8 8l4-4 4 4" />
        <path d="M8 16l4 4 4-4" />
    </svg>
);

const PenIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l5.5 5.5" />
    </svg>
);

const PencilIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        <path d="M15 5l4 4" />
    </svg>
);


const LaserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* 레이저 포인터 본체 (메탈릭 실린더) */}
        <path d="M3 21L12 12" stroke="#495057" strokeWidth="2.5" />
        <path d="M12 12L14 10" stroke="#adb5bd" strokeWidth="2.5" /> {/* 끝단 팁 부분 */}

        {/* 본체의 작은 버튼 */}
        <circle cx="7" cy="17" r="0.5" fill="#f03e3e" stroke="none" />

        {/* 발사되는 광선 (강렬한 빛의 중심) */}
        <path d="M14 10L22 2" stroke="#ff4d4d" strokeWidth="2" strokeDasharray="1 1" />

        {/* 빛의 산란 효과 (Glaring/Sparkling) */}
        <path d="M16 6l2-2" stroke="#ff4d4d" strokeWidth="0.8" />
        <path d="M14 8l-1-1" stroke="#ff4d4d" strokeWidth="0.8" />
        <path d="M18 4l1.5-1.5" stroke="#ff4d4d" strokeWidth="0.5" />

        {/* 끝부분 빛의 맺힘 */}
        <circle cx="21" cy="3" r="1" fill="#ff4d4d" fillOpacity="0.6" stroke="none" />
    </svg>
);

const HatchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="7" y1="3" x2="3" y2="7" />
        <line x1="14" y1="3" x2="3" y2="14" />
        <line x1="21" y1="3" x2="3" y2="21" />
        <line x1="21" y1="10" x2="10" y2="21" />
        <line x1="21" y1="17" x2="17" y2="21" />
    </svg>
);

const PaletteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" />
        <circle cx="17.5" cy="10.5" r=".5" />
        <circle cx="8.5" cy="7.5" r=".5" />
        <circle cx="6.5" cy="12.5" r=".5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H17c2.8 0 5-2.2 5-5 0-5.3-4.5-9.7-10-9.7z" />
    </svg>
);
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  touch-action: none !important;
  overscroll-behavior: none !important;
`;

const ModalContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  overscroll-behavior: none;

  /* Hide number input spinners */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;


const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap; /* Allow wrapping for mobile devices */
  gap: 2px;
  padding: 2px 4px;
  background: #f1f3f5;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
  min-height: 28px; /* Use min-height to allow expansion when wrapped */
`;

const ToolButton = styled.button<{ $active?: boolean; disabled?: boolean }>`
  background: ${({ $active }) => $active ? '#e9ecef' : 'transparent'};
  border: 1px solid ${({ $active }) => $active ? '#adb5bd' : 'transparent'};
  color: #333;
  padding: 2px;
  border-radius: 3px;
  cursor: ${({ disabled }) => disabled ? 'default' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  min-width: 22px;
  height: 22px;
  touch-action: manipulation;
  opacity: ${({ disabled }) => disabled ? 0.3 : 1};
  pointer-events: ${({ disabled }) => disabled ? 'none' : 'auto'};
  
  &:hover {
    background: ${({ disabled }) => disabled ? 'transparent' : '#e9ecef'};
  }
`;

const StatusToggleButton = styled.button<{ $active?: boolean; $activeColor?: string; $activeBg?: string }>`
  background: ${({ $active, $activeBg }) => ($active ? ($activeBg || '#fff9db') : 'transparent')};
  color: ${({ $active, $activeColor }) => ($active ? ($activeColor || '#f08c00') : '#adb5bd')};
  border: none;
  border-radius: 4px;
  padding: 2px;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  
  &:hover {
    background: ${({ $active }) => ($active ? '#fff3bf' : '#f1f3f5')};
    color: ${({ $active }) => ($active ? '#e67700' : '#495057')};
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const ToolGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
`;

const ColorButton = styled.div<{ $color: string; $selected?: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  border: 2px solid ${({ $selected }) => $selected ? '#333' : 'transparent'};
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  touch-action: manipulation;
  
    &:hover {
    transform: scale(1.1);
  }
`;

// Detached Scrollbar with full-width thumb
const StyledScrollbar = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto; /* Allow scrolling */
  
  &::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 6px;
    border: 3px solid #f1f1f1;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const CanvasWrapper = styled.div<{ $bgColor?: string; $side: 'left' | 'right' }>`
  flex: 1;
  width: 100%;
  height: 100%;
  background: #f0f0f0; /* Backdrop color */
  background-attachment: local;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
  display: block; /* Block layout is more stable for scroll-based layouts */
  -webkit-overflow-scrolling: touch;
  touch-action: none !important;
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
  
  /* Left side scrollbar support via RTL */
  /* We use direction: rtl for static left scrollbars. */
  /* For mixed scrolling (Zoom In), we might need transform hacks handled in the style prop */
  direction: ${({ $side }) => ($side === 'left' ? 'rtl' : 'ltr')};

  /* Force GPU layer to fix scroll jitter in WebKit */
  transform: translateZ(0);

  /* Commercial Standard Scrollbars */
  &::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 6px;
    border: 3px solid #f1f1f1;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  /* Centering via margin is more stable than flex for complex scrolling */
  .canvas-container {
    margin: 0 auto !important;
    direction: ltr; /* Always keep canvas content LTR */
  }
`;

const CompactActionButton = styled.button<{ $primary?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $primary }) => ($primary ? '#333' : '#ffffff')};
  color: ${({ $primary }) => ($primary ? '#ffffff' : '#333')};
  border: 1px solid ${({ $primary }) => ($primary ? '#333' : '#ced4da')};
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background: ${({ $primary }) => ($primary ? '#000000' : '#f8f9fa')};
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const DashPreview = styled.div<{ $dash: number[] | null }>`
  width: 100%;
  height: 2px;
  background: transparent;
  border-top: 2px ${({ $dash }) => $dash ? 'dashed' : 'solid'} #333;
  ${({ $dash }) => $dash && `border-image: repeating-linear-gradient(to right, #333, #333 ${$dash[0]}px, transparent ${$dash[0]}px, transparent ${$dash[0] + $dash[1]}px) 1;`}
`;

const BrushSample = styled.div<{ $type: string; $color: string; $size?: number }>`
height: ${({ $size }) => $size ? Math.max(2, Math.min(24, $size)) : 12}px;
flex: 1;
margin-left: 12px;
border-radius: 2px;
position: relative;
background: ${({ $type, $color }) => {
        if ($type === 'pen') return $color;
        if ($type === 'laser') return $color; // Laser uses solid color
        if ($type === 'highlighter') {
            if ($color.startsWith('#')) {
                const r = parseInt($color.slice(1, 3), 16);
                const g = parseInt($color.slice(3, 5), 16);
                const b = parseInt($color.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, 0.3)`;
            }
            return $color.replace('rgb', 'rgba').replace(')', ', 0.3)');
        }
        if ($type === 'carbon') return `radial-gradient(${$color}, transparent)`;
        if ($type === 'hatch') return `repeating-linear-gradient(45deg, ${$color}, ${$color} 1px, transparent 1px, transparent 4px)`;
        return $color;
    }
    };

  ${({ $type, $color }) => $type === 'glow' && `
    box-shadow: 0 0 8px ${$color};
    border: 1px solid white;
  `}



  ${({ $type }) => $type === 'circle' && `
    background-size: 8px 8px;
  `}
`;

const DashOption = styled.button<{ $active: boolean }>`
width: 100%;
height: 24px;
padding: 4px 8px;
border: 1px solid ${({ $active }) => $active ? '#333' : '#e0e0e0'};
background: ${({ $active }) => $active ? '#f1f3f5' : 'white'};
border-radius: 4px;
cursor: pointer;
display: flex;
align-items: center;
  
  &:hover {
    background: #f8f9fa;
}
`;

const Backdrop = styled.div<{ $centered?: boolean }>`
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
background: rgba(0, 0, 0, 0.4);
z-index: 10000;
display: flex;
align-items: ${({ $centered = true }) => $centered ? 'center' : 'flex-start'};
justify-content: center;
`;

const CompactModal = styled.div<{ $anchor?: { top: number } }>`
background: white;
padding: 0.4rem;
border-radius: 8px;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
display: flex;
flex-direction: column;
gap: 0.35rem;
min-width: 65px;
box-sizing: border-box;
max-height: 80vh;
max-width: 95vw;
overflow-y: auto;
overflow-x: auto; /* Enable horizontal scroll for very narrow screens */

  ${({ $anchor }) => $anchor && `
    position: fixed;
    top: ${$anchor.top}px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10001;
  `}

  @media (max-width: 480px) {
    width: 95vw;
    margin: 0 auto;
    /* Do not override transform here as it breaks non-anchored centered modals */
    ${({ $anchor }) => $anchor && `
      left: 50% !important;
      transform: translateX(-50%) !important;
    `}
  }
`;

const CompactModalFooter = styled.div`
display: flex;
justify-content: space-between;
gap: 0.5rem;
margin-top: 0.25rem;
`;

const CompactModalButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
padding: 0.25rem 0.5rem;
border-radius: 4px;
font-size: 0.8rem;
font-weight: 600;
cursor: pointer;
border: 1px solid #dee2e6;
background: ${({ $variant }) => $variant === 'primary' ? '#333' : 'white'};
color: ${({ $variant }) => $variant === 'primary' ? 'white' : '#495057'};

  &:hover {
    background: ${({ $variant }) => $variant === 'primary' ? '#222' : '#f8f9fa'};
}
`;

const ColorInputWrapper = styled.div`
display: flex;
flex-direction: column;
align-items: center;
gap: 0.5rem;
`;

const CustomRangeInput = styled.input<{ $size: number; $opacityValue?: number; $thumbColor?: string }>`
  appearance: none;
  width: 100%;
  margin: 0.2rem 0;
  cursor: pointer;
  background: transparent;

  &::-webkit-slider-runnable-track {
    width: 100%;
    height: ${({ $size }) => Math.min($size, 100)}px;
    background: ${({ $opacityValue }) => $opacityValue !== undefined ? 'linear-gradient(to right, #eee, #333)' : '#dee2e6'};
    border-radius: ${({ $size }) => Math.min($size, 100) / 2}px;
  }

  &::-webkit-slider-thumb {
    appearance: none;
    height: ${({ $size }) => Math.max(Math.min($size, 100) + 10, 24)}px;
    width: ${({ $size }) => Math.max(Math.min($size, 100) + 10, 24)}px;
    border-radius: 50%;
    background: ${({ $thumbColor }) => $thumbColor || '#333'};
    opacity: ${({ $opacityValue, $thumbColor }) => ($opacityValue !== undefined && !$thumbColor) ? Math.max($opacityValue / 100, 0.1) : 1};
    cursor: pointer;
    margin-top: ${({ $size }) => (Math.min($size, 100) / 2) - (Math.max(Math.min($size, 100) + 10, 24) / 2)}px;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  &::-moz-range-track {
    width: 100%;
    height: ${({ $size }) => Math.min($size, 100)}px;
    background: ${({ $opacityValue }) => $opacityValue !== undefined ? 'linear-gradient(to right, #eee, #333)' : '#dee2e6'};
    border-radius: ${({ $size }) => Math.min($size, 100) / 2}px;
  }

  &::-moz-range-thumb {
    height: ${({ $size }) => Math.max(Math.min($size, 100) + 10, 24)}px;
    width: ${({ $size }) => Math.max(Math.min($size, 100) + 10, 24)}px;
    border-radius: 50%;
    background: ${({ $thumbColor }) => $thumbColor || '#333'};
    opacity: ${({ $opacityValue, $thumbColor }) => ($opacityValue !== undefined && !$thumbColor) ? Math.max($opacityValue / 100, 0.1) : 1};
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 480px) {
    &::-webkit-slider-thumb {
      height: 40px !important;
      width: 40px !important;
      margin-top: ${({ $size }) => (Math.min($size, 100) / 2) - 20}px !important;
    }
    &::-moz-range-thumb {
      height: 40px !important;
      width: 40px !important;
    }
  }

  &:focus {
    outline: none;
}
`;

const CustomNumberInput = styled.input`
width: 60px;
padding: 0.2rem;
border: 1px solid #ced4da;
border-radius: 4px;
font-size: 0.9rem;
text-align: center;
outline: none;

  &:focus {
    border-color: #333;
}

  @media (max-width: 480px) {
    width: 80px;
    height: 40px;
    font-size: 1.1rem;
  }
`;

interface FabricCanvasModalProps {
    initialData?: string;
    onSave: (data: string) => void;
    onAutosave?: (data: string) => void;
    onClose: () => void;
    language?: string;
}

const INITIAL_PALETTES: string[][] = [
    ['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#F9DE4B'], // 1. Default
    ['#000000', '#0000FF', '#FF0000', '#008000', '#808080', '#FFA500'], // 2. Classic Office
    ['#5d5d5d', '#ff9aa2', '#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7'], // 3. Soft/Pastel
    ['#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6', '#ee9b00'], // 4. Deep Marine
    ['#370617', '#9d0208', '#d00000', '#dc2f02', '#e85d04', '#f48c06'], // 5. Sunset
    ['#004b23', '#007200', '#008000', '#38b000', '#70e000', '#9ef01a'], // 6. Forest
    ['#240046', '#5a189a', '#9d4edd', '#ff006e', '#fb5607', '#ffbe0b'], // 7. Lavender/Violet
    ['#230f0d', '#3d1b19', '#5e2c28', '#893f39', '#b1584d', '#d28476'], // 8. Coffee/Brown
    ['#000000', '#212529', '#343a40', '#495057', '#6c757d', '#adb5bd'], // 9. Monochrome
    ['#ccff00', '#ffcf00', '#ff0099', '#6e00ff', '#00eaff', '#00ff00'], // 10. Highlighter Tint
];
const INITIAL_BRUSH_SIZES = [1, 2, 4, 8, 16];
const DASH_OPTIONS: (number[] | undefined)[] = [
    undefined,
    [5, 5],
    [10, 5],
    [2, 2],
    [15, 5, 5, 5],
    [20, 10],
    [5, 10]
];
const ENGLISH_FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Impact', 'Comic Sans MS'];
const KOREAN_FONTS = ['Noto Sans KR', 'Nanum Gothic', 'Nanum Myeongjo', 'Malgun Gothic', 'Apple SD Gothic Neo'];
const INITIAL_SHAPE_OPACITY = 100;
const INITIAL_SHAPE_DASH = 0; // Index in DASH_OPTIONS

type ShapeStyle = {
    dashArray: number[] | undefined;
    opacity: number;
    headSize?: number;
    stroke?: string;
    strokeWidth?: number;
};

const DEFAULT_SHAPE_STYLE: ShapeStyle = {
    dashArray: DASH_OPTIONS[INITIAL_SHAPE_DASH],
    opacity: INITIAL_SHAPE_OPACITY,
    headSize: 20,
    stroke: '#000000',
    strokeWidth: 2
};

// Helper to get icon for config item
const getToolbarItemIcon = (item: ToolbarItem, colors: string[], brushSizes: number[]) => {
    if (item.type === 'tool') {
        switch (item.toolId) {
            case 'select': return <FiMousePointer size={16} />;
            case 'pen': return <PenIcon />;
            case 'line': return <FiMinus size={16} style={{ transform: 'rotate(-45deg)' }} />;
            case 'arrow': return <FiArrowDown size={16} style={{ transform: 'rotate(-135deg)' }} />;
            case 'rect': return <FiSquare size={16} />;
            case 'circle': return <FiCircle size={16} />;
            case 'ellipse': return <EllipseIcon />;
            case 'triangle': return <FiTriangle size={16} />;
            case 'diamond': return <DiamondIcon />;
            case 'pentagon': return <PentagonIcon />;
            case 'hexagon': return <HexagonIcon />;
            case 'octagon': return <OctagonIcon />;
            case 'star': return <StarIcon />;
            case 'text': return <FiType size={16} />;
            case 'eraser_pixel': return <PixelEraserIcon />;
            case 'eraser_object': return <ObjectEraserIcon />;
            case 'laser': return <LaserIcon />;
            default: return <span>{item.toolId}</span>;
        }
    } else if (item.type === 'action') {
        switch (item.actionId) {
            case 'undo': return <FiRotateCcw size={16} />;
            case 'redo': return <FiRotateCw size={16} />;
            case 'download_png': return <FiDownload size={16} />;
            case 'clear': return <FiTrash2 size={16} />;
            case 'extend_height': return <VerticalExpandIcon />;
            case 'background': return <BackgroundIcon />;
            case 'palette': return <PaletteIcon />;
            case 'fullscreen': return <FiMaximize size={16} />;
            default: return <span>{item.actionId}</span>;
        }
    } else if (item.type === 'color' && item.colorIndex !== undefined) {
        return (
            <ColorButton $color={colors[item.colorIndex] || '#000'} style={{ width: 14, height: 14, cursor: 'grab' }} />
        );
    } else if (item.type === 'size' && item.sizeIndex !== undefined) {
        const size = brushSizes[item.sizeIndex] || 2;
        return (
            <div style={{
                width: Math.min(size, 20),
                height: Math.min(size, 20),
                borderRadius: '50%',
                background: '#333'
            }} />
        );
    }
    return <span>?</span>;
};

type ToolbarItem = {
    id: string;
    type: 'tool' | 'action' | 'color' | 'size';
    toolId?: ToolType;
    actionId?: string;
    colorIndex?: number;
    sizeIndex?: number;
};

const INITIAL_TOOLBAR_ITEMS: ToolbarItem[] = [
    { id: 'select', type: 'tool', toolId: 'select' },
    { id: 'pen_1', type: 'tool', toolId: 'pen' },
    { id: 'pen_2', type: 'tool', toolId: 'pen' },
    { id: 'pen_3', type: 'tool', toolId: 'pen' },
    { id: 'pen_4', type: 'tool', toolId: 'pen' },
    { id: 'line', type: 'tool', toolId: 'line' },
    { id: 'arrow_v2', type: 'tool', toolId: 'arrow' },
    { id: 'rect', type: 'tool', toolId: 'rect' },
    { id: 'ellipse', type: 'tool', toolId: 'ellipse' },
    { id: 'triangle', type: 'tool', toolId: 'triangle' },
    { id: 'text', type: 'tool', toolId: 'text' },
    { id: 'eraser_pixel', type: 'tool', toolId: 'eraser_pixel' },
    { id: 'eraser_object', type: 'tool', toolId: 'eraser_object' },
    { id: 'undo', type: 'action', actionId: 'undo' },
    { id: 'redo', type: 'action', actionId: 'redo' },
    { id: 'download_png', type: 'action', actionId: 'download_png' },
    { id: 'clear', type: 'action', actionId: 'clear' },
    { id: 'background', type: 'action', actionId: 'background' },
    { id: 'color-0', type: 'color', colorIndex: 0 },
    { id: 'color-1', type: 'color', colorIndex: 1 },
    { id: 'color-2', type: 'color', colorIndex: 2 },
    { id: 'color-3', type: 'color', colorIndex: 3 },
    { id: 'color-4', type: 'color', colorIndex: 4 },
    { id: 'color-5', type: 'color', colorIndex: 5 },
    { id: 'palette', type: 'action', actionId: 'palette' },
    { id: 'size-0', type: 'size', sizeIndex: 0 },
    { id: 'size-1', type: 'size', sizeIndex: 1 },
    { id: 'size-2', type: 'size', sizeIndex: 2 },
    { id: 'size-3', type: 'size', sizeIndex: 3 },
    { id: 'size-4', type: 'size', sizeIndex: 4 },
];

type ToolType = 'select' | 'pen' | 'eraser_pixel' | 'eraser_object' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'triangle' | 'ellipse' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'laser';

const BackgroundOptionButton = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => $active ? '#e9ecef' : 'transparent'};
  border: 1px solid ${({ $active }) => $active ? '#adb5bd' : '#dee2e6'};
  color: ${({ $active }) => $active ? '#212529' : '#495057'};
  border-radius: 4px;
  padding: 6px 4px;
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f8f9fa;
  }

  @media (max-width: 480px) {
    padding: 12px 8px;
    font-size: 0.85rem;
    min-height: 44px;
  }
`;


const ConfigItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 4px;
  cursor: grab;
  color: #333;
  background: transparent;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const SettingsOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 12000;
`;

const SettingsContainer = styled.div`
    width: 90vw;
    max-width: 600px;
    max-height: 96vh;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    pointer-events: auto;
`;

const ConfigArea = styled.div<{ $isDraggingOver: boolean }>`
background: ${({ $isDraggingOver }) => $isDraggingOver ? '#f1f3f5' : '#f8f9fa'};
border: 2px dashed #dee2e6;
border-radius: 8px;
padding: 12px;
min-height: 80px;
display: flex;
flex-wrap: wrap;
align-content: flex-start;
gap: 4px;
transition: background - color 0.2s;
`;

interface ToolbarConfiguratorProps {
    currentItems: ToolbarItem[];
    allItems: ToolbarItem[];
    colors: string[];
    brushSizes: number[];
    scrollbarSide: 'left' | 'right';
    onScrollbarSideChange: (side: 'left' | 'right') => void;
    maxPages: number;
    onMaxPagesChange: (val: number) => void;
    defaultZoomLocked: boolean;
    onDefaultZoomLockedChange: (val: boolean) => void;
    onSaveItems: (items: ToolbarItem[]) => void;
    onClose: () => void;
    language: Language;
    t: TranslationKeys;
}

const ToolbarConfigurator: React.FC<ToolbarConfiguratorProps> = ({
    currentItems, allItems, onSaveItems, onClose, colors, brushSizes,
    scrollbarSide, onScrollbarSideChange, maxPages, onMaxPagesChange,
    defaultZoomLocked, onDefaultZoomLockedChange,
    language, t
}) => {
    // Section 1: Scrollbar
    const [tempScrollbarSide, setTempScrollbarSide] = useState(scrollbarSide);

    // Section 2: Toolbar
    const [tempActiveItems, setTempActiveItems] = useState<ToolbarItem[]>(currentItems);
    const [tempReservoirItems, setTempReservoirItems] = useState<ToolbarItem[]>(() => {
        return allItems.filter(item => !currentItems.some(curr => curr.id === item.id));
    });

    // Section 3: Max Pages
    const [tempMaxPages, setTempMaxPages] = useState(maxPages);

    // Section 4: Default Zoom Lock
    const [tempDefaultZoomLocked, setTempDefaultZoomLocked] = useState(defaultZoomLocked);

    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

    const handleCancelClick = () => {
        const hasChanges =
            JSON.stringify(tempActiveItems) !== JSON.stringify(currentItems) ||
            tempScrollbarSide !== scrollbarSide ||
            tempMaxPages !== maxPages ||
            tempDefaultZoomLocked !== defaultZoomLocked;

        if (hasChanges) {
            setIsCancelConfirmOpen(true);
        } else {
            onClose();
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) {
            const list = source.droppableId === 'active' ? tempActiveItems : tempReservoirItems;
            const setList = source.droppableId === 'active' ? setTempActiveItems : setTempReservoirItems;
            const newList = Array.from(list);
            const [removed] = newList.splice(source.index, 1);
            newList.splice(destination.index, 0, removed);
            setList(newList);
        } else {
            const sourceList = source.droppableId === 'active' ? tempActiveItems : tempReservoirItems;
            const destList = destination.droppableId === 'active' ? tempActiveItems : tempReservoirItems;
            const setSource = source.droppableId === 'active' ? setTempActiveItems : setTempReservoirItems;
            const setDest = destination.droppableId === 'active' ? setTempActiveItems : setTempReservoirItems;
            const newSource = Array.from(sourceList);
            const newDest = Array.from(destList);
            const [removed] = newSource.splice(source.index, 1);
            newDest.splice(destination.index, 0, removed);
            setSource(newSource);
            setDest(newDest);
        }
    };

    return (
        <SettingsOverlay onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelClick();
        }}>
            <SettingsContainer onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{t.drawing?.customize_title || 'Settings'}</h3>
                        <CompactModalButton onClick={handleCancelClick} style={{ borderRadius: '8px', padding: '6px 12px' }}>{t.drawing?.close || 'Close'}</CompactModalButton>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px', paddingRight: '8px' }}>
                        {/* Section 1: Toolbar Layout */}
                        <section style={{ paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t.drawing?.active_toolbar || 'Toolbar Layout'}
                                </h4>
                            </div>

                            <DragDropContext onDragEnd={onDragEnd}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <Droppable droppableId="active" direction="horizontal">
                                            {(provided, snapshot) => (
                                                <ConfigArea
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    $isDraggingOver={snapshot.isDraggingOver}
                                                    style={{
                                                        minHeight: '72px',
                                                        flexWrap: 'nowrap',
                                                        overflowX: 'auto',
                                                        alignItems: 'center',
                                                        padding: '12px',
                                                        background: snapshot.isDraggingOver ? '#f3f4f6' : '#f9fafb',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '12px'
                                                    }}
                                                >
                                                    {tempActiveItems.map((item, index) => {
                                                        // @ts-ignore
                                                        return (
                                                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                                                {(provided) => (
                                                                    <ConfigItem
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                    >
                                                                        {getToolbarItemIcon(item, colors, brushSizes)}
                                                                    </ConfigItem>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </ConfigArea>
                                            )}
                                        </Droppable>
                                    </div>

                                    <div>
                                        <h5 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
                                            {t.drawing?.available_tools || 'Available'}
                                        </h5>
                                        <Droppable droppableId="reservoir">
                                            {(provided, snapshot) => (
                                                <ConfigArea
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    $isDraggingOver={snapshot.isDraggingOver}
                                                    style={{
                                                        minHeight: '80px',
                                                        alignContent: 'flex-start',
                                                        background: snapshot.isDraggingOver ? '#f3f4f6' : '#ffffff',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '12px',
                                                        padding: '12px'
                                                    }}
                                                >
                                                    {tempReservoirItems.map((item, index) => {
                                                        // @ts-ignore
                                                        return (
                                                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                                                {(provided) => (
                                                                    <ConfigItem
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        style={{
                                                                            ...provided.draggableProps.style,
                                                                            background: 'transparent'
                                                                        }}
                                                                    >
                                                                        {getToolbarItemIcon(item, colors, brushSizes)}
                                                                    </ConfigItem>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </ConfigArea>
                                            )}
                                        </Droppable>
                                    </div>
                                </div>
                            </DragDropContext>

                            {/* Section Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                                <span
                                    onClick={() => {
                                        setTempActiveItems(allItems);
                                        setTempReservoirItems([]);
                                    }}
                                    style={{ marginRight: 'auto', fontSize: '0.7rem', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {t.drawing?.reset_each}
                                </span>
                                <CompactModalButton
                                    onClick={handleCancelClick}
                                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                >
                                    {t.drawing?.cancel}
                                </CompactModalButton>
                                <CompactModalButton
                                    $variant="primary"
                                    onClick={() => {
                                        onSaveItems(tempActiveItems);
                                        onClose();
                                    }}
                                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                >
                                    {t.drawing?.save_apply}
                                </CompactModalButton>
                            </div>
                        </section>

                        {/* Section 2: Default Zoom Lock */}
                        <section style={{ paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t.drawing?.default_zoom_locked || 'Default Zoom Lock'}
                            </h4>
                            <div
                                onClick={() => setTempDefaultZoomLocked(!tempDefaultZoomLocked)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: `2px solid ${tempDefaultZoomLocked ? '#111827' : '#e5e7eb'}`,
                                    background: tempDefaultZoomLocked ? '#f3f4f6' : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    border: '2px solid #111827',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: tempDefaultZoomLocked ? '#111827' : 'transparent'
                                }}>
                                    {tempDefaultZoomLocked && <FiCheck size={14} color="white" />}
                                </div>
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: tempDefaultZoomLocked ? 600 : 500,
                                    color: tempDefaultZoomLocked ? '#111827' : '#4b5563'
                                }}>
                                    {tempDefaultZoomLocked ? t.drawing?.zoom_lock : t.drawing?.zoom_unlock}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                                <span
                                    onClick={() => setTempDefaultZoomLocked(false)}
                                    style={{ marginRight: 'auto', fontSize: '0.7rem', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {t.drawing?.reset_each}
                                </span>
                                <CompactModalButton onClick={handleCancelClick} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                    {t.drawing?.cancel}
                                </CompactModalButton>
                                <CompactModalButton
                                    $variant="primary"
                                    onClick={() => {
                                        onDefaultZoomLockedChange(tempDefaultZoomLocked);
                                        onClose();
                                    }}
                                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                >
                                    {t.drawing?.save_apply}
                                </CompactModalButton>
                            </div>
                        </section>

                        {/* Section 3: Scrollbar Side Selection */}
                        <section style={{ paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t.drawing?.scrollbar_side || 'Scrollbar Position'}
                            </h4>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div
                                    onClick={() => setTempScrollbarSide('left')}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: `2px solid ${tempScrollbarSide === 'left' ? '#111827' : '#e5e7eb'}`,
                                        background: tempScrollbarSide === 'left' ? '#f3f4f6' : '#ffffff',
                                        color: tempScrollbarSide === 'left' ? '#111827' : '#9ca3af',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        fontWeight: tempScrollbarSide === 'left' ? 600 : 500,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {t.drawing?.scrollbar_left || 'Left (Default)'}
                                </div>
                                <div
                                    onClick={() => setTempScrollbarSide('right')}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: `2px solid ${tempScrollbarSide === 'right' ? '#111827' : '#e5e7eb'}`,
                                        background: tempScrollbarSide === 'right' ? '#f3f4f6' : '#ffffff',
                                        color: tempScrollbarSide === 'right' ? '#111827' : '#9ca3af',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        fontWeight: tempScrollbarSide === 'right' ? 600 : 500,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {t.drawing?.scrollbar_right || 'Right'}
                                </div>
                            </div>
                            {/* Section Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                                <span
                                    onClick={() => setTempScrollbarSide('left')}
                                    style={{ marginRight: 'auto', fontSize: '0.7rem', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {t.drawing?.reset_each}
                                </span>
                                <CompactModalButton onClick={handleCancelClick} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                    {t.drawing?.cancel}
                                </CompactModalButton>
                                <CompactModalButton
                                    $variant="primary"
                                    onClick={() => {
                                        onScrollbarSideChange(tempScrollbarSide);
                                        onClose();
                                    }}
                                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                >
                                    {t.drawing?.save_apply}
                                </CompactModalButton>
                            </div>
                        </section>

                        {/* Section 4: Max Page Limit (Latest / Absolute bottom) */}
                        <section style={{ paddingBottom: '8px' }}>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t.drawing?.max_pages}
                            </h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.4' }}>
                                {t.drawing?.max_pages_desc}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={tempMaxPages}
                                    onChange={(e) => setTempMaxPages(Math.max(1, parseInt(e.target.value) || 1))}
                                    style={{
                                        width: '80px',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        color: '#111827',
                                        textAlign: 'center'
                                    }}
                                />
                                <div style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: 500 }}>
                                    {language === 'ko' ? '페이지' : 'Pages'}
                                </div>
                            </div>

                            {tempMaxPages > 5 && (
                                <div style={{
                                    padding: '10px',
                                    background: '#fff9db',
                                    border: '1px solid #ffe066',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    lineHeight: '1.5',
                                    color: '#862e08',
                                    marginBottom: '16px'
                                }}>
                                    {t.drawing?.max_pages_warning}
                                </div>
                            )}

                            {/* Section Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                                <span
                                    onClick={() => setTempMaxPages(5)}
                                    style={{ marginRight: 'auto', fontSize: '0.7rem', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {t.drawing?.reset_each}
                                </span>
                                <CompactModalButton onClick={handleCancelClick} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                    {t.drawing?.cancel}
                                </CompactModalButton>
                                <CompactModalButton
                                    $variant="primary"
                                    onClick={() => {
                                        onMaxPagesChange(tempMaxPages);
                                        onClose();
                                    }}
                                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                >
                                    {t.drawing?.save_apply}
                                </CompactModalButton>
                            </div>
                        </section>
                    </div>
                </div >

                {isCancelConfirmOpen && (
                    <SettingsOverlay style={{ zIndex: 13000, background: 'rgba(0,0,0,0.3)' }}>
                        <CompactModal onClick={e => e.stopPropagation()} style={{ padding: '20px', width: '90vw', maxWidth: '400px', maxHeight: '80vh' }}>
                            <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#111827' }}>
                                {t.drawing.exit_title}
                            </h3>
                            <p style={{ color: '#4b5563', lineHeight: '1.5', margin: '10px 0 20px 0', fontSize: '0.9rem' }}>
                                {t.drawing.cancel_confirm}
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <CompactModalButton onClick={() => setIsCancelConfirmOpen(false)}>
                                    {t.drawing.exit_cancel}
                                </CompactModalButton>
                                <CompactModalButton
                                    $variant="primary"
                                    onClick={onClose}
                                    style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                >
                                    {t.drawing.discard}
                                </CompactModalButton>
                            </div>
                        </CompactModal>
                    </SettingsOverlay>
                )}
            </SettingsContainer >
        </SettingsOverlay >
    );
};

export const FabricCanvasModal: React.FC<FabricCanvasModalProps> = ({ initialData, onSave, onAutosave, onClose: propsOnClose, language = 'en' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const persistentBackgroundPatternRef = useRef<fabric.Pattern | null>(null);
    const viewportHeightRef = useRef<number>(0);
    const canvasViewportRef = useRef<HTMLDivElement>(null);
    const t = React.useMemo(() => {
        const normalizedLang = (language || 'en').toLowerCase().split('-')[0];
        const selected = (translations as any)[normalizedLang];
        // Fallback to English if translation not found
        return (selected || translations.en) as TranslationKeys;
    }, [language]);

    // Guard State
    const { registerGuard, unregisterGuard } = useExitGuard();
    const isClosingRef = useRef(false);
    const isSavingRef = useRef(false);
    const mountTimeRef = useRef(Date.now());
    const handleActualClose = useRef(propsOnClose);
    const lastAddedObjectRef = useRef<fabric.Object | null>(null);
    const lastAddedObjectTimeRef = useRef(0);
    const touchEraserCursorRef = useRef<SVGSVGElement | null>(null);
    // --- Barrel Button Eraser ---
    // Tracks which eraser was last actively used (via toolbar selection), defaults to pixel eraser
    const lastUsedEraserRef = useRef<'eraser_pixel' | 'eraser_object'>('eraser_pixel');
    // True while the stylus barrel button is held down and we're in temporary eraser mode
    const barrelButtonErasingRef = useRef(false);
    // Stores the brush/canvas state before barrel-button eraser activation so we can restore it
    const savedBrushStateRef = useRef<{
        brush: fabric.BaseBrush | null;
        isDrawingMode: boolean;
        freeDrawingCursor: string;
        defaultCursor: string;
        hoverCursor: string;
        overlayCursor: string;
        upperCanvasOpacity: string;
    } | null>(null);
    handleActualClose.current = propsOnClose;

    const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isPaletteResetConfirmOpen, setIsPaletteResetConfirmOpen] = useState(false);
    const [paletteResetIndex, setPaletteResetIndex] = useState<number | null>(null);
    const [savedToastVisible, setSavedToastVisible] = useState(false);

    // Wrapper for onClose to handle history safe closing
    const onClose = () => {
        isClosingRef.current = true;

        if (window.history.state?.fabricOpen) {
            // We have a specific history state for this modal, pop it.
            // The registered guard will catch this and call propsOnClose().
            window.history.back();
        } else {
            // No history state (or already popped), close immediately.
            propsOnClose();
        }
    };

    useEffect(() => {
        // Push state to enable back button trapping, include isGuard to keep handler happy
        window.history.pushState({ fabricOpen: true, isGuard: true }, '');

        const guardId = 'fabric-canvas-guard-modal';

        // Delay guard registration to avoid capturing pre-existing popstate events (e.g. from closing sidebar)
        // This prevents the "Exit?" warning from showing up immediately when opening from mobile sidebar
        // Delay guard registration slightly
        const timer = setTimeout(() => {
            registerGuard(guardId, () => {
                if (isClosingRef.current) {
                    handleActualClose.current();
                    return 'ALLOW' as any;
                }

                // Initial grace period check
                // On mobile, closing the sidebar often triggers a history.back() (popstate).
                // If this happens after we mount, it pops our 'fabricOpen' state.
                // We want to restore the history state (PREVENT) but NOT show the warning dialog
                // because this is an automated/structural interaction, not user intent to exit.
                if (Date.now() - mountTimeRef.current < 1500) {
                    return 'PREVENT' as any;
                }

                // User initiated back navigation (hardware back button)
                if (historyIndexRef.current === lastSavedIndexRef.current) {
                    isClosingRef.current = true;
                    handleActualClose.current();
                    return 'ALLOW' as any;
                }

                setIsExitConfirmOpen(true);
                return 'PREVENT' as any;
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            unregisterGuard(guardId);
        };
    }, [registerGuard, unregisterGuard]);


    const [palettes, setPalettes] = useState<string[][]>(() => {
        const saved = localStorage.getItem('fabric_palettes');
        return saved ? JSON.parse(saved) : INITIAL_PALETTES;
    });
    const [activePaletteIndex, setActivePaletteIndex] = useState<number>(() => {
        const saved = localStorage.getItem('fabric_active_palette_index');
        return saved ? parseInt(saved) : 0;
    });

    const [availableColors, setAvailableColors] = useState<string[]>(() => {
        const savedColors = localStorage.getItem('fabric_colors');
        if (savedColors) return JSON.parse(savedColors);
        return palettes[activePaletteIndex] || INITIAL_PALETTES[0];
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        localStorage.setItem('fabric_palettes', JSON.stringify(palettes));
    }, [palettes]);

    useEffect(() => {
        localStorage.setItem('fabric_active_palette_index', activePaletteIndex.toString());
        // Sync current colors when palette changes
        const newColors = palettes[activePaletteIndex];
        setAvailableColors(newColors);
    }, [activePaletteIndex, palettes]);

    const [isPalettePickerOpen, setIsPalettePickerOpen] = useState(false);
    const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(activePaletteIndex);
    const [editingPaletteIndex, setEditingPaletteIndex] = useState<number | null>(null);
    const [paletteTempColors, setPaletteTempColors] = useState<string[]>([]);
    const [paletteEditingColorIndex, setPaletteEditingColorIndex] = useState<number | null>(null);
    const [availableBrushSizes, setAvailableBrushSizes] = useState<number[]>(() => {
        const saved = localStorage.getItem('fabric_brush_sizes');
        return saved ? JSON.parse(saved) : INITIAL_BRUSH_SIZES;
    });
    const [toolbarItems, setToolbarItems] = useState<ToolbarItem[]>(() => {
        const saved = localStorage.getItem('fabric_toolbar_order');
        if (!saved) return INITIAL_TOOLBAR_ITEMS;

        let parsed: ToolbarItem[] = JSON.parse(saved);

        // Filter out any items that are no longer in INITIAL_TOOLBAR_ITEMS (migration)
        parsed = parsed.filter(p => INITIAL_TOOLBAR_ITEMS.some(i => i.id === p.id));

        // Check if all tools from INITIAL_TOOLBAR_ITEMS are present
        const missingItems = INITIAL_TOOLBAR_ITEMS.filter(initialItem =>
            !parsed.some(parsedItem => parsedItem.id === initialItem.id)
        );

        if (missingItems.length > 0) {
            // Insert missing items at their intended position
            const newItems = [...parsed];
            missingItems.forEach(item => {
                const intendedIndex = INITIAL_TOOLBAR_ITEMS.findIndex(i => i.id === item.id);
                newItems.splice(intendedIndex, 0, item);
            });
            return newItems;
        }
        return parsed;
    });
    const [activeTool, setActiveTool] = useState<ToolType>('pen');
    const [activeToolItemId, setActiveToolItemId] = useState<string | null>('pen_1');
    const activeToolRef = useRef(activeTool);
    useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(2);
    const savedBg = JSON.parse(localStorage.getItem('fabric_default_background_v2') || '{}');
    const [background, setBackground] = useState<BackgroundType>(savedBg.type || 'none');
    const backgroundRef = useRef(background);
    useEffect(() => { backgroundRef.current = background; }, [background]);
    const [backgroundSize, setBackgroundSize] = useState(savedBg.size || 30);
    const backgroundSizeRef = useRef(backgroundSize);
    useEffect(() => { backgroundSizeRef.current = backgroundSize; }, [backgroundSize]);

    const pageWidthRef = useRef(0);
    const pageHeightRef = useRef(0);
    const pageRectRef = useRef<fabric.Rect | null>(null);
    const [backgroundBundleGap, setBackgroundBundleGap] = useState(savedBg.bundleGap || 1);
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [backgroundColorIntensity, setBackgroundColorIntensity] = useState(savedBg.intensity !== undefined ? savedBg.intensity : 0);
    const [backgroundColorType, setBackgroundColorType] = useState<BackgroundColorType>(savedBg.colorType || 'gray');
    const [lineOpacity, setLineOpacity] = useState(savedBg.opacity !== undefined ? savedBg.opacity : 0.1);
    const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(() => {
        if (savedBg.type === 'image' && savedBg.imageData) {
            const img = new Image();
            img.src = savedBg.imageData;
            return img;
        }
        return null;
    });
    const [backgroundImageOpacity, setBackgroundImageOpacity] = useState(savedBg.imageOpacity !== undefined ? savedBg.imageOpacity : 1.0);
    const bgFileInputRef = useRef<HTMLInputElement>(null);
    const domCursorRef = useRef<HTMLDivElement | null>(null);

    const prevBackgroundStateRef = useRef<{ type: BackgroundType; color: string; opacity: number; size: number; intensity: number; colorType: 'gray' | 'beige' | 'blue'; bundleGap: number; image?: HTMLImageElement | HTMLCanvasElement; imageOpacity: number } | null>(null);

    // Detached Scrollbar Refs
    const verticalScrollRef = useRef<HTMLDivElement>(null);
    const horizontalScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingScrollRef = useRef(false);


    const [isSizeEditOpen, setIsSizeEditOpen] = useState(false);
    const [tempSize, setTempSize] = useState(2);
    const [editingSizeIndex, setEditingSizeIndex] = useState<number | null>(null);

    const [penSlotSettings, setPenSlotSettings] = useState<Record<string, { brushType: string, color: string, size: number }>>(() => {
        const saved = localStorage.getItem('fabric_pen_slot_settings');
        return saved ? JSON.parse(saved) : {
            'pen_1': { brushType: 'pen', color: '#000000', size: 2 },
            'pen_2': { brushType: 'carbon', color: '#555555', size: 2 },
            'pen_3': { brushType: 'highlighter', color: '#ffeb3b', size: 10 },
            'pen_4': { brushType: 'laser', color: '#ff0000', size: 4 }
        };
    });
    const [activePenSlot, setActivePenSlot] = useState<string>('pen_1');

    // Save pen slot settings whenever they change
    useEffect(() => {
        localStorage.setItem('fabric_pen_slot_settings', JSON.stringify(penSlotSettings));
    }, [penSlotSettings]);

    const [shapeStyles, setShapeStyles] = useState<Record<string, ShapeStyle>>(() => {
        const saved = localStorage.getItem('fabric_shape_styles');
        return saved ? JSON.parse(saved) : {};
    });
    const [isShapeSettingsOpen, setIsShapeSettingsOpen] = useState(false);
    const [tempDashIndex, setTempDashIndex] = useState(0);
    const [tempShapeOpacity, setTempShapeOpacity] = useState(100);
    const [tempHeadSize, setTempHeadSize] = useState(20);
    const [editingShapeItemId, setEditingShapeItemId] = useState<string | null>(null);

    const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('fabric_font_family') || 'Arial');
    const [fontWeight, setFontWeight] = useState<string | number>(() => {
        const s = localStorage.getItem('fabric_font_weight');
        return (s && !isNaN(Number(s))) ? Number(s) : (s || 'normal');
    });
    const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>(() => (localStorage.getItem('fabric_font_style') as any) || 'normal');

    const [isFontEditOpen, setIsFontEditOpen] = useState(false);
    const [tempFontFamily, setTempFontFamily] = useState(fontFamily);
    const [tempFontWeight, setTempFontWeight] = useState(fontWeight);
    const [tempFontStyle, setTempFontStyle] = useState(fontStyle);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [isZoomLocked, setIsZoomLocked] = useState(() => {
        const saved = localStorage.getItem('fabric_default_zoom_locked');
        if (saved !== null) {
            return saved === 'true';
        }
        // If no saved preference, default to locked for all platforms
        return true;
    });
    const isZoomLockedRef = useRef(isZoomLocked);
    useEffect(() => { isZoomLockedRef.current = isZoomLocked; }, [isZoomLocked]);

    const [canvasScale, setCanvasScale] = useState(1);
    const [pageWidthState, setPageWidthState] = useState(window.innerWidth || 800);
    const [pageHeightState, setPageHeightState] = useState(window.innerHeight || 600);
    const [pdfDocToSelect, setPdfDocToSelect] = useState<any>(null);


    const processImage = React.useCallback((srcOrCanvas: string | HTMLCanvasElement) => {
        const onLoad = (imgElement: HTMLImageElement | HTMLCanvasElement) => {
            const originalWidth = imgElement instanceof HTMLImageElement ? imgElement.width : imgElement.width;
            const originalHeight = imgElement instanceof HTMLImageElement ? imgElement.height : imgElement.height;

            const viewportWidth = pageWidthRef.current || window.innerWidth || 800;
            const viewportHeight = pageHeightRef.current || window.innerHeight || 600;

            const ABSOLUTE_MAX = 4096;
            const VIEWPORT_MULTIPLIER = 2.5;

            const adaptiveMaxWidth = Math.min(ABSOLUTE_MAX, Math.round(viewportWidth * VIEWPORT_MULTIPLIER));
            const adaptiveMaxHeight = Math.min(ABSOLUTE_MAX, Math.round(viewportHeight * VIEWPORT_MULTIPLIER));

            let width = originalWidth;
            let height = originalHeight;
            let wasResized = false;

            if (width > adaptiveMaxWidth || height > adaptiveMaxHeight) {
                wasResized = true;
                if (width > height) {
                    height = Math.round((height * adaptiveMaxWidth) / width);
                    width = adaptiveMaxWidth;
                } else {
                    width = Math.round((width * adaptiveMaxHeight) / height);
                    height = adaptiveMaxHeight;
                }
            }

            // Create intermediate canvas only if we need to resize or if it's not already a canvas
            let finalSource: HTMLImageElement | HTMLCanvasElement = imgElement;

            if (wasResized || imgElement instanceof HTMLImageElement) {
                const offscreen = document.createElement('canvas');
                offscreen.width = width;
                offscreen.height = height;
                const ctx = offscreen.getContext('2d', { alpha: false });
                if (ctx) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(imgElement, 0, 0, width, height);

                    // We need it as an Image object for Fabric pattern persistence if we want to save
                    // but for "immediate linear quality", we keep the canvas reference for patterns
                    finalSource = offscreen;
                }
            }

            // For background persistence across sessions, we still want a static image object
            // but we use 100% quality PNG data URL only for the persistence layer
            const dataUrl = (finalSource instanceof HTMLCanvasElement) ? finalSource.toDataURL('image/png') : (finalSource as HTMLImageElement).src;

            const backgroundObj = new Image();
            backgroundObj.onload = () => {
                setBackgroundImage(backgroundObj);
                setBackground('image');
            };
            backgroundObj.src = dataUrl;
        };

        if (srcOrCanvas instanceof HTMLCanvasElement) {
            onLoad(srcOrCanvas);
        } else {
            const img = new Image();
            img.onerror = () => {
                alert((t.drawing as any)?.image_load_failed || 'Failed to load image. Please try another file.');
            };
            img.onload = () => onLoad(img);
            img.src = srcOrCanvas;
        }
    }, [t.drawing]);

    const isInternalScrollRef = useRef(false);




    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        handleFullscreenChange(); // Initial check
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const availableFonts = React.useMemo(() => {
        return language === 'ko' ? [...KOREAN_FONTS, ...ENGLISH_FONTS] : ENGLISH_FONTS;
    }, [language]);

    // Save customized settings
    useEffect(() => {
        localStorage.setItem('fabric_font_family', fontFamily);
        localStorage.setItem('fabric_font_weight', String(fontWeight));
        localStorage.setItem('fabric_font_style', fontStyle);
    }, [fontFamily, fontWeight, fontStyle]);

    // Save customized settings
    useEffect(() => {
        localStorage.setItem('fabric_colors', JSON.stringify(availableColors));
    }, [availableColors]);

    useEffect(() => {
        localStorage.setItem('fabric_brush_sizes', JSON.stringify(availableBrushSizes));
    }, [availableBrushSizes]);

    useEffect(() => {
        localStorage.setItem('fabric_toolbar_order', JSON.stringify(toolbarItems));
    }, [toolbarItems]);

    useEffect(() => {
        localStorage.setItem('fabric_shape_styles', JSON.stringify(shapeStyles));
    }, [shapeStyles]);

    // Unified background color calculation (calculated during render for sync stability)
    const currentBackgroundColor = React.useMemo(() => {
        return calculateBackgroundColor(backgroundColorType, backgroundColorIntensity);
    }, [backgroundColorType, backgroundColorIntensity]);

    // CSS-based background pattern styling (calculated during render)
    const backgroundStyle = React.useMemo(() => {
        return {}; // Paper color is handled inside canvas now
    }, []);

    const [brushType, setBrushType] = useState<'pen' | 'highlighter' | 'glow' | 'circle' | 'carbon' | 'hatch' | 'laser'>(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (localStorage.getItem('fabric_brush_type') as any) || 'pen';
    });
    const brushTypeRef = useRef(brushType);
    useEffect(() => {
        brushTypeRef.current = brushType;
    }, [brushType]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [tempBrushType, setTempBrushType] = useState(brushType);
    const [drawWithFinger, setDrawWithFinger] = useState(() => {
        return localStorage.getItem('fabric_draw_with_finger') !== 'false';
    });
    const drawWithFingerRef = useRef(drawWithFinger);
    useEffect(() => {
        drawWithFingerRef.current = drawWithFinger;
        localStorage.setItem('fabric_draw_with_finger', drawWithFinger ? 'true' : 'false');
    }, [drawWithFinger]);

    const [tempDrawWithFinger, setTempDrawWithFinger] = useState(drawWithFinger);

    const [isPenEditOpen, setIsPenEditOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isPageEditing, setIsPageEditing] = useState(false);
    const [pageInput, setPageInput] = useState('');
    const [scrollbarSide, setScrollbarSide] = useState<'left' | 'right'>(() => {
        const saved = localStorage.getItem('fabric_scrollbar_side');
        return (saved as 'left' | 'right') || 'left';
    });

    useEffect(() => {
        localStorage.setItem('fabric_scrollbar_side', scrollbarSide);
    }, [scrollbarSide]);

    const [maxPages, setMaxPages] = useState<number>(() => {
        const saved = localStorage.getItem('fabric_max_pages');
        return saved ? parseInt(saved) : 5;
    });

    useEffect(() => {
        localStorage.setItem('fabric_max_pages', maxPages.toString());
    }, [maxPages]);

    const totalPagesRef = useRef(totalPages);
    const maxPagesRef = useRef(maxPages);
    useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);
    useEffect(() => { maxPagesRef.current = maxPages; }, [maxPages]);

    const isInitialLoadRef = useRef(true);
    useEffect(() => {
        const timer = setTimeout(() => {
            isInitialLoadRef.current = false;
        }, 500); // 500ms is enough for initial background/objects to settle
        return () => clearTimeout(timer);
    }, []);
    const lastInteractionTimeRef = useRef(0);



    useEffect(() => {
        localStorage.setItem('fabric_brush_type', brushType);
    }, [brushType]);

    // Tool Settings Persistence
    const updateCanvasCssClip = React.useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const vpt = canvas.viewportTransform;
        const upperCanvas = (canvas as any).upperCanvasEl as HTMLElement;
        const container = upperCanvas?.parentElement;
        if (!vpt || !container) return;

        const zoom = vpt[0];
        const tx = vpt[4];
        const ty = vpt[5];
        const w = pageWidthRef.current * zoom;
        const h = pageHeightRef.current * zoom;

        const canvasW = canvas.getWidth();
        const canvasH = canvas.getHeight();

        const clipT = Math.max(0, ty);
        const clipL = Math.max(0, tx);
        const clipR = Math.max(0, canvasW - (tx + w));
        const clipB = Math.max(0, canvasH - (ty + h));

        container.style.clipPath = `inset(${clipT}px ${clipR}px ${clipB}px ${clipL}px)`;
    }, []);

    const clampVpt = React.useCallback((vpt: number[]) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const zoom = vpt[0];
        const viewportW = canvasViewportRef.current?.clientWidth || canvas.getWidth();
        const viewportH = canvasViewportRef.current?.clientHeight || canvas.getHeight();
        const contentW = pageWidthRef.current * zoom;
        const contentH = pageHeightRef.current * zoom;

        if (contentW <= viewportW) {
            vpt[4] = (viewportW - contentW) / 2;
        } else {
            vpt[4] = Math.min(0, Math.max(vpt[4], viewportW - contentW));
        }

        if (contentH <= viewportH) {
            vpt[5] = (viewportH - contentH) / 2;
        } else {
            vpt[5] = Math.min(0, Math.max(vpt[5], viewportH - contentH));
        }
    }, []);

    const syncScrollToViewport = React.useCallback(() => {
        if (isSyncingScrollRef.current) return;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const vpt = canvas.viewportTransform;
        if (!vpt) return;

        updateCanvasCssClip();

        const zoom = vpt[0];
        const viewportArea = canvasViewportRef.current;
        const viewportW = viewportArea?.clientWidth || canvas.getWidth();
        const viewportH = viewportArea?.clientHeight || canvas.getHeight();
        const contentW = pageWidthRef.current * zoom;
        const contentH = pageHeightRef.current * zoom;

        isInternalScrollRef.current = true;

        if (verticalScrollRef.current) {
            const centeringOffset = Math.max(0, (viewportH - contentH) / 2);
            verticalScrollRef.current.scrollTop = Math.round(centeringOffset - vpt[5]);
        }

        if (horizontalScrollRef.current) {
            const centeringOffset = Math.max(0, (viewportW - contentW) / 2);
            horizontalScrollRef.current.scrollLeft = Math.round(centeringOffset - vpt[4]);
        }

        isInternalScrollRef.current = false;

        const vScroll = verticalScrollRef.current;
        if (vScroll && viewportHeightRef.current > 0) {
            const contentCenterY = (viewportHeightRef.current / 2 - vpt[5]) / zoom;
            const pageUnitHeight = viewportHeightRef.current;
            const calculatedPage = Math.floor(contentCenterY / pageUnitHeight) + 1;
            const maxP = totalPagesRef.current || 1;
            const newPage = Math.max(1, Math.min(maxP, calculatedPage));

            setCurrentPage(prev => (prev !== newPage ? newPage : prev));
        }
    }, [updateCanvasCssClip, setCurrentPage]);
    const updateEraserCursor = React.useCallback(() => {
        const fCanvas = fabricCanvasRef.current;
        if (!fCanvas) return;

        // CRITICAL: We use a DOM-based indicator (Compatibility Layer) for erasers.
        // We set the system cursor to 'none' to avoid duplicates and standard cursor flickering.
        fCanvas.freeDrawingCursor = 'none';
        fCanvas.defaultCursor = 'none';
        fCanvas.hoverCursor = 'none';

        const overlay = (fCanvas as any).__overlayEl;
        if (overlay) {
            overlay.style.cursor = 'none';
        }
    }, [brushSize]);

    const updateObjectEraserCursor = React.useCallback(() => {
        const fCanvas = fabricCanvasRef.current;
        if (!fCanvas) return;

        // CRITICAL: We use a DOM-based indicator (Compatibility Layer) for erasers.
        fCanvas.defaultCursor = 'none';
        fCanvas.hoverCursor = 'none';

        const overlay = (fCanvas as any).__overlayEl;
        if (overlay) {
            overlay.style.cursor = 'none';
        }
    }, [brushSize]);

    const handleResetZoom = React.useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.setZoom(1);
        setCanvasScale(1);
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.requestRenderAll();
        syncScrollToViewport();

        isInternalScrollRef.current = true;
        if (verticalScrollRef.current) {
            verticalScrollRef.current.scrollTop = 0;
        }
        if (horizontalScrollRef.current) {
            horizontalScrollRef.current.scrollLeft = 0;
        }
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
            containerRef.current.scrollLeft = 0;
        }
        // Use a small timeout to let scroll events fire before resetting the flag
        setTimeout(() => {
            isInternalScrollRef.current = false;
        }, 50);
    }, [syncScrollToViewport]);

    const getToolKey = (tool: ToolType, bType: string) => {
        if (tool === 'pen') return bType;
        return tool;
    };

    const [toolSettings, setToolSettings] = useState<Record<string, { color: string, size: number }>>(() => {
        const saved = localStorage.getItem('fabric_tool_settings');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem('fabric_tool_settings', JSON.stringify(toolSettings));
    }, [toolSettings]);

    // Load settings when tool changes
    useEffect(() => {
        const isShape = ['line', 'arrow', 'rect', 'circle', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star', 'text'].includes(activeTool);

        if (isShape) {
            // Provide explicit defaults for shapes to prevent inheriting previous tool's color
            // If we have saved styles, use them. If not, use DEFAULT_SHAPE_STYLE.
            const savedStyle = shapeStyles[activeTool];

            if (savedStyle) {
                // If saved style has color/width, use it. Otherwise fall back to defaults (NOT current state)
                const newColor = savedStyle.stroke || '#000000';
                const newSize = savedStyle.strokeWidth || 2;

                setColor(newColor);
                setBrushSize(newSize);
                // We don't overwrite shapeStyles here. It's already saved or we use ephemeral defaults.
            } else {
                // No saved style for this shape yet. Use hard defaults.
                setColor('#000000');
                setBrushSize(2);
                // Should we save this default immediately? Maybe not, let user choose.
                // But we MUST NOT use current state.
            }
        } else {
            // For non-shape tools (pen, etc.), use existing logic
            const key = getToolKey(activeTool, brushType);
            const settings = toolSettings[key];

            if (settings) {
                // Load saved settings
                setColor(settings.color);
                setBrushSize(settings.size);
            } else {
                // Initialize defaults if not found
                // Special defaults for certain tools
                if (activeTool === 'pen' && brushType === 'highlighter') {
                    const defaultHighlighter = '#ffeb3b'; // Yellowish default for highlighter
                    const defaultSize = 16;
                    setColor(defaultHighlighter);
                    setBrushSize(defaultSize);
                    setToolSettings(prev => ({ ...prev, [key]: { color: defaultHighlighter, size: defaultSize } }));
                } else if (activeTool === 'pen' || activeTool === 'eraser_pixel' || activeTool === 'eraser_object') {
                    // Initialize with current state to start independent tracking for pens and erasers
                    // Erasers always use black for their internal toolSetting color representation
                    const initialColor = activeTool.startsWith('eraser') ? 'black' : color;
                    setToolSettings(prev => ({ ...prev, [key]: { color: initialColor, size: brushSize } }));
                }
            }
        }
        // We only want to run this when tool/brushType changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTool, brushType]);

    // Helper to update persistent settings
    const updateToolSetting = React.useCallback((newColor?: string, newSize?: number, newType?: string) => {
        // Update general state
        if (newColor) setColor(newColor);
        if (newSize) setBrushSize(newSize);
        if (newType) setBrushType(newType as any);

        const currentTool = activeTool;
        const isShape = ['line', 'arrow', 'rect', 'circle', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star', 'text'].includes(currentTool);

        if (isShape) {
            // Update shape styles
            setShapeStyles(prev => ({
                ...prev,
                [currentTool]: {
                    ...(prev[currentTool] || DEFAULT_SHAPE_STYLE),
                    stroke: newColor !== undefined ? newColor : (prev[currentTool]?.stroke || color),
                    strokeWidth: newSize !== undefined ? newSize : (prev[currentTool]?.strokeWidth || brushSize)
                }
            }));
        } else {
            // Update tool settings (for pens, etc)
            const typeToUse = newType || brushType;
            const key = getToolKey(currentTool, typeToUse);

            setToolSettings(prev => ({
                ...prev,
                [key]: {
                    color: newColor !== undefined ? newColor : (prev[key]?.color || color),
                    size: newSize !== undefined ? newSize : (prev[key]?.size || brushSize)
                }
            }));

            // If currently using a pen slot, update its specific settings
            if (currentTool === 'pen' && activePenSlot) {
                setPenSlotSettings(prev => ({
                    ...prev,
                    [activePenSlot]: {
                        brushType: typeToUse,
                        color: newColor !== undefined ? newColor : (prev[activePenSlot]?.color || color),
                        size: newSize !== undefined ? newSize : (prev[activePenSlot]?.size || brushSize)
                    }
                }));
            }
        }
    }, [activeTool, brushType, color, brushSize, activePenSlot, getToolKey]);

    const handleToolSelect = React.useCallback((itemId: string, itemType: string, toolId?: ToolType) => {
        if (itemType === 'tool' && toolId) {
            setActiveToolItemId(itemId);
            if (toolId === 'pen') {
                const slotId = (itemId === 'pen' || itemId === 'pen_1') ? 'pen_1' : (itemId === 'pen_2' ? 'pen_2' : (itemId === 'pen_3' ? 'pen_3' : (itemId === 'pen_4' ? 'pen_4' : 'pen_1')));
                setActivePenSlot(slotId);
                const settings = penSlotSettings[slotId];
                if (settings) {
                    setBrushType(settings.brushType as any);
                    setColor(settings.color);
                    setBrushSize(settings.size);
                }
                setActiveTool('pen');
            } else {
                // Track last-used eraser type for barrel button feature
                if (toolId === 'eraser_pixel' || toolId === 'eraser_object') {
                    lastUsedEraserRef.current = toolId;
                }
                setActiveTool(toolId);
            }
        }
    }, [penSlotSettings, setActivePenSlot, setBrushType, setColor, setBrushSize, setActiveTool, setActiveToolItemId]);

    // Shape drawing refs
    const isDrawingRef = useRef(false);
    const startPointRef = useRef<{ x: number, y: number } | null>(null);
    const activeShapeRef = useRef<fabric.Object | null>(null);
    const arrowHeadPreviewRef = useRef<fabric.Polyline | null>(null);

    // History for undo/redo - Action-based for performance
    // Each action stores: { type: 'add'|'remove'|'modify', objectJson, prevJson?, id }
    type HistoryAction = {
        type: 'add' | 'remove' | 'modify' | 'snapshot';
        objectJson?: string;
        prevJson?: string;
        objectId?: string;
        snapshot?: string; // Full snapshot for initial state or complex operations
    };
    const historyRef = useRef<HistoryAction[]>([]);
    const historyIndexRef = useRef(-1);
    const lastSavedIndexRef = useRef(-1);
    const isUndoRedoRef = useRef(false); // Prevent saving during undo/redo
    const objectIdMapRef = useRef<WeakMap<fabric.Object, string>>(new WeakMap()); // Track object IDs
    const nextObjectIdRef = useRef(1); // Counter for unique IDs

    const lastTapMapRef = useRef<{ [key: string]: number }>({});
    const openedTimeRef = useRef<number>(0);
    const [settingsAnchor, setSettingsAnchor] = useState<{ top: number } | null>(null);


    const handleDoubleTap = (e: React.TouchEvent, id: string, callback: (e: React.TouchEvent | React.MouseEvent) => void) => {
        const now = Date.now();
        const lastTap = lastTapMapRef.current[id] || 0;
        const diff = now - lastTap;
        if (diff > 0 && diff < 400) {
            if (e.cancelable) e.preventDefault();
            openedTimeRef.current = now; // Record open time for ghost click prevention
            callback(e);
            lastTapMapRef.current[id] = 0;
        } else {
            lastTapMapRef.current[id] = now;
        }
    };

    const handleBgCancel = () => {
        if (prevBackgroundStateRef.current) {
            setBackground(prevBackgroundStateRef.current.type);
            setBackgroundColor(prevBackgroundStateRef.current.color);
            setLineOpacity(prevBackgroundStateRef.current.opacity);
            setBackgroundSize(prevBackgroundStateRef.current.size);
            setBackgroundBundleGap(prevBackgroundStateRef.current.bundleGap);
            setBackgroundColorIntensity(prevBackgroundStateRef.current.intensity);
            setBackgroundColorType(prevBackgroundStateRef.current.colorType);
            setBackgroundImage(prevBackgroundStateRef.current.image || null);
            setBackgroundImageOpacity(prevBackgroundStateRef.current.imageOpacity);
            setIsBgPickerOpen(false);
            setSettingsAnchor(null);
        }
    };

    const handleBackgroundFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. File size check - warn user about large files (>10MB)
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 10) {
            const warningMsg = ((t.drawing as any)?.image_too_large_warning || 'This file is very large ({size}MB). Processing may take a moment.')
                .replace('{size}', fileSizeMB.toFixed(1));
            alert(warningMsg);
        }

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                processImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {

            try {
                // Version 4.x/5.x compatibility handling
                let pdfjs: any;
                try {
                    const pdfjsModule: any = await import('pdfjs-dist');
                    pdfjs = pdfjsModule.default || pdfjsModule;
                } catch (importErr) {
                    console.error('Failed to import pdfjs-dist via dynamic import:', importErr);
                    throw importErr;
                }

                // CRITICAL: Version 4+ uses .mjs for worker, older versions use .js
                const version = pdfjs.version || '4.10.38';
                const majorVersion = parseInt(version.split('.')[0]);
                const extension = majorVersion >= 4 ? 'mjs' : 'js';

                // UNPKG is more reliable for V5 as it contains the required .mjs files 
                // which are often missing or misconfigured on other CDNs like cdnjs.
                pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.${extension}`;

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjs.getDocument({
                    data: arrayBuffer,
                    // Ensure the worker is handled correctly
                    useWorkerFetch: true,
                    isEvalSupported: false
                });

                const pdf = await loadingTask.promise;
                setPdfDocToSelect(pdf);
            } catch (err: any) {
                console.error('PDF system failed to initialize:', err);
                alert(`${(t.drawing as any)?.image_load_failed || 'Failed to load PDF.'} (${err.message || 'System error'})`);
            }


        }


        e.target.value = '';
    };

    const handleBgOk = () => {
        setIsBgPickerOpen(false);
        setSettingsAnchor(null);
    };

    // Helper to get or assign object ID
    const getObjectId = React.useCallback((obj: fabric.Object): string => {
        let id = objectIdMapRef.current.get(obj);
        if (!id) {
            id = `obj_${nextObjectIdRef.current++} `;
            objectIdMapRef.current.set(obj, id);
            (obj as any).__historyId = id; // Store on object for serialization recovery
        }
        return id;
    }, []);

    // Save initial snapshot (full JSON) - only called once on init
    const saveInitialSnapshot = React.useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const json = JSON.stringify(canvas.toJSON());
        historyRef.current = [{ type: 'snapshot', snapshot: json }];
        historyIndexRef.current = 0;
        lastSavedIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
    }, []);

    // Add action to history (incremental - much faster than full JSON)
    const addHistoryAction = React.useCallback((action: HistoryAction) => {
        if (isUndoRedoRef.current) return;

        // Remove any future history if we're not at the end
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        }

        historyRef.current.push(action);
        historyIndexRef.current = historyRef.current.length - 1;

        // Limit history size - but keep initial snapshot
        if (historyRef.current.length > 100) {
            // Compact: Create new snapshot from current state periodically
            const canvas = fabricCanvasRef.current;
            if (canvas && historyRef.current.length > 150) {
                const snapshot = JSON.stringify(canvas.toJSON());
                historyRef.current = [{ type: 'snapshot', snapshot }];
                historyIndexRef.current = 0;
            } else {
                historyRef.current.shift();
                historyIndexRef.current--;
            }
        }

        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(false);
    }, []);

    // Handle object added - save just the new object
    const handleObjectAddedForHistory = React.useCallback((e: any) => {
        if (isUndoRedoRef.current) return;
        const obj = e.target;
        if (!obj) return;

        // Track last added object for ghost line suppression
        lastAddedObjectRef.current = obj;
        lastAddedObjectTimeRef.current = Date.now();

        const id = getObjectId(obj);
        // Serialize just this one object
        const objectJson = JSON.stringify(obj.toJSON());
        addHistoryAction({ type: 'add', objectJson, objectId: id });
    }, [getObjectId, addHistoryAction]);

    // Handle object removed - save the removed object for potential undo
    const handleObjectRemovedForHistory = React.useCallback((e: any) => {
        if (isUndoRedoRef.current) return;
        const obj = e.target;
        if (!obj) return;

        const id = (obj as any).__historyId || getObjectId(obj);
        const objectJson = JSON.stringify(obj.toJSON());
        addHistoryAction({ type: 'remove', objectJson, objectId: id });
    }, [getObjectId, addHistoryAction]);

    // Debounced modify handler - only saves after user stops modifying
    const modifyTimeoutRef = useRef<any | null>(null);
    const pendingModifyRef = useRef<{ obj: fabric.Object; prevJson: string } | null>(null);

    const handleObjectModifiedForHistory = React.useCallback((e: any) => {
        if (isUndoRedoRef.current) return;
        const obj = e.target;
        if (!obj) return;

        // Clear existing timeout
        if (modifyTimeoutRef.current) {
            clearTimeout(modifyTimeoutRef.current);
        }

        // Store the previous state if not already captured
        if (!pendingModifyRef.current || pendingModifyRef.current.obj !== obj) {
            pendingModifyRef.current = { obj, prevJson: JSON.stringify(obj.toJSON()) };
        }

        // Debounce - save after 500ms of no modifications
        modifyTimeoutRef.current = setTimeout(() => {
            if (pendingModifyRef.current) {
                const { obj: modObj } = pendingModifyRef.current;
                const id = (modObj as any).__historyId || getObjectId(modObj);
                const objectJson = JSON.stringify(modObj.toJSON());
                addHistoryAction({
                    type: 'modify',
                    objectJson,
                    prevJson: pendingModifyRef.current.prevJson,
                    objectId: id
                });
                pendingModifyRef.current = null;
            }
        }, 500);
    }, [getObjectId, addHistoryAction]);

    // Legacy saveHistory for compatibility with extend height etc (uses snapshot)
    const saveHistory = React.useCallback(() => {
        if (isUndoRedoRef.current) return;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const json = JSON.stringify(canvas.toJSON());
        addHistoryAction({ type: 'snapshot', snapshot: json });
    }, [addHistoryAction]);

    useLayoutEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        // Cleanup
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }

        const width = containerRef.current.clientWidth || pageWidthRef.current || 800;
        const height = containerRef.current.clientHeight || pageHeightRef.current || 600;
        viewportHeightRef.current = height; // Store viewport height for canvas extension

        const canvas = new fabric.Canvas(canvasRef.current, {
            width,
            height,
            backgroundColor: 'transparent',
            isDrawingMode: true,
            selection: false,
            // Intensive performance optimizations for mobile/Android
            renderOnAddRemove: false,
            enableRetinaScaling: true,
            skipOffscreen: true,
            stateful: false,
            targetFindTolerance: 0,
            perPixelTargetFind: false,
            // Fire events only on upper canvas during drawing
            containerClass: 'canvas-container',
            stopContextMenu: true,
            fireRightClick: false,
            fireMiddleClick: false,
            // Allow browser scrolling even when touching the canvas (important for jitter)
            allowTouchScrolling: true,
        });

        // Forced initial render to prevent 'black screen' when renderOnAddRemove is false
        canvas.renderAll();

        // Extra render pass for unusual layout transitions (like Galaxy Fold)
        setTimeout(() => {
            canvas.renderAll();
        }, 100);

        // 🚀 GLOBAL PERFORMANCE OVERRIDE: Strict Viewport Culling
        // This stops Fabric from even THINKING about objects that are not visible.
        const originalRenderObjects = (canvas as any)._renderObjects.bind(canvas);
        (canvas as any)._renderObjects = function (ctx: CanvasRenderingContext2D, objects: fabric.Object[]) {
            const vpt = canvas.viewportTransform;
            if (!vpt) return originalRenderObjects(ctx, objects);

            // Use Fabric's internal viewport transform to calculate valid area
            // transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
            const zoom = vpt[0];
            const panY = vpt[5];

            // Calculate visible area in canvas coordinates (absolute object coordinates)
            // Visible Top: -panY / zoom
            // Visible Bottom: (CanvasHeight - panY) / zoom
            const viewportHeight = canvas.getHeight();
            const visibleTop = -panY / zoom;
            const visibleBottom = (viewportHeight - panY) / zoom;

            // Buffer: 1 screen height
            const bufferHeight = (visibleBottom - visibleTop);
            const renderTop = visibleTop - bufferHeight;
            const renderBottom = visibleBottom + bufferHeight;

            // High-speed manual loop
            const visibleObjects = [];
            for (let i = 0, len = objects.length; i < len; i++) {
                const obj = objects[i];
                if (!obj) continue;

                // 🚀 CRITICAL: Always render the page background.
                // Do not apply culling to the background rect to avoid the 'gray screen' issue.
                if ((obj as any).isPageBackground) {
                    visibleObjects.push(obj);
                    continue;
                }

                const top = obj.top || 0;
                // Simple height estimation (scaled)
                const height = (obj.height || 0) * (obj.scaleY || 1);
                const bottom = top + height;

                // Check intersection
                if (bottom > renderTop && top < renderBottom) {
                    visibleObjects.push(obj);
                }
            }

            originalRenderObjects(ctx, visibleObjects);
        };
        // Set properties that might not be in types but exist in runtime
        (canvas as any).subTargetCheck = false;

        // Additional global performance settings
        fabric.Object.prototype.objectCaching = false;
        (fabric.Object.prototype as any).statefullCache = false;
        (fabric.Object.prototype as any).statefulCache = false;
        fabric.Object.prototype.noScaleCache = true;

        // Conditional caching: Don't cache very small paths to save VRAM on mobile
        fabric.Object.prototype.needsItsOwnCache = function () {
            if (this.type === 'path') {
                if (this.width! * this.scaleX! < 10 || this.height! * this.scaleY! < 10) return false;
            }
            return true;
        };

        // Set initial brush with optimized settings
        const brush = new fabric.PencilBrush(canvas);
        brush.width = brushSize;
        brush.color = color;
        // Low decimate for high accuracy: 0.5 follows the pen much more closely
        brush.decimate = 0.5;
        canvas.freeDrawingBrush = brush;
        canvas.allowTouchScrolling = false; // Disable Fabric's internal touch scrolling

        fabricCanvasRef.current = canvas;

        const checkIsInside = (ptr: { x: number, y: number }) => {
            const activeTool = activeToolRef.current;
            if (activeTool === 'select') return true;
            const w = pageWidthRef.current;
            const h = pageHeightRef.current;
            // Return true if inside (0-w, 0-h)
            return ptr.x >= 0 && ptr.x <= w && ptr.y >= 0 && ptr.y <= h;
        };



        // 🚀 PERSISTENT BACKDROP PROTECTION via Framework Orchestration
        // We override Fabric's internal event methods so they survive canvas.off() calls.

        const getBoundaryPoint = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
            const w = pageWidthRef.current;
            const h = pageHeightRef.current;
            // Buffer of 0.5px to ensure we stay strictly inside the visual clip boundary
            const buffer = 0.5;
            let t = 1;
            if (p2.x < buffer) t = Math.min(t, (buffer - p1.x) / (p2.x - p1.x));
            else if (p2.x > w - buffer) t = Math.min(t, (w - buffer - p1.x) / (p2.x - p1.x));
            if (p2.y < buffer) t = Math.min(t, (buffer - p1.y) / (p2.y - p1.y));
            else if (p2.y > h - buffer) t = Math.min(t, (h - buffer - p1.y) / (p2.y - p1.y));
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        };

        const original__onMouseDown = (canvas as any).__onMouseDown.bind(canvas);
        (canvas as any).__onMouseDown = function (e: Event) {
            const ptr = this.getPointer(e);
            if (!checkIsInside(ptr) && activeToolRef.current !== 'select') {
                (this as any)._boundaryBlocked = true;
                return;
            }
            (this as any)._boundaryBlocked = false;
            (this as any)._lastInsidePtr = ptr;
            original__onMouseDown(e);
        };

        const original__onMouseMove = (canvas as any).__onMouseMove.bind(canvas);
        (canvas as any).__onMouseMove = function (e: Event) {
            if (activeToolRef.current === 'select') {
                return original__onMouseMove(e);
            }
            if ((this as any)._boundaryBlocked) return;

            const ptr = this.getPointer(e);
            const isInside = checkIsInside(ptr);

            if (!isInside) {
                // Terminate interaction if we exit the paper
                const isInteracting = (this as any)._isCurrentlyDrawing || (this as any)._isMouseDown;
                if (isInteracting && (this as any)._lastInsidePtr) {
                    // FAST STROKE COMPATIBILITY: Interpolate the exact intersection point with the boundary
                    const boundaryPtr = getBoundaryPoint((this as any)._lastInsidePtr, ptr);

                    // Temporarily override getPointer to guide the brush to the edge
                    const realGetPointer = this.getPointer;
                    this.getPointer = () => boundaryPtr;
                    original__onMouseMove(e);
                    this.getPointer = realGetPointer;

                    this._onMouseUp(e);
                    const brush = this.freeDrawingBrush as any;
                    if (brush && brush._points) {
                        brush._points = [];
                        if (brush._reset) brush._reset();
                    }
                    (this as any)._isCurrentlyDrawing = false;
                    (this as any)._isMouseDown = false;
                    (this as any)._boundaryBlocked = true;
                    this.requestRenderAll();
                    return;
                }
                (this as any)._boundaryBlocked = true;
                return;
            }

            (this as any)._lastInsidePtr = ptr;
            original__onMouseMove(e);
        };

        const original__onMouseUp = (canvas as any).__onMouseUp.bind(canvas);
        (canvas as any).__onMouseUp = function (e: Event) {
            (this as any)._boundaryBlocked = false;
            original__onMouseUp(e);
        };

        updateCanvasCssClip();

        // Auto-resize canvas when CanvasWrapper resizes
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const newWidth = Math.floor(entry.contentRect.width);
            const newHeight = Math.floor(entry.contentRect.height);

            // Note: We need to subtract scrollbar sizes from viewport if they are visible
            // but Grid layout handles the 'main' area size for us.
            // Let's observe the canvasViewportRef instead if possible for absolute precision.

            // Update if dimension changed significantly to avoid sub-pixel loops
            let changed = false;
            const currentW = canvas.getWidth();
            const currentH = canvas.getHeight();

            if (Math.abs(currentW - newWidth) > 5) {
                canvas.setWidth(newWidth);
                changed = true;
            }

            if (Math.abs(currentH - newHeight) > 2) {
                canvas.setHeight(newHeight);
                viewportHeightRef.current = newHeight;
                changed = true;
            }

            // Protect dimensions in image mode to prevent loops or jumping
            if (backgroundRef.current === 'image') return;

            if (changed) {
                canvas.renderAll();
                syncScrollToViewport();
            }
        });

        if (canvasViewportRef.current) {
            const width = canvasViewportRef.current.clientWidth;
            const height = canvasViewportRef.current.clientHeight;
            pageWidthRef.current = width;

            // Only set initial height if not already set (e.g. from initialData parsing)
            if (pageHeightRef.current <= 0) {
                // Default to a reasonable size if starting fresh, or fill viewport if small
                const defaultHeight = Math.min(height, 500);
                pageHeightRef.current = defaultHeight;
                setPageHeightState(defaultHeight);
            }

            setPageWidthState(width);
            resizeObserver.observe(canvasViewportRef.current);
        }

        // Mouse wheel zooming
        canvas.on('mouse:wheel', function (opt) {
            const e = opt.e;
            if (isZoomLockedRef.current) {
                if (verticalScrollRef.current) {
                    verticalScrollRef.current.scrollTop += e.deltaY;
                }
                if (horizontalScrollRef.current) {
                    horizontalScrollRef.current.scrollLeft += e.deltaX;
                }
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                return;
            }

            const delta = e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= Math.pow(0.999, delta);
            if (zoom > 10) zoom = 10;
            if (zoom < 0.1) zoom = 0.1;

            const pointer = canvas.getPointer(e);
            canvas.zoomToPoint(new fabric.Point(pointer.x, pointer.y), zoom);

            const vpt = canvas.viewportTransform;
            if (vpt) {
                clampVpt(vpt);
            }

            setCanvasScale(zoom);
            canvas.requestRenderAll();
            syncScrollToViewport();

            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
        });

        // Sync native scroll to viewport
        canvas.on('viewport:scaled', () => {
            setCanvasScale(canvas.getZoom());
        });





        canvas.on('viewport:scaled', syncScrollToViewport);
        canvas.on('viewport:translated', syncScrollToViewport);

        // Panning support driving native scroll
        let isDragging = false;
        let lastPosX = 0;
        let lastPosY = 0;

        canvas.on('mouse:down', (opt) => {
            const evt = opt.e;
            const isMiddleButton = evt.button === 1;
            const isModifierKeyPanned = evt.button === 0 && (evt.altKey || evt.shiftKey || evt.metaKey || evt.ctrlKey);

            if (isMiddleButton || isModifierKeyPanned) {
                isDragging = true;
                canvas.isDrawingMode = false;
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
                evt.preventDefault();
                evt.stopPropagation();
            }
        });

        canvas.on('mouse:move', (opt) => {
            if (isDragging && containerRef.current) {
                const e = opt.e;
                const deltaX = e.clientX - lastPosX;
                const deltaY = e.clientY - lastPosY;

                const vpt = canvas.viewportTransform;
                if (vpt) {
                    vpt[4] += deltaX;
                    vpt[5] += deltaY;
                    clampVpt(vpt);
                    canvas.requestRenderAll();
                    syncScrollToViewport();
                }

                lastPosX = e.clientX;
                lastPosY = e.clientY;
            }
        });

        canvas.on('mouse:up', () => {
            if (isDragging) {
                isDragging = false;
                // Restore drawing mode if needed
                const isSketchTool = ['pen', 'carbon', 'hatch', 'highlighter', 'glow', 'circle', 'laser', 'eraser_pixel'].includes(activeToolRef.current);
                if (isSketchTool) {
                    canvas.isDrawingMode = true;
                }
            }
        });

        // Palm Rejection Filter - Smart mode for Windows convertible laptops
        // Logic: Always On Palm Rejection (Smart)
        let penPointerId = -1;
        let lastPenTime = 0;
        const PEN_TIMEOUT = 500; // Increased for safer palm rejection

        // Check if we should block non-pen input
        const shouldBlockNonPen = (): boolean => {
            if (penPointerId !== -1) return true;
            if (Date.now() - lastPenTime < PEN_TIMEOUT) return true;
            return false;
        };

        // Helper to detect if event is from a stylus/pen
        const isPenEvent = (e: any): boolean => {
            if (e.pointerType === 'pen') return true;
            if (e.pointerType === 'touch' || e.pointerType === 'mouse') return false;
            if (e.tiltX || e.tiltY) return true;
            if (e.pressure > 0 && e.pressure !== 0.5 && e.pressure !== 1) return true;
            return false;
        };

        // Aggressive Palm Check: Filter by contact size if available
        const isPalmEvent = (e: any): boolean => {
            if (e.pointerType !== 'touch') return false;
            // Most fingertips are small. Palms/sides of hands have large contact width/height.
            // threshold of 20-30 pixels is usually safe to distinguish palm from finger.
            const w = e.width || 0;
            const h = e.height || 0;
            if (w > 25 || h > 25) return true;
            return false;
        };

        // 🛡️ AIR-GAPPED OVERLAY CONTROLLER
        // We create a transparent 'shield' element on top of the canvas.
        // ALL input hits this shield first.
        // We selectively 'bridge' events to Fabric ONLY if they match our rules (Pen Only).
        // This physically prevents Fabric from ever seeing a Palm event.

        const setupInputOverlay = () => {
            const lowerCanvasEl = (canvas as any).lowerCanvasEl;
            const wrapperEl = (canvas as any).wrapperEl;
            if (!wrapperEl || !lowerCanvasEl) return;

            // Check if overlay already exists
            let overlay = wrapperEl.querySelector('.input-overlay-shield') as HTMLDivElement;
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'input-overlay-shield';
                overlay.style.position = 'absolute';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.zIndex = '1000'; // Above upperCanvas
                overlay.style.touchAction = 'none'; // Prevent browser gestures
                overlay.style.userSelect = 'none';
                overlay.style.webkitUserSelect = 'none';
                (overlay.style as any).webkitTouchCallout = 'none';

                // Block context menu (Galaxy Tab / Android long-press popup)
                overlay.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                };

                wrapperEl.appendChild(overlay);
            }

            // --- Cursor Synchronization ---
            // Since the overlay is on top of the upperCanvas, we must sync the cursor
            // style manually so tool-specific cursors (like the eraser) are visible.
            const upperCanvasEl = (canvas as any).upperCanvasEl as HTMLElement;
            if (upperCanvasEl) {
                // Initial sync
                overlay.style.cursor = upperCanvasEl.style.cursor;

                // Watch for changes to upperCanvasEl's style (Fabric changes cursor here)
                const observer = new MutationObserver(() => {
                    // CRITICAL: If eraser is active, we MUST hide the system pointer.
                    // The DOM-based Compatibility Layer indicator handles the visuals.
                    if (activeToolRef.current === 'eraser_pixel' || activeToolRef.current === 'eraser_object') {
                        if (overlay.style.cursor !== 'none') {
                            overlay.style.cursor = 'none';
                        }
                        return;
                    }

                    if (overlay.style.cursor !== upperCanvasEl.style.cursor) {
                        overlay.style.cursor = upperCanvasEl.style.cursor;
                    }
                });
                observer.observe(upperCanvasEl, { attributes: true, attributeFilter: ['style'] });

                // Cleanup old observer if it exists
                if ((canvas as any).__cursorObserver) {
                    (canvas as any).__cursorObserver.disconnect();
                }
                (canvas as any).__cursorObserver = observer;
            }

            // AGGRESSIVE: Block context menu on all canvas components to prevent "Download/Share/Print" on Android
            const blockMenu = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            };
            wrapperEl.addEventListener('contextmenu', blockMenu);
            if (upperCanvasEl) upperCanvasEl.addEventListener('contextmenu', blockMenu);
            if (lowerCanvasEl) lowerCanvasEl.addEventListener('contextmenu', blockMenu);
            overlay.addEventListener('contextmenu', blockMenu);

            (canvas as any)._contextMenuCleanup = () => {
                wrapperEl.removeEventListener('contextmenu', blockMenu);
                if (upperCanvasEl) upperCanvasEl.removeEventListener('contextmenu', blockMenu);
                if (lowerCanvasEl) lowerCanvasEl.removeEventListener('contextmenu', blockMenu);
                overlay.removeEventListener('contextmenu', blockMenu);
            };

            // Bridge Logic
            // We need to call Fabric's internal handlers, but treating the overlay as the target
            // might confuse Fabric's position logic if we don't be careful.
            // Fortunately, Fabric's 'getPointer' does 'getBoundingClientRect' on the upperCanvas.

            // State
            const activePointers = new Map<number, { x: number, y: number }>();
            const forwardedPointers = new Set<number>();
            let isMultiTouching = false;
            let multiTouchSessionActive = false;
            let lastPinchDist = 0;
            let lastPinchZoom = 1;
            let lastPinchMidpoint: { x: number, y: number } | null = null;

            const getEvtPos = (e: any) => ({ x: e.clientX, y: e.clientY });

            const forwardToFabric = (methodName: string, e: any) => {
                const handler = (canvas as any)[methodName];
                if (handler) {
                    handler.call(canvas, e);
                }
            };

            const abortActiveStroke = () => {
                // Abort any current drawing immediately
                (canvas as any)._isCurrentlyDrawing = false;
                (canvas as any)._isMouseDown = false;

                // Clear the top canvas where the active brush path is drawn
                if ((canvas as any).contextTop) {
                    canvas.clearContext((canvas as any).contextTop);
                }

                const brush = canvas.freeDrawingBrush as any;
                if (brush) {
                    brush._points = [];
                    if (brush._reset) brush._reset();
                }

                canvas.requestRenderAll();
            };

            const onPointerDown = (e: any) => {
                const id = e.pointerId;
                const isPen = isPenEvent(e);

                if (isPen) {
                    penPointerId = id;
                    lastPenTime = Date.now();
                }

                activePointers.set(id, getEvtPos(e));

                // 1. Zoom/Pan Tracking (Multi-touch)
                if (e.pointerType === 'touch' && activePointers.size >= 2) {
                    isMultiTouching = true;
                    multiTouchSessionActive = true;
                    abortActiveStroke(); // Stop drawing immediately

                    // Clear forwarded pointers to ensure no one completes a stroke
                    forwardedPointers.clear();

                    // Init pinch
                    const points = Array.from(activePointers.values());
                    lastPinchDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
                    lastPinchZoom = canvas.getZoom();
                    lastPinchMidpoint = {
                        x: (points[0].x + points[1].x) / 2,
                        y: (points[0].y + points[1].y) / 2
                    };

                    e.preventDefault();
                    e.stopPropagation();
                    return; // Absorb event
                }

                // 2. Barrel Button Eraser Detection
                // Stylus barrel button: button === 5 (standard) or button === 2 with pen pointerType
                const isBarrelButton = isPen && (e.button === 5 || (e.button === 2 && e.pointerType === 'pen'));
                const currentTool = activeToolRef.current;

                if (isBarrelButton && currentTool !== 'eraser_pixel' && currentTool !== 'eraser_object') {
                    const eraserType = lastUsedEraserRef.current;

                    if (eraserType === 'eraser_pixel') {
                        // --- Pixel Eraser via Barrel Button ---
                        // Save current state
                        const overlay = (canvas as any).__overlayEl;
                        const upperCanvasEl = (canvas as any).upperCanvasEl;
                        savedBrushStateRef.current = {
                            brush: canvas.freeDrawingBrush,
                            isDrawingMode: !!canvas.isDrawingMode,
                            freeDrawingCursor: canvas.freeDrawingCursor || 'crosshair',
                            defaultCursor: canvas.defaultCursor || 'default',
                            hoverCursor: canvas.hoverCursor || 'default',
                            overlayCursor: overlay ? overlay.style.cursor : 'default',
                            upperCanvasOpacity: upperCanvasEl ? upperCanvasEl.style.opacity : '1',
                        };

                        // Switch to pixel eraser brush (no React state change!)
                        const eraserBrush = new fabric.PencilBrush(canvas);
                        const currentBrushSize = canvas.freeDrawingBrush ? canvas.freeDrawingBrush.width : 8;
                        eraserBrush.width = currentBrushSize * 4;
                        eraserBrush.color = 'black';
                        // @ts-ignore
                        eraserBrush.globalCompositeOperation = 'source-over';
                        (eraserBrush as any).decimate = 0.5;

                        canvas.freeDrawingBrush = eraserBrush;
                        canvas.isDrawingMode = true;
                        canvas.freeDrawingCursor = 'none';
                        canvas.defaultCursor = 'none';
                        canvas.hoverCursor = 'none';
                        if (overlay) overlay.style.cursor = 'none';
                        if (upperCanvasEl) upperCanvasEl.style.opacity = '0.01';

                        barrelButtonErasingRef.current = true;
                        abortActiveStroke();

                        forwardedPointers.add(id);
                        forwardToFabric('__onMouseDown', e);
                        return;
                    } else {
                        // --- Object Eraser via Barrel Button ---
                        barrelButtonErasingRef.current = true;
                        // Don't forward to Fabric; we handle object removal directly
                        // Store a minimal state backup for cleanup
                        savedBrushStateRef.current = {
                            brush: canvas.freeDrawingBrush,
                            isDrawingMode: !!canvas.isDrawingMode,
                            freeDrawingCursor: canvas.freeDrawingCursor || 'crosshair',
                            defaultCursor: canvas.defaultCursor || 'default',
                            hoverCursor: canvas.hoverCursor || 'default',
                            overlayCursor: ((canvas as any).__overlayEl || {}).style?.cursor || 'default',
                            upperCanvasOpacity: ((canvas as any).upperCanvasEl || {}).style?.opacity || '1',
                        };

                        abortActiveStroke();

                        // Perform immediate object erasing at this point
                        const pointer = canvas.getPointer(e);
                        const bSize = canvas.freeDrawingBrush ? canvas.freeDrawingBrush.width : 8;
                        const visualRadius = ((bSize * 4) / 2);

                        const objects = canvas.getObjects();
                        const checkRadius = visualRadius * 0.9;
                        const samplePoints = [
                            new fabric.Point(pointer.x, pointer.y),
                            new fabric.Point(pointer.x - checkRadius, pointer.y),
                            new fabric.Point(pointer.x + checkRadius, pointer.y),
                            new fabric.Point(pointer.x, pointer.y - checkRadius),
                            new fabric.Point(pointer.x, pointer.y + checkRadius),
                            new fabric.Point(pointer.x - checkRadius * 0.707, pointer.y - checkRadius * 0.707),
                            new fabric.Point(pointer.x + checkRadius * 0.707, pointer.y - checkRadius * 0.707),
                            new fabric.Point(pointer.x - checkRadius * 0.707, pointer.y + checkRadius * 0.707),
                            new fabric.Point(pointer.x + checkRadius * 0.707, pointer.y + checkRadius * 0.707)
                        ];
                        for (const p of samplePoints) {
                            // @ts-ignore
                            const target = (canvas as any)._searchPossibleTargets(objects, p);
                            if (target && !((target as any).isPixelEraser || (target as any).isPageBackground)) {
                                canvas.remove(target);
                            }
                        }
                        canvas.requestRenderAll();

                        // Mark this pointer as barrel-object-erasing (for move handler)
                        forwardedPointers.add(id);
                        return;
                    }
                }

                // 3. Decision: Forward to Fabric or Absorb?
                const allowTouch = drawWithFingerRef.current && !shouldBlockNonPen() && !isPalmEvent(e);
                if (isPen || allowTouch) {
                    if (isPen) {
                        abortActiveStroke();
                    }

                    forwardedPointers.add(id);
                    forwardToFabric('__onMouseDown', e);
                    return;
                }
            };

            const onPointerMove = (e: any) => {
                const id = e.pointerId;
                const isPen = isPenEvent(e);

                if (activePointers.has(id)) {
                    activePointers.set(id, getEvtPos(e));
                }

                if (isMultiTouching && activePointers.size >= 2) {
                    const points = Array.from(activePointers.values());
                    const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
                    const center = {
                        x: (points[0].x + points[1].x) / 2,
                        y: (points[0].y + points[1].y) / 2
                    };

                    if (!isZoomLockedRef.current && lastPinchDist > 10) {
                        const zoomRatio = dist / lastPinchDist;
                        const newZoom = Math.min(Math.max(lastPinchZoom * zoomRatio, 0.1), 10);

                        // Calculate panning displacement
                        const dx = lastPinchMidpoint ? (center.x - lastPinchMidpoint.x) : 0;
                        const dy = lastPinchMidpoint ? (center.y - lastPinchMidpoint.y) : 0;

                        const rect = lowerCanvasEl.getBoundingClientRect();
                        // Zoom around the PREVIOUS center to keep the content stable during the zoom portion
                        const zoomPoint = lastPinchMidpoint || center;
                        const localPoint = new fabric.Point(zoomPoint.x - rect.left, zoomPoint.y - rect.top);

                        canvas.zoomToPoint(localPoint, newZoom);
                        setCanvasScale(newZoom);

                        if (activeToolRef.current === 'eraser_pixel') updateEraserCursor();
                        if (activeToolRef.current === 'eraser_object') updateObjectEraserCursor();

                        const vpt = canvas.viewportTransform;
                        if (vpt) {
                            vpt[4] += dx;
                            vpt[5] += dy;
                            clampVpt(vpt);
                            canvas.setViewportTransform(vpt);
                        }

                        canvas.requestRenderAll();
                        syncScrollToViewport();
                    } else if (isZoomLockedRef.current && lastPinchMidpoint) {
                        const dy = center.y - lastPinchMidpoint.y;

                        const vpt = canvas.viewportTransform;
                        if (vpt) {
                            vpt[5] += dy;
                            clampVpt(vpt); // Keep paper in view
                            canvas.requestRenderAll();
                            syncScrollToViewport();
                        }
                    }

                    lastPinchMidpoint = center;
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                const allowTouch = drawWithFingerRef.current && !shouldBlockNonPen() && !isPalmEvent(e);
                if (isPen || (allowTouch && !isMultiTouching)) {
                    // Handle barrel button object eraser drag
                    if (barrelButtonErasingRef.current && lastUsedEraserRef.current === 'eraser_object' && forwardedPointers.has(id)) {
                        // Directly remove objects under pointer (don't forward to Fabric)
                        const pointer = canvas.getPointer(e);
                        const bSize = canvas.freeDrawingBrush ? canvas.freeDrawingBrush.width : 8;
                        const visualRadius = ((bSize * 4) / 2);
                        const checkRadius = visualRadius * 0.9;

                        const objects = canvas.getObjects();
                        const samplePoints = [
                            new fabric.Point(pointer.x, pointer.y),
                            new fabric.Point(pointer.x - checkRadius, pointer.y),
                            new fabric.Point(pointer.x + checkRadius, pointer.y),
                            new fabric.Point(pointer.x, pointer.y - checkRadius),
                            new fabric.Point(pointer.x, pointer.y + checkRadius),
                        ];
                        for (const p of samplePoints) {
                            // @ts-ignore
                            const target = (canvas as any)._searchPossibleTargets(objects, p);
                            if (target && !((target as any).isPixelEraser || (target as any).isPageBackground)) {
                                canvas.remove(target);
                            }
                        }
                        canvas.requestRenderAll();
                        return;
                    }

                    forwardToFabric('__onMouseMove', e);

                    // Force re-render during barrel-button pixel erasing for real-time feedback
                    if (barrelButtonErasingRef.current && lastUsedEraserRef.current === 'eraser_pixel') {
                        canvas.requestRenderAll();
                    }

                    // Immediate cursor sync: since the overlay captures the mouse, we must
                    // reflect whatever cursor Fabric decided to show on the upperCanvas.
                    if (upperCanvasEl && overlay.style.cursor !== upperCanvasEl.style.cursor) {
                        overlay.style.cursor = upperCanvasEl.style.cursor;
                    }
                }
            };

            const onPointerUp = (e: any) => {
                const id = e.pointerId;
                if (id === penPointerId) {
                    penPointerId = -1;
                    lastPenTime = Date.now();
                }

                activePointers.delete(id);

                if (multiTouchSessionActive) {
                    // Stop multi-touch logic (pan/zoom) as soon as we drop below 2 fingers
                    if (activePointers.size < 2) {
                        isMultiTouching = false;
                        lastPinchMidpoint = null;
                    }

                    // End the session and clear trackers when ALL fingers are lifted
                    if (activePointers.size === 0) {
                        multiTouchSessionActive = false;
                        forwardedPointers.clear();
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                // Handle barrel button eraser cleanup
                if (barrelButtonErasingRef.current && forwardedPointers.has(id)) {
                    const eraserType = lastUsedEraserRef.current;

                    if (eraserType === 'eraser_pixel') {
                        // Let Fabric finalize the stroke (path:created will mark it as eraser)
                        forwardToFabric('__onMouseUp', e);
                    }
                    // For object eraser, no Fabric event was forwarded, nothing to finalize

                    forwardedPointers.delete(id);

                    // Restore saved state
                    const saved = savedBrushStateRef.current;
                    if (saved) {
                        if (saved.brush) canvas.freeDrawingBrush = saved.brush;
                        canvas.isDrawingMode = saved.isDrawingMode;
                        canvas.freeDrawingCursor = saved.freeDrawingCursor;
                        canvas.defaultCursor = saved.defaultCursor;
                        canvas.hoverCursor = saved.hoverCursor;

                        const overlay = (canvas as any).__overlayEl;
                        if (overlay) overlay.style.cursor = saved.overlayCursor;

                        const upperCanvasEl = (canvas as any).upperCanvasEl;
                        if (upperCanvasEl) upperCanvasEl.style.opacity = saved.upperCanvasOpacity;

                        savedBrushStateRef.current = null;
                    }

                    barrelButtonErasingRef.current = false;
                    canvas.requestRenderAll();
                    return;
                }

                if (forwardedPointers.has(id)) {
                    forwardToFabric('__onMouseUp', e);
                    forwardedPointers.delete(id);
                }
            };

            const onWheel = (e: any) => {
                // Manually fire the Fabric mouse:wheel event since we're using an overlay
                // This ensures all internal and external Fabric listeners are triggered.
                canvas.fire('mouse:wheel', { e: e });

                // Prevent browser native scrolling of the page
                if (e.cancelable) {
                    e.preventDefault();
                }
                e.stopPropagation();
            };

            overlay.addEventListener('pointerdown', onPointerDown, { passive: false });
            overlay.addEventListener('pointermove', onPointerMove, { passive: false });
            overlay.addEventListener('pointerup', onPointerUp, { passive: false });
            overlay.addEventListener('pointercancel', onPointerUp, { passive: false });
            overlay.addEventListener('wheel', onWheel, { passive: false });

            (canvas as any).__overlayEl = overlay;
        };

        setupInputOverlay();

        // Old listeners removed in favor of Overlay

        setTimeout(() => saveInitialSnapshot(), 100);

        canvas.on('object:added', handleObjectAddedForHistory);
        canvas.on('object:modified', handleObjectModifiedForHistory);
        canvas.on('object:removed', handleObjectRemovedForHistory);

        canvas.on('path:created', (opt: any) => {
            // Detect pixel eraser paths: either from active eraser tool OR barrel button temporary eraser
            const isPixelEraserPath = activeToolRef.current === 'eraser_pixel' ||
                (barrelButtonErasingRef.current && lastUsedEraserRef.current === 'eraser_pixel');
            if (isPixelEraserPath) {
                opt.path.set({
                    isPixelEraser: true,
                    selectable: false,
                    evented: false,
                    strokeUniform: true,
                    globalCompositeOperation: 'destination-out',
                    objectCaching: false // CRITICAL: Required for transparency-based paths
                });
            } else if ((canvas.freeDrawingBrush as any).isLaser) {
                opt.path.set({
                    isLaserObject: true,
                    selectable: false,
                    evented: false,
                    objectCaching: true
                });

                setTimeout(() => {
                    if (opt.path.canvas) {
                        opt.path.animate('opacity', 0, {
                            duration: 500,
                            onChange: canvas.requestRenderAll.bind(canvas),
                            onComplete: () => {
                                if (opt.path.canvas) {
                                    canvas.remove(opt.path);
                                    canvas.requestRenderAll();
                                }
                            }
                        });
                    }
                }, 1000);
                return;
            } else {
                opt.path.set({
                    objectCaching: true
                });
            }
            canvas.requestRenderAll();
        });

        // Selection listeners to sync toolbar with selected object
        const handleSelection = (opt: fabric.IEvent) => {
            const activeObject = opt.target;
            if (activeObject) {
                // Determine color
                let objectColor = '';
                if (activeObject.type === 'i-text' || activeObject.type === 'text') {
                    objectColor = activeObject.fill as string;
                    // Sync font properties
                    const textObj = activeObject as fabric.IText;
                    if (textObj.fontFamily) setFontFamily(textObj.fontFamily);
                    if (textObj.fontWeight) setFontWeight(textObj.fontWeight as string | number);
                    if (textObj.fontStyle) setFontStyle(textObj.fontStyle as 'normal' | 'italic');
                } else {
                    objectColor = activeObject.stroke as string;
                }

                // Determine size
                const objectSize = activeObject.strokeWidth || brushSize;

                if (objectColor) setColor(objectColor);
                if (objectSize) setBrushSize(objectSize);

                // We don't updateToolSetting here to avoid overwriting tool defaults 
                // just by selecting an object. But we update the UI.
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);

        if (initialData) {
            try {
                const json = JSON.parse(initialData);
                if (json.height) {
                    pageHeightRef.current = json.height;
                    setPageHeightState(json.height);
                    if (viewportHeightRef.current > 0) {
                        setTotalPages(Math.max(1, Math.ceil(json.height / viewportHeightRef.current)));
                    }
                }

                // Load background configuration from JSON if available
                if (json.backgroundConfig) {
                    const cfg = json.backgroundConfig as BackgroundConfig;
                    setBackground(cfg.type || 'none');
                    setBackgroundSize(cfg.size || 30);
                    setBackgroundBundleGap(cfg.bundleGap || 1);
                    setBackgroundColorIntensity(cfg.intensity !== undefined ? cfg.intensity : 0);
                    setBackgroundColorType(cfg.colorType || 'gray');
                    setLineOpacity(cfg.opacity !== undefined ? cfg.opacity : 0.1);
                    setBackgroundImageOpacity(cfg.imageOpacity !== undefined ? cfg.imageOpacity : 1.0);

                    if (cfg.type === 'image' && cfg.imageData) {
                        const img = new Image();
                        img.onload = () => setBackgroundImage(img);
                        img.src = cfg.imageData;
                    } else if (cfg.type !== 'image') {
                        setBackgroundImage(null);
                    }
                }

                canvas.loadFromJSON(json, () => {
                    // Ensure drawing mode is preserved after loading
                    const isSketchTool = ['pen', 'carbon', 'hatch', 'highlighter', 'glow', 'circle', 'laser', 'eraser_pixel'].includes(activeToolRef.current);
                    if (isSketchTool) {
                        canvas.isDrawingMode = true;
                    }

                    // Recalculate content height to ensure scrollbars appear
                    // This handles cases where height wasn't saved or content exceeds saved height
                    let maxTop = 0;

                    // Update pageRectRef to point to the newly loaded background object
                    // loadFromJSON replaces all objects, so the old ref is stale (pointing to disposed object)
                    const objects = canvas.getObjects();
                    const loadedBg = objects.find((o: any) => o.isPageBackground) as fabric.Rect;
                    if (loadedBg) {
                        pageRectRef.current = loadedBg;
                        // Enforce properties
                        loadedBg.set({ selectable: false, evented: false });
                    }

                    objects.forEach((obj: any) => {
                        // Ignore background and ui elements (Unify with preview filtering)
                        if (obj.isPageBackground || obj.isPixelEraser || obj.isObjectEraser || obj.excludeFromExport || !obj.visible) return;

                        const bound = obj.getBoundingRect(true);
                        const bottom = bound.top + bound.height;
                        if (bottom > maxTop) maxTop = bottom;
                    });

                    // Ensure page height covers at least the content
                    const viewportHeight = viewportHeightRef.current || canvas.getHeight() || 500;

                    // Tight Crop Implementation (Unified with Preview)
                    const PADDING_BOTTOM = 40;
                    const MIN_HEIGHT = 100;
                    const isNewDrawing = objects.length === 0 || (objects.length === 1 && (objects[0] as any).isPageBackground);
                    const tightHeight = isNewDrawing ? viewportHeight : Math.max(MIN_HEIGHT, maxTop + PADDING_BOTTOM);

                    pageHeightRef.current = tightHeight;
                    setPageHeightState(tightHeight);
                    if (pageRectRef.current) {
                        pageRectRef.current.set('height', tightHeight).setCoords();
                    }

                    // Force update total pages based on potentially new height
                    if (viewportHeight > 0) {
                        const finalHeight = pageHeightRef.current;
                        setTotalPages(Math.max(1, Math.ceil(finalHeight / viewportHeight)));
                    }

                    // Reset/Sync viewport transform
                    const zoom = canvas.getZoom();
                    const vpt = canvas.viewportTransform || [zoom, 0, 0, zoom, 0, 0];
                    if (typeof (canvas as any).clampVpt === 'function') (canvas as any).clampVpt(vpt);
                    canvas.setViewportTransform(vpt);

                    canvas.renderAll();
                    syncScrollToViewport();
                    saveHistory(); // Snapshot initial loaded state

                    // Mark as clean/saved after initial load
                    lastSavedIndexRef.current = historyIndexRef.current;
                });
            } catch (e) {
                console.error("Failed to load fabric JSON", e);
            }
        }

        return () => {
            const overlay = (canvas as any).__overlayEl;
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if ((canvas as any).__cursorObserver) {
                (canvas as any).__cursorObserver.disconnect();
            }
            if ((canvas as any)._contextMenuCleanup) {
                (canvas as any)._contextMenuCleanup();
            }

            resizeObserver.disconnect();
            canvas.off('object:added', handleObjectAddedForHistory);
            canvas.off('object:modified', handleObjectModifiedForHistory);
            canvas.off('object:removed', handleObjectRemovedForHistory);
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
        // Removed unnecessary deps to only run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const handlePalettePickerClose = () => {
        setIsPalettePickerOpen(false);
        setEditingPaletteIndex(null);
        setPaletteEditingColorIndex(null);
    };

    const handlePaletteSelect = (index: number) => {
        setSelectedPaletteIndex(index);
        setEditingPaletteIndex(null);
    };

    const handlePaletteDoubleTap_Local = (index: number) => {
        setActivePaletteIndex(index);
        setSelectedPaletteIndex(index);
        handlePalettePickerClose();
    };

    const handlePaletteOk = () => {
        setActivePaletteIndex(selectedPaletteIndex);
        handlePalettePickerClose();
    };

    const handlePaletteEditStart = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setEditingPaletteIndex(index);
        setPaletteTempColors([...palettes[index]]);
        setPaletteEditingColorIndex(0); // Start editing the first color
        setSelectedPaletteIndex(index);
    };

    const handlePaletteEditSave = () => {
        if (editingPaletteIndex !== null) {
            const newPalettes = [...palettes];
            newPalettes[editingPaletteIndex] = [...paletteTempColors];
            setPalettes(newPalettes);
            setEditingPaletteIndex(null);
            setPaletteEditingColorIndex(null);
        }
    };

    const handlePaletteEditCancel = () => {
        setEditingPaletteIndex(null);
        setPaletteEditingColorIndex(null);
    };

    const handlePaletteReset = (index: number) => {
        const newPalettes = [...palettes];
        newPalettes[index] = [...INITIAL_PALETTES[index]];
        setPalettes(newPalettes);
        if (editingPaletteIndex === index) {
            setPaletteTempColors([...INITIAL_PALETTES[index]]);
        }
    };

    const handleBrushSizeDoubleClick = (e: React.MouseEvent | React.TouchEvent, index: number) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSettingsAnchor({
            top: rect.bottom + 5
        });
        setEditingSizeIndex(index);
        setTempSize(availableBrushSizes[index]);
        openedTimeRef.current = Date.now();
        setIsSizeEditOpen(true);
    };

    const handleSizeOk = () => {
        setSettingsAnchor(null);
        if (editingSizeIndex !== null) {
            const newSizes = [...availableBrushSizes];
            newSizes[editingSizeIndex] = tempSize;
            setAvailableBrushSizes(newSizes);

            setBrushSize(tempSize);
            updateToolSetting(undefined, tempSize);

            setIsSizeEditOpen(false);
            setEditingSizeIndex(null);
            lastInteractionTimeRef.current = Date.now();
        }
    };

    const handleSizeReset = () => {
        if (editingSizeIndex !== null) {
            setTempSize(INITIAL_BRUSH_SIZES[editingSizeIndex]);
        }
    };

    const handleSizeCancel = () => {
        setSettingsAnchor(null);
        setIsSizeEditOpen(false);
        setEditingSizeIndex(null);
    };

    const handleShapeToolDoubleClick = (e: React.MouseEvent | React.TouchEvent, itemId: string, toolId: string) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSettingsAnchor({
            top: rect.bottom + 5
        });
        setEditingShapeItemId(itemId);
        const style = shapeStyles[toolId] || DEFAULT_SHAPE_STYLE;
        const currentIndex = DASH_OPTIONS.findIndex(d => JSON.stringify(d) === JSON.stringify(style.dashArray));
        setTempDashIndex(currentIndex === -1 ? 0 : currentIndex);
        setTempShapeOpacity(style.opacity);
        setTempHeadSize(style.headSize || 20);
        setIsShapeSettingsOpen(true);
    };

    const handleShapeSettingsOk = () => {
        setSettingsAnchor(null);
        if (activeTool) {
            setShapeStyles(prev => ({
                ...prev,
                [activeTool]: {
                    dashArray: DASH_OPTIONS[tempDashIndex],
                    opacity: tempShapeOpacity,
                    headSize: tempHeadSize
                }
            }));

            // Update toolbar item icon if we were editing a specific slot
            if (editingShapeItemId) {
                setToolbarItems(prev => prev.map(item =>
                    item.id === editingShapeItemId
                        ? { ...item, toolId: activeTool as any }
                        : item
                ));
            }
        }
        setIsShapeSettingsOpen(false);
        setEditingShapeItemId(null);
    };

    const handleShapeSettingsReset = () => {
        setTempDashIndex(0);
        setTempShapeOpacity(100);
        setTempHeadSize(20);
    };

    const handleShapeSettingsCancel = () => {
        setSettingsAnchor(null);
        setIsShapeSettingsOpen(false);
        setEditingShapeItemId(null);
    };

    const handlePenDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSettingsAnchor({
            top: rect.bottom + 5
        });
        setTempBrushType(brushType);
        setTempDrawWithFinger(drawWithFinger);
        openedTimeRef.current = Date.now();
        setIsPenEditOpen(true);
    };

    /**
     * RGB Parsing Helpers
     */
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
        const toHex = (c: number) => {
            const hex = Math.max(0, Math.min(255, c)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
    };

    const handlePenOk = () => {
        updateToolSetting(undefined, undefined, tempBrushType);
        setDrawWithFinger(tempDrawWithFinger);
        setSettingsAnchor(null);
        setIsPenEditOpen(false);
        lastInteractionTimeRef.current = Date.now();
    };

    const handlePenReset = () => {
        setTempBrushType('pen');
        setTempDrawWithFinger(true);
    };

    const handlePenCancel = () => {
        setSettingsAnchor(null);
        setIsPenEditOpen(false);
        setTempBrushType(brushType);
        setTempDrawWithFinger(drawWithFinger);
    };

    const handleFontCancel = () => {
        setSettingsAnchor(null);
        setIsFontEditOpen(false);
    };

    const handleTextDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSettingsAnchor({
            top: rect.bottom + 5
        });
        setTempFontFamily(fontFamily);
        setTempFontWeight(fontWeight);
        setTempFontStyle(fontStyle);
        openedTimeRef.current = Date.now();
        setIsFontEditOpen(true);
    };

    const handleFontOk = () => {
        setFontFamily(tempFontFamily);
        setFontWeight(tempFontWeight);
        setFontStyle(tempFontStyle);
        setSettingsAnchor(null);
        setIsFontEditOpen(false);
        lastInteractionTimeRef.current = Date.now();
    };


    const renderToolbarItem = (item: ToolbarItem) => {
        return (
            <div
                key={item.id}
                style={{
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                {item.type === 'tool' && (
                    <ToolButton
                        $active={activeToolItemId === item.id}
                        onClick={() => handleToolSelect(item.id, item.type, item.toolId!)}
                        onDoubleClick={(e) => {
                            if (item.toolId === 'pen') {
                                handlePenDoubleClick(e);
                            } else if (item.toolId === 'text') {
                                handleTextDoubleClick(e);
                            } else if (['line', 'arrow', 'rect', 'circle', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star'].includes(item.toolId!)) {
                                handleShapeToolDoubleClick(e, item.id, item.toolId!);
                            }
                        }}
                        onTouchStart={(e) => {
                            if (item.toolId === 'pen') {
                                handleDoubleTap(e, `tool - ${item.toolId} `, (ev) => handlePenDoubleClick(ev));
                            } else if (item.toolId === 'text') {
                                handleDoubleTap(e, `tool - ${item.toolId} `, (ev) => handleTextDoubleClick(ev));
                            } else if (['line', 'arrow', 'rect', 'circle', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star'].includes(item.toolId!)) {
                                handleDoubleTap(e, `tool - ${item.toolId} `, (ev) => handleShapeToolDoubleClick(ev, item.id, item.toolId!));
                            }
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        title={(t.drawing as any)?.[`tool_${item.toolId} `] || (item.toolId ?? '').charAt(0).toUpperCase() + (item.toolId ?? '').slice(1)}
                    >
                        {item.toolId === 'pen' ? (
                            (() => {
                                const slotId = (item.id === 'pen' || item.id === 'pen_1') ? 'pen_1' : (item.id === 'pen_2' ? 'pen_2' : (item.id === 'pen_3' ? 'pen_3' : (item.id === 'pen_4' ? 'pen_4' : 'pen_1')));
                                const settings = penSlotSettings[slotId];
                                const typeToCheck = settings ? settings.brushType : 'pen';

                                switch (typeToCheck) {
                                    case 'pen': return <PenIcon />;
                                    case 'carbon': return <PencilIcon />;

                                    case 'hatch': return <HatchIcon />;
                                    case 'highlighter': return <HighlighterIcon />;

                                    case 'circle': return <CircleBrushIcon />;
                                    case 'glow': return <GlowIcon />;
                                    case 'laser': return <LaserIcon />;
                                    default: return <PenIcon />;
                                }
                            })()
                        ) : (
                            <>
                                {item.toolId === 'select' && <FiMousePointer size={16} />}
                                {item.toolId === 'line' && <FiMinus size={16} style={{ transform: 'rotate(-45deg)' }} />}
                                {item.toolId === 'arrow' && <FiArrowDown size={16} style={{ transform: 'rotate(-135deg)' }} />}
                                {item.toolId === 'rect' && <FiSquare size={16} />}
                                {item.toolId === 'circle' && <FiCircle size={16} />}
                                {item.toolId === 'ellipse' && <EllipseIcon />}
                                {item.toolId === 'triangle' && <FiTriangle size={16} />}
                                {item.toolId === 'diamond' && <DiamondIcon />}
                                {item.toolId === 'pentagon' && <PentagonIcon />}
                                {item.toolId === 'hexagon' && <HexagonIcon />}
                                {item.toolId === 'octagon' && <OctagonIcon />}
                                {item.toolId === 'star' && <StarIcon />}
                                {item.toolId === 'text' && <FiType size={16} />}
                                {item.toolId === 'eraser_pixel' && <PixelEraserIcon />}
                                {item.toolId === 'eraser_object' && <ObjectEraserIcon />}
                                {item.toolId === 'laser' && <LaserIcon />}
                            </>
                        )}
                    </ToolButton>
                )}

                {item.type === 'action' && (
                    <>
                        {item.actionId === 'undo' && (
                            <ToolButton onClick={handleUndo} title={`${t.drawing?.undo || 'Undo'} (Ctrl + Z)`} disabled={!canUndo || isSaving}>
                                <FiRotateCcw size={16} />
                            </ToolButton>
                        )}
                        {item.actionId === 'redo' && (
                            <ToolButton onClick={handleRedo} title={`${t.drawing?.redo || 'Redo'} (Ctrl + Y)`} disabled={!canRedo || isSaving}>
                                <FiRotateCw size={16} />
                            </ToolButton>
                        )}
                        {item.actionId === 'download_png' && (
                            <ToolButton onClick={handleDownloadPNG} title={t.drawing?.download || 'Download as PNG'} disabled={isSaving}>
                                <FiDownload size={16} />
                            </ToolButton>
                        )}
                        {item.actionId === 'clear' && (
                            <ToolButton onClick={() => setIsClearConfirmOpen(true)} title={t.drawing?.clear_all || 'Clear All'} disabled={isSaving}>
                                <FiTrash2 size={16} />
                            </ToolButton>
                        )}
                        {item.actionId === 'fullscreen' && (
                            <ToolButton onClick={toggleFullscreen} title={isFullscreen ? (t.drawing?.exit_fullscreen || 'Exit Fullscreen') : (t.drawing?.enter_fullscreen || 'Fullscreen')}>
                                {isFullscreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
                            </ToolButton>
                        )}
                        {item.actionId === 'background' && (
                            <div style={{ position: 'relative', display: 'flex' }}>
                                <ToolButton
                                    $active={isBgPickerOpen}
                                    onClick={(e) => {
                                        if (!isBgPickerOpen) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setSettingsAnchor({ top: rect.bottom + 5 });
                                            prevBackgroundStateRef.current = {
                                                type: background,
                                                color: backgroundColor,
                                                opacity: lineOpacity,
                                                size: backgroundSize,
                                                intensity: backgroundColorIntensity,
                                                colorType: backgroundColorType,
                                                bundleGap: backgroundBundleGap,
                                                image: backgroundImage || undefined,
                                                imageOpacity: backgroundImageOpacity
                                            };
                                            setIsBgPickerOpen(true);
                                            openedTimeRef.current = Date.now();
                                        } else {
                                            setIsBgPickerOpen(false);
                                            setSettingsAnchor(null);
                                        }
                                    }}
                                    title={t.drawing?.bg_settings || 'Background'}
                                >
                                    <BackgroundIcon />
                                </ToolButton>
                            </div>
                        )}
                    </>
                )}

                {item.type === "color" && (
                    <div style={{
                        padding: '0 4px',
                        display: 'flex',
                        alignItems: 'center',
                        height: '28px'
                    }}>
                        <ColorButton
                            $color={availableColors[item.colorIndex!]}
                            $selected={color === availableColors[item.colorIndex!] && !activeTool.startsWith('eraser')}
                            onClick={() => {
                                const c = availableColors[item.colorIndex!];
                                setColor(c);
                                updateToolSetting(c, undefined);
                                if (activeTool.startsWith('eraser')) {
                                    setActiveTool('pen');
                                }
                            }}
                            title={`${t.drawing?.select_color || 'Select Color'}: ${availableColors[item.colorIndex!]} `}
                        />
                    </div>
                )}

                {item.type === "size" && (
                    <ToolButton
                        $active={brushSize === availableBrushSizes[item.sizeIndex!]}
                        onClick={() => {
                            const s = availableBrushSizes[item.sizeIndex!];
                            setBrushSize(s);
                            updateToolSetting(undefined, s);
                        }}
                        onDoubleClick={(e) => handleBrushSizeDoubleClick(e, item.sizeIndex!)}
                        onTouchStart={(e) => handleDoubleTap(e, `size - ${item.sizeIndex} `, (ev) => handleBrushSizeDoubleClick(ev, item.sizeIndex!))}
                        style={{ width: 26, fontSize: '0.8rem', padding: 0 }}
                        title={`${t.drawing?.brush_size || 'Size'}: ${availableBrushSizes[item.sizeIndex!]} px`}
                    >
                        <div style={{
                            width: Math.min(availableBrushSizes[item.sizeIndex!], 20),
                            height: Math.min(availableBrushSizes[item.sizeIndex!], 20),
                            borderRadius: '50%',
                            background: '#333'
                        }} />
                    </ToolButton>
                )}

                {item.type === 'action' && item.actionId === 'palette' && (
                    <ToolButton
                        $active={isPalettePickerOpen}
                        onClick={() => setIsPalettePickerOpen(true)}
                        title={t.drawing?.select_palette || 'Select Palette'}
                    >
                        <PaletteIcon />
                    </ToolButton>
                )}
            </div >
        );
    };

    // Shape Drawing Handlers
    const handleShapeMouseDown = React.useCallback((opt: fabric.IEvent) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const pointer = canvas.getPointer(opt.e);
        isDrawingRef.current = true;
        startPointRef.current = { x: pointer.x, y: pointer.y };

        let shape: fabric.Object | null = null;
        const currentStyle = shapeStyles[activeTool] || DEFAULT_SHAPE_STYLE;
        const commonProps = {
            stroke: color,
            strokeWidth: brushSize,
            strokeDashArray: currentStyle.dashArray,
            opacity: currentStyle.opacity / 100,
            fill: 'transparent',
            left: pointer.x,
            top: pointer.y,
            selectable: false, // Initially false while drawing
            evented: false,
            objectCaching: true, // Enable caching for better performance on mobile
        };

        if (activeTool === 'line' || activeTool === 'arrow') {
            shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                ...commonProps,
                strokeLineCap: 'round'
            });
            if (activeTool === 'arrow') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (shape as any).hasArrow = true;
                // ArrowHead will be created on mouse up, not during preview
            }
        } else if (activeTool === 'rect') {
            shape = new fabric.Rect({
                ...commonProps,
                width: 0,
                height: 0,
            });
        } else if (activeTool === 'circle') {
            shape = new fabric.Circle({
                ...commonProps,
                radius: 0,
            });
        } else if (activeTool === 'triangle') {
            shape = new fabric.Triangle({
                ...commonProps,
                width: 0,
                height: 0,
            });
        } else if (activeTool === 'ellipse') {
            shape = new fabric.Ellipse({
                ...commonProps,
                rx: 0,
                ry: 0,
            });
        } else if (['diamond', 'pentagon', 'hexagon', 'octagon', 'star'].includes(activeTool)) {
            shape = new fabric.Polygon([
                new fabric.Point(0, 0),
                new fabric.Point(0, 0),
                new fabric.Point(0, 0),
                new fabric.Point(0, 0)
            ], {
                ...commonProps,
                originX: 'center',
                originY: 'center',
                isCustomPolygon: true,
                polyType: activeTool
            } as any);
        }

        if (shape) {
            activeShapeRef.current = shape;
            canvas.add(shape);
            canvas.requestRenderAll(); // Manually render since renderOnAddRemove is false
        }
    }, [activeTool, color, brushSize, shapeStyles]);

    const handleShapeMouseMove = React.useCallback((opt: fabric.IEvent) => {
        if (!isDrawingRef.current || !activeShapeRef.current || !startPointRef.current) return;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const pointer = canvas.getPointer(opt.e);
        const start = startPointRef.current;
        const shape = activeShapeRef.current;

        const left = Math.min(start.x, pointer.x);
        const top = Math.min(start.y, pointer.y);
        const width = Math.abs(pointer.x - start.x);
        const height = Math.abs(pointer.y - start.y);

        if (activeTool === 'line' || activeTool === 'arrow') {
            (shape as fabric.Line).set({ x2: pointer.x, y2: pointer.y });

            if (activeTool === 'arrow') {
                // Calculate arrow head points for final creation (not preview)
                const x2 = Math.round(pointer.x);
                const y2 = Math.round(pointer.y);
                const headAngle = Math.PI / 6;

                const start = startPointRef.current!;
                const angle = Math.atan2(y2 - Math.round(start.y), x2 - Math.round(start.x));
                const currentStyle = shapeStyles['arrow'] || DEFAULT_SHAPE_STYLE;
                const headLength = Math.round(currentStyle.headSize || Math.max(12, brushSize * 3));

                const x3 = Math.round(x2 - headLength * Math.cos(angle - headAngle));
                const y3 = Math.round(y2 - headLength * Math.sin(angle - headAngle));
                const x4 = Math.round(x2 - headLength * Math.cos(angle + headAngle));
                const y4 = Math.round(y2 - headLength * Math.sin(angle + headAngle));

                (shape as any).arrowHead = [new fabric.Point(x3, y3), new fabric.Point(x2, y2), new fabric.Point(x4, y4)];

                // Update the line part
                (shape as fabric.Line).set({ x2: x2, y2: y2 });
            }
        } else if (activeTool === 'rect') {
            shape.set({ left, top, width, height });
        } else if (activeTool === 'circle') {
            const radius = Math.max(width, height) / 2;
            const circleLeft = start.x + (pointer.x < start.x ? -radius * 2 : 0);
            const circleTop = start.y + (pointer.y < start.y ? -radius * 2 : 0);
            (shape as fabric.Circle).set({
                radius,
                left: circleLeft,
                top: circleTop
            });
        } else if (activeTool === 'triangle') {
            shape.set({ left, top, width, height });
        } else if (activeTool === 'ellipse') {
            (shape as fabric.Ellipse).set({
                rx: width / 2,
                ry: height / 2,
                left,
                top
            });
        } else if ((shape as any).isCustomPolygon) {
            const hw = width / 2;
            const hh = height / 2;
            const polyType = (shape as any).polyType;
            let points: fabric.Point[] = [];

            if (polyType === 'diamond') {
                points = [
                    new fabric.Point(0, -hh), // Top
                    new fabric.Point(hw, 0),   // Right
                    new fabric.Point(0, hh),  // Bottom
                    new fabric.Point(-hw, 0)   // Left
                ];
            } else if (polyType === 'pentagon') {
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                    points.push(new fabric.Point(hw * Math.cos(angle), hh * Math.sin(angle)));
                }
            } else if (polyType === 'hexagon') {
                for (let i = 0; i < 6; i++) {
                    const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
                    points.push(new fabric.Point(hw * Math.cos(angle), hh * Math.sin(angle)));
                }
            } else if (polyType === 'octagon') {
                for (let i = 0; i < 8; i++) {
                    const angle = (i * 2 * Math.PI / 8) - Math.PI / 2;
                    points.push(new fabric.Point(hw * Math.cos(angle), hh * Math.sin(angle)));
                }
            } else if (polyType === 'star') {
                const outerRadiusX = hw;
                const outerRadiusY = hh;
                const innerRadiusX = hw * 0.4;
                const innerRadiusY = hh * 0.4;
                for (let i = 0; i < 10; i++) {
                    const angle = (i * Math.PI / 5) - Math.PI / 2;
                    const rx = i % 2 === 0 ? outerRadiusX : innerRadiusX;
                    const ry = i % 2 === 0 ? outerRadiusY : innerRadiusY;
                    points.push(new fabric.Point(rx * Math.cos(angle), ry * Math.sin(angle)));
                }
            }

            (shape as fabric.Polygon).set({
                points,
                left: left + hw,
                top: top + hh,
                width,
                height,
                pathOffset: new fabric.Point(0, 0)
            });
        }

        shape.setCoords();
        canvas.requestRenderAll();
    }, [activeTool]);

    const handleShapeMouseUp = React.useCallback(() => {
        isDrawingRef.current = false;
        if (activeShapeRef.current) {
            const shape = activeShapeRef.current;

            // If it's an arrow, we might want to convert it to a Path or Group for permanent storage
            if (activeTool === 'arrow' && (shape as fabric.Line).x1 !== undefined) {
                const line = shape as fabric.Line;
                const x1 = Math.round(line.x1!);
                const y1 = Math.round(line.y1!);
                const x2 = Math.round(line.x2!);
                const y2 = Math.round(line.y2!);

                const angle = Math.atan2(y2 - y1, x2 - x1);
                const currentStyle = shapeStyles[activeTool] || DEFAULT_SHAPE_STYLE;
                const headLength = Math.round(currentStyle.headSize || Math.max(12, brushSize * 3));
                const headAngle = Math.PI / 6;

                const x3 = Math.round(x2 - headLength * Math.cos(angle - headAngle));
                const y3 = Math.round(y2 - headLength * Math.sin(angle - headAngle));
                const x4 = Math.round(x2 - headLength * Math.cos(angle + headAngle));
                const y4 = Math.round(y2 - headLength * Math.sin(angle + headAngle));
                const canvas = fabricCanvasRef.current;

                if (canvas) {
                    canvas.remove(shape);

                    // Calculate minimal point to use as group origin for precision
                    const minX = Math.min(x1, x2, x3, x4);
                    const minY = Math.min(y1, y2, y3, y4);

                    // Line part (can be dashed)
                    const linePart = new fabric.Line([x1 - minX, y1 - minY, x2 - minX, y2 - minY], {
                        stroke: color,
                        strokeWidth: brushSize,
                        strokeDashArray: currentStyle.dashArray,
                        strokeLineCap: 'round',
                        originX: 'left',
                        originY: 'top',
                        left: x1 < x2 ? 0 : x1 - x2 // This is handled by Line, but let's be careful
                    });
                    // Re-set absolute positioning for Line based on the parent group's left/top
                    linePart.set({ left: Math.min(x1, x2) - minX, top: Math.min(y1, y2) - minY });

                    // Head part (always solid)
                    const headPart = new fabric.Polyline([
                        new fabric.Point(x3 - minX, y3 - minY),
                        new fabric.Point(x2 - minX, y2 - minY),
                        new fabric.Point(x4 - minX, y4 - minY)
                    ], {
                        stroke: color,
                        strokeWidth: brushSize,
                        strokeDashArray: undefined,
                        fill: 'transparent',
                        strokeLineCap: 'round',
                        strokeLineJoin: 'round',
                        originX: 'left',
                        originY: 'top',
                        left: Math.min(x2, x3, x4) - minX,
                        top: Math.min(y2, y3, y4) - minY
                    });

                    const arrowGroup = new fabric.Group([linePart, headPart], {
                        selectable: false,
                        evented: true,
                        isArrow: true,
                        opacity: (currentStyle.opacity || 100) / 100,
                        left: minX,
                        top: minY,
                        originX: 'left',
                        originY: 'top',
                        objectCaching: true // Enable caching for better performance
                    } as any);

                    canvas.add(arrowGroup);
                    canvas.requestRenderAll(); // Manually render since renderOnAddRemove is false
                }
            }

            if (arrowHeadPreviewRef.current) {
                const canvas = fabricCanvasRef.current;
                if (canvas) canvas.remove(arrowHeadPreviewRef.current);
                arrowHeadPreviewRef.current = null;
            }

            activeShapeRef.current.setCoords();
            activeShapeRef.current = null;
        }
    }, [activeTool, color, brushSize, shapeStyles]);

    const handleClear = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // Remove all objects but preserve background
        // iterating backwards or using a copy is safer when removing
        const objects = canvas.getObjects();
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            if (!(obj as any).isPageBackground) {
                canvas.remove(obj);
            }
        }
        canvas.requestRenderAll();

        // Restore Background Color
        // The background is now set via the useEffect hook, which will re-run and apply the pattern
        // canvas.setBackgroundColor(backgroundColor, () => {
        //     // Restore Overlay Pattern (Grid/Lines) if active
        //     if (background !== 'none') {
        //         const pat = createBackgroundPattern(background, backgroundColor, lineOpacity, backgroundSize, true, backgroundBundleGap);
        //         const gridPattern = new fabric.Pattern(pat as any);
        //         canvas.setOverlayColor(gridPattern as any, canvas.renderAll.bind(canvas));
        //     } else {
        //         canvas.renderAll();
        //     }
        // });

        // Restore drawing context settings
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.color = color;
            canvas.freeDrawingBrush.width = brushSize;
            if (activeTool === 'eraser_pixel' || activeTool === 'eraser_object') {
                // If eraser was active, ensure it's still configured or reset to pen if desired?
                // Let's keep current tool active.
            }
        }

        saveHistory();
    };

    const handleDownloadPNG = async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timestamp = `${year}${month}${day} -${hours}${minutes}${seconds} `;
        const defaultBaseName = `drawing - ${timestamp} `;

        // Temporarily apply background pattern to canvas for clean export
        const oldClipPath = canvas.clipPath;
        const width = canvas.getWidth();

        // Create a temporary pattern for export that includes the background color
        const patternObj = createBackgroundPattern(background, currentBackgroundColor, lineOpacity, backgroundSize, false, backgroundBundleGap, backgroundImage || undefined, backgroundImageOpacity, width);

        // Export composite: Background layer + Transparent drawing layer
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.getWidth();
        exportCanvas.height = canvas.getHeight();
        const ctx = exportCanvas.getContext('2d');

        if (ctx) {
            // 1. Draw Background
            const patSource = (patternObj as fabric.Pattern).source;
            if (patSource instanceof HTMLCanvasElement || patSource instanceof HTMLImageElement) {
                const pat = ctx.createPattern(patSource, (patternObj as fabric.Pattern).repeat || 'repeat');
                if (pat) {
                    ctx.fillStyle = pat;
                    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                }
            }
            // 2. Overlay Drawing (transparent drawing canvas)
            ctx.drawImage(canvas.getElement(), 0, 0);

            const dataURL = exportCanvas.toDataURL('image/png', 1.0);

            // Handle Saving/Downloading
            if ('showSaveFilePicker' in window) {
                (async () => {
                    try {
                        const handle = await (window as any).showSaveFilePicker({
                            suggestedName: `${defaultBaseName}.png`,
                            types: [{
                                description: 'PNG Image',
                                accept: { 'image/png': ['.png'] },
                            }],
                        });
                        const response = await fetch(dataURL);
                        const blob = await response.blob();
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                    } catch (err: any) {
                        if (err.name !== 'AbortError') {
                            fallbackDownload(dataURL);
                        }
                    }
                })();
            } else {
                fallbackDownload(dataURL);
            }
        }

        function fallbackDownload(url: string) {
            const fileName = window.prompt(t.drawing?.enter_filename || 'Enter filename:', defaultBaseName);
            if (fileName === null) return;
            const finalFileName = fileName.trim() || defaultBaseName;
            const link = document.createElement('a');
            link.download = finalFileName.endsWith('.png') ? finalFileName : `${finalFileName}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        canvas.clipPath = oldClipPath;
        canvas.requestRenderAll();
        return;
    };

    // Helper to rebuild canvas from history actions up to a given index
    const rebuildCanvasFromHistory = React.useCallback((targetIndex: number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // Find the most recent snapshot before or at targetIndex
        let snapshotIndex = -1;
        for (let i = targetIndex; i >= 0; i--) {
            if (historyRef.current[i].type === 'snapshot') {
                snapshotIndex = i;
                break;
            }
        }

        if (snapshotIndex === -1) {
            console.warn('No snapshot found in history');
            return;
        }

        const snapshot = historyRef.current[snapshotIndex].snapshot;
        if (!snapshot) return;

        canvas.loadFromJSON(JSON.parse(snapshot), () => {
            // Apply incremental actions from snapshot+1 to targetIndex
            for (let i = snapshotIndex + 1; i <= targetIndex; i++) {
                const action = historyRef.current[i];
                if (action.type === 'add' && action.objectJson) {
                    fabric.util.enlivenObjects([JSON.parse(action.objectJson)], (objects: fabric.Object[]) => {
                        if (objects[0]) {
                            const obj = objects[0];
                            if (action.objectId) {
                                (obj as any).__historyId = action.objectId;
                                objectIdMapRef.current.set(obj, action.objectId);
                            }
                            canvas.add(obj);
                        }
                    }, 'fabric');
                } else if (action.type === 'remove' && action.objectId) {
                    const toRemove = canvas.getObjects().find(o => (o as any).__historyId === action.objectId);
                    if (toRemove) canvas.remove(toRemove);
                } else if (action.type === 'modify' && action.objectJson && action.objectId) {
                    // For modify, remove old and add new
                    const toModify = canvas.getObjects().find(o => (o as any).__historyId === action.objectId);
                    if (toModify) canvas.remove(toModify);
                    fabric.util.enlivenObjects([JSON.parse(action.objectJson)], (objects: fabric.Object[]) => {
                        if (objects[0]) {
                            const obj = objects[0];
                            (obj as any).__historyId = action.objectId;
                            objectIdMapRef.current.set(obj, action.objectId!);
                            canvas.add(obj);
                        }
                    }, 'fabric');
                }
            }
            canvas.requestRenderAll();
            isUndoRedoRef.current = false;
            setCanUndo(targetIndex > 0);
            setCanRedo(targetIndex < historyRef.current.length - 1);
        });
    }, []);

    const handleUndo = React.useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || historyIndexRef.current <= 0) return;

        isUndoRedoRef.current = true;
        const currentAction = historyRef.current[historyIndexRef.current];

        // Fast path for simple actions (don't need to rebuild entire canvas)
        if (currentAction.type === 'add' && currentAction.objectId) {
            // Undo add = remove the object
            const toRemove = canvas.getObjects().find(o => (o as any).__historyId === currentAction.objectId);
            if (toRemove) {
                canvas.remove(toRemove);
                canvas.requestRenderAll();
                historyIndexRef.current--;
                isUndoRedoRef.current = false;
                setCanUndo(historyIndexRef.current > 0);
                setCanRedo(true);
                return;
            }
        } else if (currentAction.type === 'remove' && currentAction.objectJson && currentAction.objectId) {
            // Undo remove = re-add the object
            fabric.util.enlivenObjects([JSON.parse(currentAction.objectJson)], (objects: fabric.Object[]) => {
                if (objects[0]) {
                    const obj = objects[0];
                    (obj as any).__historyId = currentAction.objectId;
                    objectIdMapRef.current.set(obj, currentAction.objectId!);
                    canvas.add(obj);
                    canvas.requestRenderAll();
                }
                historyIndexRef.current--;
                isUndoRedoRef.current = false;
                setCanUndo(historyIndexRef.current > 0);
                setCanRedo(true);
            }, 'fabric');
            return;
        }

        // For modify/snapshot or failed fast path, rebuild from history
        historyIndexRef.current--;
        rebuildCanvasFromHistory(historyIndexRef.current);
    }, [rebuildCanvasFromHistory]);

    const handleRedo = React.useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

        isUndoRedoRef.current = true;
        historyIndexRef.current++;
        const action = historyRef.current[historyIndexRef.current];

        // Fast path for simple actions
        if (action.type === 'add' && action.objectJson && action.objectId) {
            // Redo add = add the object back
            fabric.util.enlivenObjects([JSON.parse(action.objectJson)], (objects: fabric.Object[]) => {
                if (objects[0]) {
                    const obj = objects[0];
                    (obj as any).__historyId = action.objectId;
                    objectIdMapRef.current.set(obj, action.objectId!);
                    canvas.add(obj);
                    canvas.requestRenderAll();
                }
                isUndoRedoRef.current = false;
                setCanUndo(true);
                setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
            }, 'fabric');
            return;
        } else if (action.type === 'remove' && action.objectId) {
            // Redo remove = remove the object
            const toRemove = canvas.getObjects().find(o => (o as any).__historyId === action.objectId);
            if (toRemove) {
                canvas.remove(toRemove);
                canvas.requestRenderAll();
                isUndoRedoRef.current = false;
                setCanUndo(true);
                setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
                return;
            }
        }

        // For modify/snapshot or failed fast path, rebuild from history
        rebuildCanvasFromHistory(historyIndexRef.current);
    }, [rebuildCanvasFromHistory]);

    const handleExtendHeight = React.useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || backgroundRef.current === 'image') return;

        const currentHeight = pageHeightRef.current;
        const viewportHeight = viewportHeightRef.current || window.innerHeight || 400;
        const extendAmount = viewportHeight;
        const newHeight = currentHeight + extendAmount;

        // Update logical height only. 
        // DO NOT increase canvas element height beyond viewport height 
        // to keep panning (viewportTransform) working correctly.
        pageHeightRef.current = newHeight;
        setPageHeightState(newHeight);

        // Synchronously update background rect height to avoid gray screen
        if (pageRectRef.current) {
            pageRectRef.current.set('height', newHeight).setCoords();
        }

        // Ensure canvas.height matches the VIEWPORT visible height
        const viewportArea = canvasViewportRef.current;
        if (viewportArea) {
            const viewportH = viewportArea.clientHeight;
            if (canvas.getHeight() !== viewportH) {
                canvas.setHeight(viewportH);
            }
        }

        // Update clip path to reflect new height
        if (canvas.clipPath) {
            canvas.clipPath.set('height', newHeight);
        }

        // Update total pages count
        setTotalPages(Math.min(maxPagesRef.current, Math.ceil(newHeight / viewportHeight)));

        // Note: Background Rect height is handled via useEffect dependency on pageHeightState

        // Sync existing eraser marks (no solid bg here, keep it transparent for CSS grid)
        const eraserPattern = createBackgroundPattern(background, currentBackgroundColor, lineOpacity, backgroundSize, false, backgroundBundleGap, backgroundImage || undefined, backgroundImageOpacity, canvas.getWidth());
        const objects = canvas.getObjects();

        for (let i = 0, len = objects.length; i < len; i++) {
            const obj = objects[i] as any;
            if (obj.isPixelEraser) {
                obj.set('stroke', eraserPattern as any);
            }
        }

        // Just request render, don't save history for auto-extension to keep it seamless
        canvas.renderAll(); // Use renderAll to ensure immediate visibility of new background
    }, [background, currentBackgroundColor, lineOpacity, backgroundSize, backgroundBundleGap, backgroundImage, backgroundImageOpacity]);

    // Auto-extend canvas height
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        let isExtending = false; // Debounce flag

        const checkAndExtend = (obj: any) => {
            if (!obj || obj.top === undefined) return;
            // Disable extension if background is an image or PDF
            if (backgroundRef.current === 'image') return;

            // Skip background, eraser marks, and other utility objects
            if (obj === pageRectRef.current || obj.isPixelEraser || obj.isObjectEraser || obj.excludeFromExport) return;

            // Skip during initial load
            if (isInitialLoadRef.current) return;
            // Skip if undo/redo operation in progress
            if (isUndoRedoRef.current) return;
            // Skip if already extending
            if (isExtending) return;

            const viewportHeight = viewportHeightRef.current || canvas.getHeight() || window.innerHeight || 600;

            const maxAllowedHeight = maxPagesRef.current * viewportHeight;
            if (pageHeightRef.current >= maxAllowedHeight - 5) return;

            const logicalContentHeight = pageHeightRef.current;
            const objHeight = (obj.height || 0) * (obj.scaleY || 1);
            const objBottom = (obj.top || 0) + objHeight;

            // Threshold: If object bottom is within 1/2 viewport height of the current page bottom, extend.
            // This ensures meaningful auto-growth while typing/drawing near the bottom.
            const threshold = viewportHeight / 2;
            if (objBottom > logicalContentHeight - threshold) {
                isExtending = true;
                handleExtendHeight();
                // Reset flag after a short delay to prevent rapid re-triggering
                setTimeout(() => {
                    isExtending = false;
                }, 500);
            }
        };

        const onObjectAdded = (e: any) => checkAndExtend(e.target);
        const onObjectModified = (e: any) => checkAndExtend(e.target);
        const onPathCreated = (e: any) => checkAndExtend(e.path);

        canvas.on('object:added', onObjectAdded);
        canvas.on('object:modified', onObjectModified);
        canvas.on('path:created', onPathCreated);

        return () => {
            canvas.off('object:added', onObjectAdded);
            canvas.off('object:modified', onObjectModified);
            canvas.off('path:created', onPathCreated);
        };
    }, [handleExtendHeight]);

    // Track current page based on scroll position
    useEffect(() => {
        const vScroll = verticalScrollRef.current;
        if (!vScroll) return;

        let rafId: number;
        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);

            rafId = requestAnimationFrame(() => {
                const vs = verticalScrollRef.current;
                if (!vs) return;

                const scrollTop = vs.scrollTop;
                const zoom = fabricCanvasRef.current?.getZoom() || 1;
                const height = viewportHeightRef.current || vs.clientHeight || 400;

                // Calculate logical page based on CENTER of the viewport
                // This aligns with syncScrollToViewport logic
                const contentCenterY = (scrollTop + height / 2) / zoom;
                const pageUnitHeight = height; // Assuming page unit matches viewport height

                const calculatedPage = Math.floor(contentCenterY / pageUnitHeight) + 1;
                const newPage = Math.max(1, Math.min(totalPagesRef.current, calculatedPage));

                // Only update if page actually changed to avoid redundant renders
                setCurrentPage(prev => {
                    if (prev !== newPage) return newPage;
                    return prev;
                });

                // 🚀 CRITICAL: Request render on scroll to update the 'Strict Viewport Culling'
                if (fabricCanvasRef.current && !isClosingRef.current) {
                    fabricCanvasRef.current.requestRenderAll();
                }
            });
        };

        // Initialize total pages based on logical height
        const canvas = fabricCanvasRef.current;
        if (canvas) {
            const viewportHeight = viewportHeightRef.current || vScroll.clientHeight || 400;
            const docHeight = pageHeightRef.current;
            setTotalPages(Math.max(1, Math.ceil(docHeight / viewportHeight)));
        }
        vScroll.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            vScroll.removeEventListener('scroll', handleScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    useEffect(() => {
        // Global inhibit flag for MainLayout's long-press paste
        (window as any).__FABRIC_MODAL_OPEN__ = true;
        return () => {
            (window as any).__FABRIC_MODAL_OPEN__ = false;
        };
    }, []);

    useEffect(() => {
        const vScroll = containerRef.current;
        if (!vScroll) return;

        const handleInteractionScroll = () => {
            lastInteractionTimeRef.current = Date.now();
        };

        vScroll.addEventListener('scroll', handleInteractionScroll, { passive: true });
        return () => {
            vScroll.removeEventListener('scroll', handleInteractionScroll);
        };
    }, []);

    const handleCancelWrapped = React.useCallback(() => {
        if (historyIndexRef.current === lastSavedIndexRef.current) {
            // Clean state, exit immediately
            isClosingRef.current = true;
            onCloseRef.current();
            // Safety timeout
            setTimeout(() => {
                if (isClosingRef.current) {
                    handleActualClose.current();
                }
            }, 300);
        } else {
            setIsExitConfirmOpen(true);
        }
    }, [onClose]);

    const handleConfirmExit = () => {
        setIsExitConfirmOpen(false);
        // Explicitly set closing flag and trigger the wrap
        isClosingRef.current = true;
        onCloseRef.current();

        // Safety timeout
        setTimeout(() => {
            if (isClosingRef.current) {
                handleActualClose.current();
            }
        }, 300);
    };

    const getCanvasJson = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;

        const jsonObj = canvas.toJSON([
            'id', 'selectable', 'evented', 'lockMovementX', 'lockMovementY',
            'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls', 'hasBorders',
            'isPageBackground', 'isPixelEraser', 'isObjectEraser', 'excludeFromExport', '__historyId'
        ]) as any;

        jsonObj.width = pageWidthRef.current;
        jsonObj.height = pageHeightRef.current;

        jsonObj.backgroundConfig = {
            type: background,
            size: backgroundSize,
            bundleGap: backgroundBundleGap,
            intensity: backgroundColorIntensity,
            colorType: backgroundColorType,
            opacity: lineOpacity,
            imageOpacity: backgroundImageOpacity,
            imageData: (background === 'image' && backgroundImage instanceof HTMLImageElement) ? backgroundImage.src : undefined
        };

        return JSON.stringify(jsonObj);
    }, [background, backgroundSize, backgroundBundleGap, backgroundColorIntensity, backgroundColorType, lineOpacity, backgroundImageOpacity, backgroundImage]);

    // Callback refs to handle stale closures during async operations
    const onSaveRef = useRef(onSave);
    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
    const onAutosaveRef = useRef(onAutosave);
    useEffect(() => { onAutosaveRef.current = onAutosave; }, [onAutosave]);
    const onCloseRef = useRef(propsOnClose);
    useEffect(() => { onCloseRef.current = propsOnClose; }, [propsOnClose]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (onAutosaveRef.current) {
                const json = getCanvasJson();
                if (json) {
                    onAutosaveRef.current(json);
                }
            }
        }, 7000); // 7 seconds

        return () => clearInterval(interval);
    }, [getCanvasJson]);

    const handleSaveAndExit = async () => {
        if (isSavingRef.current) return;
        const success = await handleSave();
        if (success) {
            handleConfirmExit();
        }
    };

    const handleSave = async (): Promise<boolean> => {
        if (!fabricCanvasRef.current || isSavingRef.current) return false;

        isSavingRef.current = true;
        setIsSaving(true);

        // Give React a tick to update the UI (showing the spinner) before heavy serialization
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
            const canvas = fabricCanvasRef.current;
            // Finalize any ongoing edits
            canvas.discardActiveObject();
            canvas.renderAll();

            const json = getCanvasJson();
            if (json) {
                // Store the index we are about to save
                const savedIndex = historyIndexRef.current;

                await onSaveRef.current(json);

                lastSavedIndexRef.current = savedIndex;
                setSavedToastVisible(true);
                setTimeout(() => setSavedToastVisible(false), 500);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Critical failure in handleSave:', err);
            return false;
        } finally {
            setIsSaving(false);
            isSavingRef.current = false;
        }
    };

    const handlePageJump = () => {
        const pageNum = parseInt(pageInput);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            const vScroll = verticalScrollRef.current;
            if (vScroll) {
                const zoom = fabricCanvasRef.current?.getZoom() || 1;
                const viewportHeight = viewportHeightRef.current || vScroll.clientHeight;
                vScroll.scrollTo({
                    top: (pageNum - 1) * viewportHeight * zoom,
                    behavior: 'smooth'
                });
            }
        }
        setIsPageEditing(false);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSaving) return;
            // Don't trigger shortcuts if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();

            // Tool shortcuts
            const selectToolById = (toolId: ToolType) => {
                const item = toolbarItems.find(i => i.toolId === toolId);
                if (item) {
                    handleToolSelect(item.id, item.type, item.toolId);
                } else {
                    setActiveTool(toolId);
                    setActiveToolItemId(null);
                }
            };

            switch (key) {
                case 'p': // Pen
                case 'b': // Brush (alternative)
                    selectToolById('pen');
                    break;
                case 'l': // Line
                    selectToolById('line');
                    break;
                case 'a': // Arrow
                    selectToolById('arrow');
                    break;
                case 'r': // Rectangle
                    selectToolById('rect');
                    break;
                case 'c': // Circle
                    selectToolById('circle');
                    break;
                case 't': // Text
                    selectToolById('text');
                    break;
                case 'e': // Eraser (pixel)
                    selectToolById('eraser_pixel');
                    break;
                case 'd': // Delete eraser (object)
                case 'x': // Alternative for object eraser
                    selectToolById('eraser_object');
                    break;
                case 'z': // Undo / Redo
                    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                        e.preventDefault();
                        handleRedo();
                    } else if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleUndo();
                    }
                    break;
                case 'y': // Alternative redo (Ctrl+Y)
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleRedo();
                    }
                    break;
                case 'escape': // Close modal
                    handleCancelWrapped();
                    break;
                case 'delete':
                case 'backspace': {
                    // Delete selected object if any (for object eraser mode or general selection)
                    const canvas = fabricCanvasRef.current;
                    if (canvas) {
                        const activeObject = canvas.getActiveObject();
                        // If user is editing a text object, let fabric handle backspace/delete
                        if (activeObject && (activeObject as any).isEditing) {
                            return;
                        }

                        const activeObjects = canvas.getActiveObjects();
                        if (activeObjects.length > 0) {
                            e.preventDefault();
                            canvas.discardActiveObject();
                            activeObjects.forEach((obj) => {
                                canvas.remove(obj);
                            });
                            canvas.requestRenderAll();
                            saveHistory();
                        }
                    }
                    break;
                }
                // Brush size shortcuts (1-4)
                case '1':
                    setBrushSize(availableBrushSizes[0]);
                    updateToolSetting(undefined, availableBrushSizes[0]);
                    break;
                case '2':
                    setBrushSize(availableBrushSizes[1]);
                    updateToolSetting(undefined, availableBrushSizes[1]);
                    break;
                case '3':
                    setBrushSize(availableBrushSizes[2]);
                    updateToolSetting(undefined, availableBrushSizes[2]);
                    break;
                case '4':
                    setBrushSize(availableBrushSizes[3]);
                    updateToolSetting(undefined, availableBrushSizes[3]);
                    break;
                case '5':
                    setBrushSize(availableBrushSizes[4]);
                    updateToolSetting(undefined, availableBrushSizes[4]);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, availableBrushSizes, handleUndo, handleRedo, setBrushSize, updateToolSetting, saveHistory, handleCancelWrapped, toolbarItems, handleToolSelect]);

    // Tool Switching Logic
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // Reset default states
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'default';

        // Disable selection on all objects by default
        // But preserve pixel eraser marks' evented: false state
        canvas.forEachObject((obj) => {
            if ((obj as any).isPixelEraser) {
                // Pixel eraser marks should always be non-interactive
                obj.set({
                    selectable: false,
                    evented: false,
                    hoverCursor: 'default'
                });
            } else {
                obj.set({
                    selectable: false,
                    evented: true,
                    hoverCursor: 'default'
                });
            }
        });
        // Cleanup touch-specific eraser layer if it exists
        if ((canvas as any)._touchEraserCleanup) {
            (canvas as any)._touchEraserCleanup();
            delete (canvas as any)._touchEraserCleanup;
        }

        // Cleanup DOM cursor if exists
        if (domCursorRef.current) {
            domCursorRef.current.remove();
            domCursorRef.current = null;
        }

        // Remove object erasing listener if present (we'll re-add if needed)
        canvas.off('mouse:down');
        canvas.off('mouse:move');
        canvas.off('mouse:up');

        // Re-attach standard listeners if needed (none strictly for now unless shape)

        // Stealth Eraser UI: Hide the brush trail on upper canvas while drawing
        // We'll project it manually in renderHook to avoid white streaks.
        const upperCanvas = (canvas as any).upperCanvasEl;
        if (upperCanvas) {
            // Use 0.01 instead of 0 to ensure the browser continues to update the canvas content 
            // even if hidden, while still being invisible to the user.
            upperCanvas.style.opacity = activeTool === 'eraser_pixel' ? '0.01' : '1';
        }

        switch (activeTool) {
            case 'select':
                canvas.isDrawingMode = false;
                canvas.selection = true;
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'default';
                canvas.forEachObject((obj) => {
                    const isProtected = (obj as any).isPixelEraser || (obj as any).isPageBackground;
                    if (isProtected) {
                        obj.set({ selectable: false, evented: false, hoverCursor: 'default', perPixelTargetFind: false });
                    } else {
                        obj.set({
                            selectable: true,
                            evented: true,
                            hoverCursor: 'move',
                            perPixelTargetFind: false
                        });
                    }
                });
                canvas.requestRenderAll();
                break;

            case 'pen':
                canvas.isDrawingMode = true;
                if (brushType === 'circle') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    canvas.freeDrawingBrush = new (fabric as any).CircleBrush(canvas);
                } else if (brushType === 'highlighter') {
                    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (canvas.freeDrawingBrush as any).strokeLinecap = 'butt';
                } else if (brushType === 'carbon') {
                    // Charcoal/Carbon: Heavy noise
                    const patternCanvas = document.createElement('canvas');
                    const size = 32;
                    patternCanvas.width = size;
                    patternCanvas.height = size;
                    const ctx = patternCanvas.getContext('2d');
                    if (ctx) {
                        const imgData = ctx.createImageData(size, size);
                        const tc = new fabric.Color(color).getSource();
                        if (tc) {
                            for (let i = 0; i < imgData.data.length; i += 4) {
                                // Increased density: 0.3 -> 0.15 (85% filled)
                                if (Math.random() > 0.15) {
                                    imgData.data[i] = tc[0];
                                    imgData.data[i + 1] = tc[1];
                                    imgData.data[i + 2] = tc[2];
                                    // Increased alpha for darker look: 0~255 -> 120~255
                                    imgData.data[i + 3] = 120 + Math.floor(Math.random() * 135);
                                }
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    canvas.freeDrawingBrush = new (fabric as any).PatternBrush(canvas);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (canvas.freeDrawingBrush as any).source = patternCanvas;
                } else if (brushType === 'hatch') {
                    // Hatch: Criss Cross
                    const patternCanvas = document.createElement('canvas');
                    const size = 16;
                    patternCanvas.width = size;
                    patternCanvas.height = size;
                    const ctx = patternCanvas.getContext('2d');
                    if (ctx) {
                        const tc = new fabric.Color(color).getSource();
                        if (tc) {
                            ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, 1)`;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(0, 0); ctx.lineTo(size, size);
                            ctx.moveTo(size, 0); ctx.lineTo(0, size);
                            ctx.stroke();
                        }
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    canvas.freeDrawingBrush = new (fabric as any).PatternBrush(canvas);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (canvas.freeDrawingBrush as any).source = patternCanvas;
                } else if (brushType === 'glow') {
                    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
                        blur: 15,
                        offsetX: 0,
                        offsetY: 0,
                        color: color
                    });
                } else if (brushType === 'laser') {
                    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (canvas.freeDrawingBrush as any).isLaser = true;
                    canvas.freeDrawingBrush.color = color;
                    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
                        blur: 10,
                        offsetX: 0,
                        offsetY: 0,
                        color: color
                    });

                } else if (brushType === 'pen') {
                    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                } else {
                    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                }

                canvas.freeDrawingBrush.color = (brushType === 'highlighter')
                    ? color.replace(')', ', 0.3)').replace('rgb', 'rgba').replace('#', color) // Basic alpha support
                    : color;

                // Better highlighter color handling
                if (brushType === 'highlighter') {
                    if (color.startsWith('#')) {
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 0.3)`;
                    }
                }

                canvas.freeDrawingBrush.width = (brushType === 'highlighter')
                    ? brushSize * 2 : brushSize;
                // Reduce path simplification for more accurate pen following
                if (canvas.freeDrawingBrush instanceof fabric.PencilBrush) {
                    (canvas.freeDrawingBrush as any).decimate = 0.5;
                }

                // PERFORMANCE BOOST: Disable events on all objects and state tracking
                const allObjects = canvas.getObjects();
                for (let i = 0, len = allObjects.length; i < len; i++) {
                    const obj = allObjects[i];
                    obj.selectable = false;
                    obj.evented = false;
                    obj.statefullCache = false;
                }

                canvas.off('mouse:up');

                canvas.freeDrawingCursor = 'crosshair';
                canvas.defaultCursor = 'crosshair';
                break;

            case 'eraser_pixel': {
                updateEraserCursor();

                canvas.isDrawingMode = true;
                canvas.freeDrawingCursor = 'none';
                const overlay = (canvas as any).__overlayEl;
                if (overlay) overlay.style.cursor = 'none';

                const brush = new fabric.PencilBrush(canvas);
                brush.width = brushSize * 4;
                brush.color = 'black';
                // @ts-ignore
                brush.globalCompositeOperation = 'source-over';
                canvas.freeDrawingBrush = brush;
                (brush as any).decimate = 0.5;

                // --- TOUCH-ONLY COMPATIBILITY LAYER ---
                const upperCanvasEl = (canvas as any).upperCanvasEl as HTMLCanvasElement;
                if (upperCanvasEl) {
                    const indicator = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    indicator.style.position = 'absolute';
                    indicator.style.pointerEvents = 'none';
                    indicator.style.zIndex = '10000';
                    indicator.style.display = 'none';
                    indicator.style.overflow = 'visible';
                    indicator.setAttribute('width', '100');
                    indicator.setAttribute('height', '100');

                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute('fill', 'none');
                    circle.setAttribute('stroke', 'black');
                    circle.setAttribute('stroke-width', '0.4');
                    circle.setAttribute('stroke-opacity', '0.8');
                    indicator.appendChild(circle);

                    const wrapper = upperCanvasEl.parentElement;
                    if (wrapper) wrapper.appendChild(indicator);
                    touchEraserCursorRef.current = indicator;

                    const handlePointer = (e: PointerEvent) => {
                        if (e.type === 'pointerleave' || e.type === 'pointercancel' || (e.pointerType !== 'mouse' && e.type === 'pointerup')) {
                            indicator.style.display = 'none';
                            return;
                        }

                        const rect = upperCanvasEl.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        const zoom = canvas.getZoom();
                        // Match the actual erasing area (100% radius)
                        const visualRadius = ((brushSize * 4) / 2) * zoom;
                        const diameter = Math.ceil(visualRadius * 2) + 2; // Add padding

                        // Match Mac style perfectly
                        indicator.setAttribute('width', diameter.toString());
                        indicator.setAttribute('height', diameter.toString());
                        circle.setAttribute('cx', (diameter / 2).toString());
                        circle.setAttribute('cy', (diameter / 2).toString());
                        circle.setAttribute('r', (visualRadius - 0.2).toString());

                        indicator.style.left = `${x - diameter / 2}px`;
                        indicator.style.top = `${y - diameter / 2}px`;
                        indicator.style.display = 'block';

                        // CRITICAL: Hide the system cursor globally while using the tool
                        canvas.freeDrawingCursor = 'none';
                        const overlay = (canvas as any).__overlayEl;
                        if (overlay && overlay.style.cursor !== 'none') {
                            overlay.style.cursor = 'none';
                        }

                        // CRITICAL: Force re-render for real-time erasing feedback
                        if (canvas.isDrawingMode) {
                            canvas.requestRenderAll();
                        }
                    };

                    const overlay = (canvas as any).__overlayEl;
                    const eventTarget = overlay || upperCanvasEl;

                    eventTarget.addEventListener('pointerdown', handlePointer);
                    eventTarget.addEventListener('pointermove', handlePointer, { passive: true });
                    eventTarget.addEventListener('pointerup', handlePointer);
                    eventTarget.addEventListener('pointerleave', handlePointer);
                    eventTarget.addEventListener('pointercancel', handlePointer);

                    (canvas as any)._touchEraserCleanup = () => {
                        eventTarget.removeEventListener('pointerdown', handlePointer);
                        eventTarget.removeEventListener('pointermove', handlePointer);
                        eventTarget.removeEventListener('pointerup', handlePointer);
                        eventTarget.removeEventListener('pointerleave', handlePointer);
                        eventTarget.removeEventListener('pointercancel', handlePointer);
                        if (indicator.parentNode) indicator.parentNode.removeChild(indicator);
                        touchEraserCursorRef.current = null;
                        if ((canvas as any)._lastEraserCursor) {
                            canvas.freeDrawingCursor = (canvas as any)._lastEraserCursor;
                        }
                    };
                }

                canvas.on('mouse:move', () => {
                    // Force re-render on any move while in eraser mode to ensure
                    // the "destination-out" projection follows the brush in real-time.
                    if (canvas.isDrawingMode) {
                        canvas.requestRenderAll();
                    }
                });

                const handleZoomCursorUpdate = () => {
                    if (activeToolRef.current === 'eraser_pixel') updateEraserCursor();
                };
                canvas.on('mouse:wheel', handleZoomCursorUpdate);
                canvas.on('mouse:wheel', handleZoomCursorUpdate);
                canvas.on('touch:gesture', handleZoomCursorUpdate);
                break;
            }

            case 'eraser_object': {
                updateObjectEraserCursor();

                canvas.isDrawingMode = false;
                canvas.defaultCursor = 'none';
                canvas.hoverCursor = 'none';
                const overlay = (canvas as any).__overlayEl;
                if (overlay) overlay.style.cursor = 'none';

                // Create Touch overlay for Object Eraser too
                const upperCanvasEl = (canvas as any).upperCanvasEl as HTMLCanvasElement;
                if (upperCanvasEl) {
                    const indicator = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    indicator.style.position = 'absolute';
                    indicator.style.pointerEvents = 'none';
                    indicator.style.zIndex = '10000';
                    indicator.style.display = 'none';
                    indicator.style.overflow = 'visible';

                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute('fill', 'none');
                    circle.setAttribute('stroke', 'black');
                    circle.setAttribute('stroke-width', '0.4');
                    circle.setAttribute('stroke-opacity', '0.8');
                    indicator.appendChild(circle);

                    const wrapper = upperCanvasEl.parentElement;
                    if (wrapper) wrapper.appendChild(indicator);
                    touchEraserCursorRef.current = indicator;

                    const handlePointer = (e: PointerEvent) => {
                        if (e.type === 'pointerleave' || e.type === 'pointercancel' || (e.pointerType !== 'mouse' && e.type === 'pointerup')) {
                            indicator.style.display = 'none';
                            return;
                        }

                        const rect = upperCanvasEl.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        const zoom = canvas.getZoom();
                        const visualRadius = ((brushSize * 4) / 2) * zoom;
                        const diameter = Math.ceil(visualRadius * 2) + 2;

                        indicator.setAttribute('width', diameter.toString());
                        indicator.setAttribute('height', diameter.toString());
                        circle.setAttribute('cx', (diameter / 2).toString());
                        circle.setAttribute('cy', (diameter / 2).toString());
                        circle.setAttribute('r', (visualRadius - 0.2).toString());

                        indicator.style.left = `${x - diameter / 2}px`;
                        indicator.style.top = `${y - diameter / 2}px`;
                        indicator.style.display = 'block';

                        // CRITICAL: Hide the system cursor globally while using the tool
                        canvas.defaultCursor = 'none';
                        canvas.hoverCursor = 'none';
                        const overlay = (canvas as any).__overlayEl;
                        if (overlay && overlay.style.cursor !== 'none') {
                            overlay.style.cursor = 'none';
                        }
                    };

                    const overlay = (canvas as any).__overlayEl;
                    const eventTarget = overlay || upperCanvasEl;

                    eventTarget.addEventListener('pointerdown', handlePointer);
                    eventTarget.addEventListener('pointermove', handlePointer, { passive: true });
                    eventTarget.addEventListener('pointerup', handlePointer);
                    eventTarget.addEventListener('pointerleave', handlePointer);
                    eventTarget.addEventListener('pointercancel', handlePointer);

                    (canvas as any)._touchEraserCleanup = () => {
                        eventTarget.removeEventListener('pointerdown', handlePointer);
                        eventTarget.removeEventListener('pointermove', handlePointer);
                        eventTarget.removeEventListener('pointerup', handlePointer);
                        eventTarget.removeEventListener('pointerleave', handlePointer);
                        eventTarget.removeEventListener('pointercancel', handlePointer);
                        if (indicator.parentNode) indicator.parentNode.removeChild(indicator);
                        touchEraserCursorRef.current = null;
                    };
                }

                canvas.forEachObject((obj) => {
                    const isProtected = (obj as any).isPixelEraser || (obj as any).isPageBackground;
                    if (isProtected) {
                        obj.set({ selectable: false, evented: false });
                    } else {
                        // CRITICAL: Enable pixel-perfect detection for precision erasing
                        obj.set({ selectable: false, evented: true, perPixelTargetFind: true });
                    }
                });
                canvas.requestRenderAll();

                let isErasingDragging = false;

                const removeIntersectingObjects = (opt: any) => {
                    const canvas = fabricCanvasRef.current;
                    if (!canvas) return;

                    const pointer = canvas.getPointer(opt.e);

                    // Hitbox logic: Use the exact visual radius used for the cursor
                    const isTouch = (opt.e as any).pointerType === 'touch' || (opt.e as any).pointerType === 'pen' || (opt.e as any).type?.startsWith('touch');
                    const visualRadiusScale = isTouch ? 1.0 : 0.5;
                    const visualRadius = ((brushSize * 4) / 2) * visualRadiusScale;

                    // 1. Center point check (Fabric already did this and put it in opt.target)
                    // Since perPixelTargetFind is true, opt.target is already pixel-perfect.
                    if (opt.target && !((opt.target as any).isPixelEraser || (opt.target as any).isPageBackground)) {
                        canvas.remove(opt.target);
                        canvas.requestRenderAll();
                        return;
                    }

                    // 2. High-precision proximity check
                    // We sample points around the eraser circle to catch edges.
                    // We use the internal _searchPossibleTargets to honor perPixelTargetFind for each point.
                    const checkRadius = visualRadius * 0.9;
                    const samplePoints = [
                        new fabric.Point(pointer.x - checkRadius, pointer.y),
                        new fabric.Point(pointer.x + checkRadius, pointer.y),
                        new fabric.Point(pointer.x, pointer.y - checkRadius),
                        new fabric.Point(pointer.x, pointer.y + checkRadius),
                        // Diagonal points for better circle approximation
                        new fabric.Point(pointer.x - checkRadius * 0.707, pointer.y - checkRadius * 0.707),
                        new fabric.Point(pointer.x + checkRadius * 0.707, pointer.y - checkRadius * 0.707),
                        new fabric.Point(pointer.x - checkRadius * 0.707, pointer.y + checkRadius * 0.707),
                        new fabric.Point(pointer.x + checkRadius * 0.707, pointer.y + checkRadius * 0.707)
                    ];

                    const objects = canvas.getObjects();
                    for (const p of samplePoints) {
                        // findTarget at this point
                        // We use a helper to verify if a specific point hits any object pixel-perfectly
                        // @ts-ignore - reaching into internals for precision
                        const target = (canvas as any)._searchPossibleTargets(objects, p);

                        if (target && !((target as any).isPixelEraser || (target as any).isPageBackground)) {
                            canvas.remove(target);
                            canvas.requestRenderAll();
                            // If we found one, we continue checking other points in case we are dragging fast
                            // but usually one at a time is fine for a single event loop.
                        }
                    }
                };

                canvas.on('mouse:down', (opt) => {
                    isErasingDragging = true;
                    removeIntersectingObjects(opt);
                });
                canvas.on('mouse:move', (opt) => {
                    if (isErasingDragging) {
                        removeIntersectingObjects(opt);
                    }
                });
                canvas.on('mouse:up', () => { isErasingDragging = false; });

                const handleZoomCursorUpdate = () => {
                    if (activeToolRef.current === 'eraser_object') updateObjectEraserCursor();
                };
                canvas.on('mouse:wheel', handleZoomCursorUpdate);
                canvas.on('touch:gesture', handleZoomCursorUpdate);
                break;
            }

            case 'text':
                canvas.isDrawingMode = false;
                canvas.selection = true;
                canvas.defaultCursor = 'text';
                canvas.hoverCursor = 'text';

                // Set objects to be interactive so they can be selected/edited
                canvas.forEachObject((obj) => {
                    const isProtected = (obj as any).isPixelEraser || (obj as any).isPageBackground;
                    if (!isProtected) {
                        obj.set({ selectable: true, evented: true, perPixelTargetFind: false });
                    }
                });

                canvas.on('mouse:down', (opt) => {
                    // Logic: Only add text if clicking on empty area or on background
                    // We must ignore background/eraser marks when checking for collision
                    const hitTarget = opt.target;
                    const isRealObject = hitTarget && !((hitTarget as any).isPixelEraser || (hitTarget as any).isPageBackground);

                    if (isRealObject) return;

                    const pointer = canvas.getPointer(opt.e);
                    const text = new fabric.IText('Type here...', {
                        left: pointer.x,
                        top: pointer.y,
                        fontFamily: fontFamily,
                        fontWeight: fontWeight,
                        fontStyle: fontStyle,
                        fontSize: Math.max(16, brushSize * 4),
                        fill: color,
                        editable: true,
                        selectable: true,
                        evented: true,
                    });
                    canvas.add(text);
                    canvas.setActiveObject(text);
                    text.enterEditing();
                    text.selectAll();
                    canvas.requestRenderAll();
                    if (saveHistory) saveHistory();
                });
                break;

            case 'laser':
                canvas.isDrawingMode = true;
                canvas.selection = false;
                const laserBrush = new fabric.PencilBrush(canvas);
                (laserBrush as any).isLaser = true;
                laserBrush.color = color;
                laserBrush.width = brushSize;
                laserBrush.shadow = new fabric.Shadow({
                    blur: 10,
                    offsetX: 0,
                    offsetY: 0,
                    color: color
                });
                canvas.freeDrawingBrush = laserBrush;
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                break;

            case 'line':
            case 'arrow':
            case 'rect':
            case 'circle':
            case 'triangle':
            case 'ellipse':
            case 'diamond':
            case 'pentagon':
            case 'hexagon':
            case 'octagon':
            case 'star':
                canvas.defaultCursor = 'crosshair';
                // Attach shape drawing handlers
                canvas.on('mouse:down', handleShapeMouseDown);
                canvas.on('mouse:move', handleShapeMouseMove);
                canvas.on('mouse:up', handleShapeMouseUp);
                break;
        }

    }, [activeTool, color, brushSize, shapeStyles, brushType, fontFamily, fontWeight, fontStyle, handleShapeMouseDown, handleShapeMouseMove, handleShapeMouseUp, background, backgroundColor, currentBackgroundColor, lineOpacity, backgroundSize, backgroundBundleGap, backgroundImage, backgroundImageOpacity, saveHistory]);

    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            activeObjects.forEach((obj) => {
                if ((obj as any).isArrow && obj.type === 'group') {
                    const group = obj as fabric.Group;
                    group.getObjects().forEach((child, index) => {
                        child.set({ stroke: color, strokeWidth: brushSize });
                        // child 0 is the line, keep its dash if applicable
                        // child 1 is the head, always solid
                        if (index === 0) {
                            const currentStyle = shapeStyles['arrow'] || DEFAULT_SHAPE_STYLE;
                            child.set({ strokeDashArray: currentStyle.dashArray });
                        } else {
                            child.set({ strokeDashArray: undefined });
                        }
                    });
                } else if (obj.type === 'i-text' || obj.type === 'text') {
                    (obj as fabric.IText).set({ fill: color, fontFamily: fontFamily });
                } else {
                    obj.set({ stroke: color, strokeWidth: brushSize });
                }

                // Also update toolSettings for this object type
                const objType = (obj as any).isArrow ? 'arrow' :
                    (obj as any).isDiamond ? 'diamond' :
                        (obj.type === 'i-text' || obj.type === 'text') ? 'text' :
                            obj.type === 'path' ? 'pen' :
                                obj.type === 'rect' ? 'rect' :
                                    obj.type === 'circle' ? 'circle' :
                                        obj.type === 'triangle' ? 'triangle' :
                                            obj.type === 'ellipse' ? 'ellipse' :
                                                obj.type;

                // Special case for pen types if we can detect them, but 'pen' is default
                let targetKey = objType as string;
                if (targetKey === 'path') targetKey = brushType; // Fallback to current brush type if it's a path

                setToolSettings(prev => ({
                    ...prev,
                    [targetKey]: { color, size: brushSize }
                }));
            });
            canvas.requestRenderAll();
            saveHistory();
        }
    }, [color, brushSize, brushType, shapeStyles, fontFamily, saveHistory]);

    // Unified Background Update and rendering hook isolation
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 1. Sync CSS background color for the canvas element (eliminates black leaks)
        const canvasEl = canvas.getElement();
        if (canvasEl) {
            canvasEl.style.backgroundColor = '#f0f0f0'; // Backdrop color
        }

        // 2. Prepare Persistent Background Pattern (includes paper color, grid, image)
        const pat = createBackgroundPattern(background, currentBackgroundColor, lineOpacity, backgroundSize, false, backgroundBundleGap, backgroundImage || undefined, backgroundImageOpacity, canvas.getWidth());

        persistentBackgroundPatternRef.current = pat as fabric.Pattern;

        // 3. Attach Hole-Filling Rendering Hook
        // This draws the background ONLY where pixels are transparent (erased area)
        const renderHook = () => {
            const ctx = canvas.getContext();
            const pattern = persistentBackgroundPatternRef.current;
            if (ctx && pattern && canvas.viewportTransform) {
                // A. LIVE ERASE PROJECTION
                // If user is currently erasing (via active tool OR barrel button), subtract the upper-canvas (brush trail) 
                // from the lower-canvas (final objects) in real-time.
                const isPixelErasing = (activeToolRef.current === 'eraser_pixel' ||
                    (barrelButtonErasingRef.current && lastUsedEraserRef.current === 'eraser_pixel'));
                if (isPixelErasing && canvas.isDrawingMode) {
                    const upperCanvas = (canvas as any).upperCanvasEl;
                    if (upperCanvas) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-out';
                        // Match pixel-for-pixel; upperCanvas and lowerCanvas are always synced
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                        ctx.drawImage(upperCanvas, 0, 0);
                        ctx.restore();
                    }
                }

                // B. BACKGROUND FILL (Fill finalized holes & live projected holes)
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';

                // Synchronize background rendering with current zoom and scroll
                const vpt = canvas.viewportTransform;
                ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

                // Draw background in world space to enable scrolling.
                // We use logical page dimensions to cover entire surface.
                const w = pageWidthRef.current || canvas.getWidth() || 5000;
                const h = pageHeightRef.current || canvas.getHeight() || 10000;

                const livePattern = (pattern as any).toLive(ctx);
                if (livePattern) {
                    ctx.fillStyle = livePattern;
                    ctx.fillRect(0, 0, w, h);
                }

                ctx.restore();
            }
        };

        canvas.off('after:render', (canvas as any).afterRenderHandler); // Prevent duplicates
        (canvas as any).afterRenderHandler = renderHook;
        canvas.on('after:render', renderHook);

        // 4. Reset pageRect to transparent (it's now just a logical boundary)
        if (pageRectRef.current && pageRectRef.current.canvas === canvas) {
            const updates: any = {
                fill: 'transparent',
                width: pageWidthRef.current || canvas.getWidth(),
                height: pageHeightRef.current || canvas.getHeight()
            };

            if (background === 'image' && backgroundImage) {
                const imgWidth = (backgroundImage as any).width || 0;
                const imgHeight = (backgroundImage as any).height || 0;
                if (imgWidth > 0 && imgHeight > 0) {
                    const viewportW = canvas.getWidth() || 800;
                    const scale = viewportW / imgWidth;
                    const aspectHeight = imgHeight * scale;
                    updates.width = viewportW;
                    updates.height = aspectHeight;
                    pageWidthRef.current = viewportW;
                    pageHeightRef.current = aspectHeight;

                    isSyncingScrollRef.current = true;
                    setPageWidthState(viewportW);
                    setPageHeightState(aspectHeight);
                    setTotalPages(1);
                    setCurrentPage(1);
                    setTimeout(() => { isSyncingScrollRef.current = false; }, 150);
                }
            }

            pageRectRef.current.set(updates);
            pageRectRef.current.setCoords();
            canvas.requestRenderAll();
        } else {
            const pageRect = new fabric.Rect({
                left: 0,
                top: 0,
                width: pageWidthRef.current || canvas.getWidth(),
                height: pageHeightRef.current || canvas.getHeight(),
                fill: 'transparent',
                selectable: false,
                evented: false,
                isPageBackground: true
            } as any);

            canvas.insertAt(pageRect, 0, false);
            pageRectRef.current = pageRect;
            canvas.renderAll();
        }

        return () => {
            canvas.off('after:render', (canvas as any).afterRenderHandler);
        };
    }, [background, currentBackgroundColor, lineOpacity, backgroundSize, backgroundBundleGap, pageHeightState, pageWidthState, backgroundImage, backgroundImageOpacity, brushSize]);

    const handleVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isInternalScrollRef.current) return;

        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const target = e.currentTarget;
        const vpt = canvas.viewportTransform;
        if (vpt) {
            const zoom = canvas.getZoom();
            const viewportHeight = target.clientHeight; // Use scrollbar container's visible height
            const canvasLogicalHeight = pageHeightRef.current * zoom;
            const centeringOffset = Math.max(0, (viewportHeight - canvasLogicalHeight) / 2);

            vpt[5] = centeringOffset - target.scrollTop;
            canvas.requestRenderAll();
        }
    };

    const handleHorizontalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isInternalScrollRef.current) return;

        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const target = e.currentTarget;
        const vpt = canvas.viewportTransform;
        if (vpt && !isZoomLocked) {
            const zoom = canvas.getZoom();
            const viewportWidth = target.clientWidth; // Use scrollbar container's visible width
            const logicalWidth = pageWidthRef.current * zoom;
            const centeringOffset = Math.max(0, (viewportWidth - logicalWidth) / 2);

            // The absolute position vpt[4] = centeringPadding - scrolledAmount
            vpt[4] = centeringOffset - target.scrollLeft;

            canvas.requestRenderAll();
        }
    };

    return (
        <ModalOverlay onClick={(e) => {
            if (e.target === e.currentTarget) {
                // If any settings modal is open (Level 1)
                if (isPalettePickerOpen || isSizeEditOpen || isShapeSettingsOpen || isPenEditOpen || isFontEditOpen || isBgPickerOpen) {
                    // If we just interacted with an input (like the native color picker),
                    // ignore the first backdrop click so the user stays in the sub-modal.
                    if (Date.now() - lastInteractionTimeRef.current > 500) {
                        handlePalettePickerClose();
                        handleSizeOk();
                        handleShapeSettingsOk();
                        handlePenOk();
                        handleFontOk();
                        handleBgOk();
                    }
                } else {
                    // Only close the main modal (Level 0) if no settings are open
                    // and some time has passed since the last interaction
                    if (Date.now() - lastInteractionTimeRef.current > 300) {
                        handleCancelWrapped();
                    }
                }
            }
        }}>
            <ModalContainer ref={containerRef} onClick={(e) => e.stopPropagation()}>
                <Toolbar>
                    <ToolGroup style={{ flex: 1 }}>
                        {toolbarItems.map((item) => renderToolbarItem(item))}
                        <div style={{ flex: 1 }} /> {/* Spacer to push buttons to right */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#444',
                            padding: '2px 4px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            marginLeft: '2px',
                            marginRight: '2px',
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            minWidth: '22px',
                            justifyContent: 'center'
                        }}
                            onClick={() => {
                                if (!isPageEditing) {
                                    setPageInput(currentPage.toString());
                                    setIsPageEditing(true);
                                }
                            }}
                        >
                            {isPageEditing ? (
                                <input
                                    type="number"
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onBlur={handlePageJump}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handlePageJump();
                                        if (e.key === 'Escape') setIsPageEditing(false);
                                    }}
                                    autoFocus
                                    style={{
                                        width: '40px',
                                        border: 'none',
                                        background: 'white',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        padding: '0 2px',
                                        textAlign: 'center',
                                        outline: 'none',
                                        borderRadius: '2px'
                                    }}
                                    min={1}
                                    max={totalPages}
                                />
                            ) : (
                                currentPage
                            )}
                            /{totalPages}
                        </div>
                        <ToolButton
                            onClick={() => setIsHelpOpen(true)}
                            style={{ border: 'none', background: 'transparent' }}
                            title={t.drawing?.help || 'Help'}
                        >
                            <FiHelpCircle size={18} />
                        </ToolButton>
                        <ToolButton
                            onClick={() => setIsConfigOpen(true)}
                            style={{ border: 'none', background: 'transparent' }}
                            title={t.drawing?.customize || 'Settings'}
                        >
                            <FiSettings size={18} />
                        </ToolButton>
                        <ToolButton
                            onClick={toggleFullscreen}
                            style={{ border: 'none', background: 'transparent' }}
                            title={isFullscreen ? (t.drawing?.exit_fullscreen || 'Exit Fullscreen') : (t.drawing?.enter_fullscreen || 'Fullscreen')}
                        >
                            {isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
                        </ToolButton>
                        <ToolButton
                            onClick={handleResetZoom}
                            style={{ border: 'none', background: 'transparent' }}
                            title={t.drawing?.zoom_reset || 'Reset Zoom'}
                        >
                            <ZoomOneIcon size={18} />
                        </ToolButton>
                        <StatusToggleButton
                            $active={isZoomLocked}
                            onClick={() => setIsZoomLocked(!isZoomLocked)}
                            title={isZoomLocked ? t.drawing?.zoom_unlock : t.drawing?.zoom_lock}
                        >
                            {isZoomLocked ? <FiLock size={18} /> : <FiUnlock size={18} />}
                        </StatusToggleButton>
                        <div style={{ width: '4px', height: '16px', borderLeft: '1px solid #dee2e6', margin: '0 4px' }} />
                        <CompactActionButton
                            $primary
                            onClick={handleSave}
                            disabled={isSaving}
                            title={isSaving ? t.drawing?.saving : (t.drawing?.insert || 'Insert')}
                        >
                            {isSaving ? (
                                <div style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            ) : (
                                <FiCheck size={12} />
                            )}
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </CompactActionButton>
                        <CompactActionButton
                            onClick={handleCancelWrapped}
                            disabled={isSaving}
                            title={t.drawing?.exit || 'Exit'}
                        >
                            <FiX size={12} />
                        </CompactActionButton>
                    </ToolGroup>
                </Toolbar>

                {isSizeEditOpen && (
                    <Backdrop
                        $centered={!settingsAnchor}
                        onClick={(e) => {
                            const now = Date.now();
                            if (now - openedTimeRef.current < 400) return; // Ignore ghost clicks
                            if (e.target === e.currentTarget) handleSizeOk();
                        }}>
                        <CompactModal
                            $anchor={settingsAnchor || undefined}
                            onClick={e => e.stopPropagation()}
                        >
                            <ColorInputWrapper>
                                <CustomRangeInput
                                    type="range"
                                    min="1"
                                    max="100"
                                    $size={tempSize}
                                    value={tempSize}
                                    onChange={(e) => setTempSize(parseInt(e.target.value))}
                                />
                                <CustomNumberInput
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={tempSize}
                                    onChange={(e) => setTempSize(parseInt(e.target.value) || 1)}
                                />
                            </ColorInputWrapper>
                            <CompactModalFooter>
                                <CompactModalButton onClick={handleSizeReset}>
                                    {t.drawing?.reset || 'Reset'}
                                </CompactModalButton>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <CompactModalButton onClick={handleSizeCancel}>
                                        {t.drawing?.cancel || 'Cancel'}
                                    </CompactModalButton>
                                    <CompactModalButton onClick={handleSizeOk} $variant="primary">
                                        {t.drawing?.ok || 'OK'}
                                    </CompactModalButton>
                                </div>
                            </CompactModalFooter>
                        </CompactModal>
                    </Backdrop>
                )}
                {isShapeSettingsOpen && (
                    <Backdrop
                        $centered={!settingsAnchor}
                        onClick={(e) => {
                            const now = Date.now();
                            if (now - openedTimeRef.current < 400) return; // Ignore ghost clicks
                            if (e.target === e.currentTarget) handleShapeSettingsOk();
                        }}>
                        <CompactModal
                            $anchor={settingsAnchor || undefined}
                            onClick={e => e.stopPropagation()}
                            style={{ minWidth: '240px', maxWidth: '95vw', maxHeight: '80vh' }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px' }}>
                                {(['line', 'arrow', 'rect', 'ellipse', 'triangle', 'circle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star'] as ToolType[]).map((tool) => (
                                    <ToolButton
                                        key={tool}
                                        $active={activeTool === tool}
                                        onClick={() => {
                                            setActiveTool(tool);
                                            lastInteractionTimeRef.current = Date.now();
                                        }}
                                        onDoubleClick={() => {
                                            setActiveTool(tool);
                                            handleShapeSettingsOk();
                                        }}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '4px',
                                            background: activeTool === tool ? '#333' : 'transparent',
                                            color: activeTool === tool ? 'white' : '#555',
                                            border: '1px solid',
                                            borderColor: activeTool === tool ? '#333' : '#e9ecef',
                                        }}
                                    >
                                        {tool === 'line' && <FiMinus size={16} style={{ transform: 'rotate(-45deg)' }} />}
                                        {tool === 'arrow' && <FiArrowDown size={14} style={{ transform: 'rotate(-135deg)' }} />}
                                        {tool === 'rect' && <FiSquare size={14} />}
                                        {tool === 'circle' && <FiCircle size={14} />}
                                        {tool === 'ellipse' && <EllipseIcon size={14} />}
                                        {tool === 'triangle' && <FiTriangle size={14} />}
                                        {tool === 'diamond' && <DiamondIcon size={14} />}
                                        {tool === 'pentagon' && <PentagonIcon size={14} />}
                                        {tool === 'hexagon' && <HexagonIcon size={14} />}
                                        {tool === 'octagon' && <OctagonIcon size={14} />}
                                        {tool === 'star' && <StarIcon size={14} />}
                                    </ToolButton>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {DASH_OPTIONS.map((dash, index) => (
                                    <DashOption
                                        key={index}
                                        $active={tempDashIndex === index}
                                        onClick={() => setTempDashIndex(index)}
                                    >
                                        <DashPreview $dash={dash || null} />
                                    </DashOption>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 600, minWidth: '35px' }}>
                                    {t.drawing?.opacity || 'Opacity'}
                                </div>
                                <CustomRangeInput
                                    type="range"
                                    min="10"
                                    max="100"
                                    $size={6}
                                    $opacityValue={tempShapeOpacity}
                                    value={tempShapeOpacity}
                                    onChange={(e) => setTempShapeOpacity(parseInt(e.target.value))}
                                    style={{ margin: 0, flex: 1 }}
                                />
                                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 500, minWidth: '30px', textAlign: 'right' }}>
                                    {tempShapeOpacity}%
                                </div>
                            </div>

                            {activeTool === 'arrow' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderTop: '1px solid #eee' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 600, minWidth: '35px' }}>
                                        {t.drawing?.head_size || 'Head'}
                                    </div>
                                    <CustomRangeInput
                                        type="range"
                                        min="5"
                                        max="100"
                                        $size={6}
                                        value={tempHeadSize}
                                        onChange={(e) => setTempHeadSize(parseInt(e.target.value))}
                                        style={{ margin: 0, flex: 1 }}
                                    />
                                    <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 500, minWidth: '30px', textAlign: 'right' }}>
                                        {tempHeadSize}px
                                    </div>
                                </div>
                            )}

                            <CompactModalFooter>
                                <CompactModalButton onClick={handleShapeSettingsReset}>
                                    {t.drawing?.reset || 'Reset'}
                                </CompactModalButton>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <CompactModalButton onClick={handleShapeSettingsCancel}>
                                        {t.drawing?.cancel || 'Cancel'}
                                    </CompactModalButton>
                                    <CompactModalButton onClick={handleShapeSettingsOk} $variant="primary">
                                        {t.drawing?.ok || 'OK'}
                                    </CompactModalButton>
                                </div>
                            </CompactModalFooter>
                        </CompactModal>
                    </Backdrop>
                )}

                {isPenEditOpen && (
                    <Backdrop
                        $centered={!settingsAnchor}
                        onClick={(e) => {
                            const now = Date.now();
                            if (now - openedTimeRef.current < 400) return; // Ignore ghost clicks
                            if (e.target === e.currentTarget) handlePenOk();
                        }}>
                        <CompactModal
                            $anchor={settingsAnchor || undefined}
                            onClick={e => e.stopPropagation()}
                            style={{ minWidth: '200px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto', padding: '12px', paddingBottom: '24px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <DashOption
                                    $active={tempBrushType === 'pen'}
                                    onClick={() => setTempBrushType('pen')}
                                    onDoubleClick={() => {
                                        setTempBrushType('pen');
                                        handlePenOk();
                                    }}
                                    style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                >
                                    <PenIcon />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span style={{ fontSize: '0.85rem', minWidth: '70px' }}>{t.drawing.pen_pen}</span>
                                    <BrushSample
                                        $type="pen"
                                        $color={toolSettings['pen']?.color || color}
                                        $size={toolSettings['pen']?.size || brushSize}
                                    />
                                </DashOption>
                                <DashOption
                                    $active={tempBrushType === 'carbon'}
                                    onClick={() => setTempBrushType('carbon')}
                                    onDoubleClick={() => {
                                        setTempBrushType('carbon');
                                        handlePenOk();
                                    }}
                                    style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                >
                                    <PencilIcon />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span style={{ fontSize: '0.85rem', minWidth: '70px' }}>{t.drawing.pen_carbon}</span>
                                    <BrushSample
                                        $type="carbon"
                                        $color={toolSettings['carbon']?.color || color}
                                        $size={toolSettings['carbon']?.size || brushSize}
                                    />
                                </DashOption>

                                <DashOption
                                    $active={tempBrushType === 'highlighter'}
                                    onClick={() => setTempBrushType('highlighter')}
                                    onDoubleClick={() => {
                                        setTempBrushType('highlighter');
                                        handlePenOk();
                                    }}
                                    style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                >
                                    <HighlighterIcon />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span style={{ fontSize: '0.85rem', minWidth: '70px' }}>{t.drawing.pen_highlighter}</span>
                                    <BrushSample
                                        $type="highlighter"
                                        $color={toolSettings['highlighter']?.color || color}
                                        $size={(toolSettings['highlighter']?.size || brushSize) * 2}
                                    />
                                </DashOption>

                                <DashOption
                                    $active={tempBrushType === 'laser'}
                                    onClick={() => setTempBrushType('laser')}
                                    onDoubleClick={() => {
                                        setTempBrushType('laser');
                                        handlePenOk();
                                    }}
                                    style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                >
                                    <LaserIcon />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span style={{ fontSize: '0.85rem', minWidth: '70px' }}>{t.drawing.pen_laser}</span>
                                    <BrushSample
                                        $type="laser"
                                        $color={toolSettings['laser']?.color || color}
                                        $size={toolSettings['laser']?.size || brushSize}
                                    />
                                </DashOption>
                                <DashOption
                                    $active={tempBrushType === 'glow'}
                                    onClick={() => setTempBrushType('glow')}
                                    onDoubleClick={() => {
                                        setTempBrushType('glow');
                                        handlePenOk();
                                    }}
                                    style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                >
                                    <GlowIcon />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span style={{ fontSize: '0.85rem', minWidth: '70px' }}>{t.drawing.pen_glow}</span>
                                    <BrushSample
                                        $type="glow"
                                        $color={toolSettings['glow']?.color || color}
                                        $size={toolSettings['glow']?.size || brushSize}
                                    />
                                </DashOption>

                                <DashOption
                                    $active={tempBrushType === 'circle'}
                                    onClick={() => setTempBrushType('circle')}
                                    onDoubleClick={() => {
                                        setTempBrushType('circle');
                                        handlePenOk();
                                    }}
                                    style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                >
                                    <CircleBrushIcon />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span style={{ fontSize: '0.85rem', minWidth: '70px' }}>{t.drawing.pen_circle}</span>
                                    <BrushSample
                                        $type="circle"
                                        $color={toolSettings['circle']?.color || color}
                                        $size={toolSettings['circle']?.size || brushSize}
                                    />
                                </DashOption>
                                <DashOption
                                    $active={tempBrushType === 'hatch'}
                                    onClick={() => setTempBrushType('hatch')}
                                    onDoubleClick={() => {
                                        setTempBrushType('hatch');
                                        handlePenOk();
                                    }}
                                    style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                >
                                    <HatchIcon />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span style={{ fontSize: '0.85rem', minWidth: '70px' }}>{t.drawing.pen_hatch}</span>
                                    <BrushSample
                                        $type="hatch"
                                        $color={toolSettings['hatch']?.color || color}
                                        $size={toolSettings['hatch']?.size || brushSize}
                                    />
                                </DashOption>

                                {isMobileDevice() && (
                                    <>
                                        <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }}></div>

                                        <DashOption
                                            $active={tempDrawWithFinger}
                                            onClick={() => setTempDrawWithFinger(!tempDrawWithFinger)}
                                            style={{ height: '36px', justifyContent: 'flex-start', padding: '0 12px', gap: '12px' }}
                                        >
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '4px',
                                                border: '2px solid #333',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: tempDrawWithFinger ? '#333' : 'transparent'
                                            }}>
                                                {tempDrawWithFinger && <FiCheck color="white" size={14} />}
                                            </div>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            <span style={{ fontSize: '0.85rem' }}>{(t.drawing as any)?.draw_with_finger || 'Draw with Finger'}</span>
                                        </DashOption>
                                    </>
                                )}
                            </div>
                            <CompactModalFooter>
                                <CompactModalButton onClick={handlePenReset}>
                                    {t.drawing?.reset || 'Reset'}
                                </CompactModalButton>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <CompactModalButton onClick={handlePenCancel}>
                                        {t.drawing?.cancel || 'Cancel'}
                                    </CompactModalButton>
                                    <CompactModalButton onClick={handlePenOk} $variant="primary">
                                        {t.drawing?.ok || 'OK'}
                                    </CompactModalButton>
                                </div>
                            </CompactModalFooter>
                        </CompactModal>
                    </Backdrop>
                )}

                {isFontEditOpen && (
                    <Backdrop
                        $centered={!settingsAnchor}
                        onClick={(e) => {
                            const now = Date.now();
                            if (now - openedTimeRef.current < 400) return; // Ignore ghost clicks
                            if (e.target === e.currentTarget) handleFontOk();
                        }}>
                        <CompactModal
                            $anchor={settingsAnchor || undefined}
                            onClick={e => e.stopPropagation()}
                            style={{ minWidth: '160px', maxWidth: '95vw', maxHeight: '80vh' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>

                                {availableFonts.map((font) => (
                                    <DashOption
                                        key={font}
                                        $active={tempFontFamily === font}
                                        onClick={() => setTempFontFamily(font)}
                                        onDoubleClick={() => {
                                            setTempFontFamily(font);
                                            setFontFamily(font);
                                            setSettingsAnchor(null);
                                            setIsFontEditOpen(false);
                                            lastInteractionTimeRef.current = Date.now();
                                        }}
                                        onTouchStart={(e) => {
                                            setTempFontFamily(font);
                                            handleDoubleTap(e, `font - ${font} `, () => {
                                                setFontFamily(font);
                                                setSettingsAnchor(null);
                                                setIsFontEditOpen(false);
                                                lastInteractionTimeRef.current = Date.now();
                                            });
                                        }}
                                        style={{ fontFamily: font, height: '32px', justifyContent: 'flex-start', padding: '0 12px' }}
                                    >
                                        {font}
                                    </DashOption>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', borderTop: '1px solid #eee' }}>
                                {[
                                    { label: t.drawing?.font_thin || 'Thin', value: 100 },
                                    { label: t.drawing?.font_normal || 'Normal', value: 'normal' },
                                    { label: t.drawing?.font_bold || 'Bold', value: 'bold' }
                                ].map((w) => (
                                    <CompactModalButton
                                        key={typeof w.value === 'string' ? w.value : w.value.toString()}
                                        $variant={tempFontWeight == w.value ? 'primary' : undefined}
                                        onClick={() => setTempFontWeight(w.value)}
                                        style={{ flex: 1, fontSize: '0.8rem', padding: '4px' }}
                                    >
                                        {w.label}
                                    </CompactModalButton>
                                ))}
                            </div>
                            <div style={{ display: 'flex', padding: '0 12px 8px 12px' }}>
                                <CompactModalButton
                                    $variant={tempFontStyle === 'italic' ? 'primary' : undefined}
                                    onClick={() => setTempFontStyle(prev => prev === 'italic' ? 'normal' : 'italic')}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '4px', fontStyle: 'italic' }}
                                >
                                    {t.drawing?.font_italic || 'Italic'}
                                </CompactModalButton>
                            </div>
                            <CompactModalFooter>
                                <div />
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <CompactModalButton onClick={handleFontCancel}>
                                        {t.drawing?.cancel || 'Cancel'}
                                    </CompactModalButton>
                                    <CompactModalButton onClick={handleFontOk} $variant="primary">
                                        {t.drawing?.ok || 'OK'}
                                    </CompactModalButton>
                                </div>
                            </CompactModalFooter>
                        </CompactModal>
                    </Backdrop>
                )}

                {isPalettePickerOpen && (
                    <Backdrop onClick={handlePalettePickerClose}>
                        <CompactModal onClick={e => e.stopPropagation()} style={{ width: '90vw', maxWidth: '350px', maxHeight: '80vh', overflowY: 'auto', padding: '0 16px 16px 16px' }}>
                            {editingPaletteIndex === null ? (
                                <>
                                    <div style={{ position: 'relative', height: '14px', marginBottom: '4px' }}>
                                        <FiX style={{ position: 'absolute', top: '-4px', right: '-4px', padding: '10px', cursor: 'pointer', color: '#888' }} onClick={handlePalettePickerClose} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {palettes.map((p, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handlePaletteSelect(idx)}
                                                onDoubleClick={() => handlePaletteDoubleTap_Local(idx)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: '2px solid',
                                                    borderColor: selectedPaletteIndex === idx ? '#333' : '#e9ecef',
                                                    background: selectedPaletteIndex === idx ? '#f8f9fa' : 'white',
                                                    transition: 'all 0.2s',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                                                    {p.map((c, cIdx) => (
                                                        <div key={cIdx} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                                    <button
                                                        onClick={(e) => handlePaletteEditStart(e, idx)}
                                                        title={t.drawing?.palette_edit || 'Edit colors'}
                                                        style={{ border: 'none', background: '#f1f3f5', borderRadius: '4px', cursor: 'pointer', padding: '6px', color: '#495057', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPaletteResetIndex(idx); setIsPaletteResetConfirmOpen(true); }}
                                                        title={t.drawing?.palette_reset || 'Reset to default'}
                                                        style={{ border: 'none', background: '#f1f3f5', borderRadius: '4px', cursor: 'pointer', padding: '6px', color: '#495057', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <FiRotateCcw size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <CompactModalFooter style={{ marginTop: '20px' }}>
                                        <CompactModalButton onClick={handlePalettePickerClose}>{t.drawing?.cancel || 'Cancel'}</CompactModalButton>
                                        <CompactModalButton $variant="primary" onClick={handlePaletteOk} style={{ minWidth: '80px' }}>{t.drawing?.ok || 'OK'}</CompactModalButton>
                                    </CompactModalFooter>
                                </>
                            ) : (
                                <>
                                    <div style={{ position: 'relative', height: '14px', marginBottom: '4px' }}>
                                        <FiX style={{ position: 'absolute', top: '-4px', right: '-4px', padding: '10px', cursor: 'pointer', color: '#888' }} onClick={handlePaletteEditCancel} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 'max-content' }}>
                                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', justifyContent: 'space-between', padding: '4px', background: '#f8f9fa', borderRadius: '8px' }}>
                                            {paletteTempColors.map((c, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setPaletteEditingColorIndex(idx)}
                                                    style={{
                                                        width: '38px',
                                                        height: '38px',
                                                        borderRadius: '50%',
                                                        background: c,
                                                        border: paletteEditingColorIndex === idx ? '3px solid #333' : '2px solid white',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.1s'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        {paletteEditingColorIndex !== null && (
                                            <div style={{ padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                                <HexColorPicker
                                                    color={paletteTempColors[paletteEditingColorIndex]}
                                                    onChange={(newColor) => {
                                                        const next = [...paletteTempColors];
                                                        next[paletteEditingColorIndex] = newColor;
                                                        setPaletteTempColors(next);
                                                    }}
                                                    style={{ width: '100%', height: '150px' }}
                                                />
                                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, width: '30px', flexShrink: 0 }}>HEX</span>
                                                        <div style={{ display: 'flex', flex: 1 }}>
                                                            <input
                                                                value={paletteTempColors[paletteEditingColorIndex].toUpperCase()}
                                                                readOnly
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '6px 10px',
                                                                    fontSize: '1rem',
                                                                    fontFamily: 'inherit',
                                                                    border: '1px solid #ced4da',
                                                                    borderRadius: '4px',
                                                                    background: '#f1f3f5',
                                                                    cursor: 'default',
                                                                    color: '#495057',
                                                                    textAlign: 'left',
                                                                    height: '40px'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, width: '30px', flexShrink: 0 }}>RGB</span>
                                                        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                                                            {['r', 'g', 'b'].map((key) => {
                                                                const rgb = hexToRgb(paletteTempColors[paletteEditingColorIndex!]);
                                                                return (
                                                                    <input
                                                                        key={key}
                                                                        type="number"
                                                                        min="0"
                                                                        max="255"
                                                                        value={rgb[key as keyof typeof rgb]}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value) || 0;
                                                                            const newRgb = { ...rgb, [key]: val };
                                                                            const next = [...paletteTempColors];
                                                                            next[paletteEditingColorIndex!] = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
                                                                            setPaletteTempColors(next);
                                                                        }}
                                                                        style={{
                                                                            flex: 1,
                                                                            width: 0, // Allow flex to control width
                                                                            padding: '6px 2px',
                                                                            border: '1px solid #ced4da',
                                                                            borderRadius: '4px',
                                                                            fontSize: '1rem',
                                                                            textAlign: 'center',
                                                                            background: 'white',
                                                                            height: '40px'
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <CompactModalFooter style={{ marginTop: '20px' }}>
                                        <CompactModalButton onClick={handlePaletteEditCancel}>{t.drawing?.cancel || 'Cancel'}</CompactModalButton>
                                        <CompactModalButton $variant="primary" onClick={handlePaletteEditSave} style={{ minWidth: '100px' }}>{t.drawing?.save_palette || 'Save Palette'}</CompactModalButton>
                                    </CompactModalFooter>
                                </>
                            )}
                        </CompactModal>
                    </Backdrop>
                )}

                {isBgPickerOpen && (
                    <Backdrop
                        $centered={!settingsAnchor}
                        onClick={(e) => {
                            const now = Date.now();
                            if (now - openedTimeRef.current < 400) return;
                            if (e.target === e.currentTarget) handleBgOk();
                        }}>
                        <CompactModal
                            $anchor={settingsAnchor || undefined}
                            onClick={e => e.stopPropagation()}
                            style={{ minWidth: '200px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto', padding: '12px', paddingBottom: '24px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#495057', marginBottom: '6px' }}>{t.drawing.bg_settings}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>
                                <BackgroundOptionButton
                                    $active={background === 'none'}
                                    onClick={() => setBackground('none')}
                                >
                                    {t.drawing.bg_none}
                                </BackgroundOptionButton>
                                <BackgroundOptionButton
                                    $active={background === 'lines'}
                                    onClick={() => setBackground('lines')}
                                >
                                    {t.drawing.bg_lines}
                                </BackgroundOptionButton>
                                <BackgroundOptionButton
                                    $active={background === 'grid'}
                                    onClick={() => setBackground('grid')}
                                >
                                    {t.drawing.bg_grid}
                                </BackgroundOptionButton>
                                <BackgroundOptionButton
                                    $active={background === 'dots'}
                                    onClick={() => setBackground('dots')}
                                >
                                    {t.drawing.bg_dots}
                                </BackgroundOptionButton>
                                <BackgroundOptionButton
                                    $active={background === 'english'}
                                    onClick={() => setBackground('english')}
                                >
                                    {t.drawing.bg_english}
                                </BackgroundOptionButton>
                                <BackgroundOptionButton
                                    $active={background === 'music'}
                                    onClick={() => setBackground('music')}
                                >
                                    {t.drawing.bg_music}
                                </BackgroundOptionButton>
                            </div>

                            <input
                                type="file"
                                ref={bgFileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*,.pdf"
                                onChange={handleBackgroundFileChange}
                            />

                            <BackgroundOptionButton
                                $active={background === 'image'}
                                onClick={() => {
                                    if (backgroundImage) {
                                        setBackground('image');
                                    } else {
                                        bgFileInputRef.current?.click();
                                    }
                                }}
                                style={{ width: '100%', marginBottom: '8px', minHeight: '36px' }}
                            >
                                {backgroundImage ? t.drawing.selected_file : t.drawing.upload_file}
                            </BackgroundOptionButton>

                            {backgroundImage && (
                                <div style={{
                                    padding: '8px',
                                    background: '#f8f9fa',
                                    borderRadius: '8px',
                                    border: '1px solid #e9ecef',
                                    marginBottom: '4px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FiTrash2
                                                size={18}
                                                style={{ cursor: 'pointer', color: '#ef4444' }}
                                                onClick={() => {
                                                    setBackgroundImage(null);
                                                    setBackground('none');
                                                }}
                                                title={t.drawing.clear || 'Remove Background'}
                                            />
                                            <div style={{ fontSize: '0.75rem', color: '#495057', fontWeight: 600 }}>{t.drawing.bg_image_intensity}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <input
                                                type="number"
                                                value={Math.round(backgroundImageOpacity * 100)}
                                                onChange={(e) => setBackgroundImageOpacity((parseInt(e.target.value) || 0) / 100)}
                                                style={{
                                                    width: '58px',
                                                    border: '1px solid transparent',
                                                    background: 'transparent',
                                                    fontSize: '0.7rem',
                                                    color: '#333',
                                                    fontWeight: 600,
                                                    textAlign: 'right',
                                                    padding: 0
                                                }}
                                                onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#ddd'; }}
                                                onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                                            />
                                            <span style={{ fontSize: '0.7rem', color: '#333', fontWeight: 600 }}>%</span>
                                        </div>
                                    </div>
                                    <CustomRangeInput
                                        type="range"
                                        min="1"
                                        max="100"
                                        $size={6}
                                        $thumbColor={`rgb(${255 - (255 - 51) * backgroundImageOpacity}, ${255 - (255 - 51) * backgroundImageOpacity}, ${255 - (255 - 51) * backgroundImageOpacity})`}
                                        value={backgroundImageOpacity * 100}
                                        onChange={(e) => setBackgroundImageOpacity(parseInt(e.target.value) / 100)}
                                        style={{ margin: '4px 0' }}
                                    />
                                </div>
                            )}

                            {background !== 'none' && background !== 'image' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#333', fontWeight: 500 }}>{t.drawing.bg_size}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <input
                                                type="number"
                                                value={backgroundSize}
                                                onChange={(e) => setBackgroundSize(parseInt(e.target.value) || 0)}
                                                style={{
                                                    width: '58px',
                                                    border: '1px solid transparent',
                                                    background: 'transparent',
                                                    fontSize: '0.7rem',
                                                    color: '#333',
                                                    fontWeight: 500,
                                                    textAlign: 'right',
                                                    padding: 0
                                                }}
                                                onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#ddd'; }}
                                                onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                                            />
                                            <span style={{ fontSize: '0.7rem', color: '#333', fontWeight: 500 }}>px</span>
                                        </div>
                                    </div>
                                    <CustomRangeInput
                                        type="range"
                                        min="10"
                                        max="300"
                                        $size={6}
                                        value={backgroundSize}
                                        onChange={(e) => setBackgroundSize(parseInt(e.target.value))}
                                        style={{ margin: '8px 0' }}
                                    />

                                    {(background === 'english' || background === 'music') && (
                                        <div style={{ marginTop: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#333', fontWeight: 500 }}>{t.drawing.bg_bundle_gap}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#333', fontWeight: 500 }}>x</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={backgroundBundleGap.toFixed(1)}
                                                            onChange={(e) => setBackgroundBundleGap(parseFloat(e.target.value) || 1)}
                                                            style={{
                                                                width: '58px',
                                                                border: '1px solid transparent',
                                                                background: 'transparent',
                                                                fontSize: '0.65rem',
                                                                color: '#333',
                                                                fontWeight: 500,
                                                                textAlign: 'right',
                                                                padding: 0
                                                            }}
                                                            onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#ddd'; }}
                                                            onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                                                        />
                                                    </div>
                                                    <FiRotateCcw
                                                        size={10}
                                                        style={{ cursor: 'pointer', color: '#868e96' }}
                                                        onClick={() => setBackgroundBundleGap(1)}
                                                        title={t.drawing.reset_defaults}
                                                    />
                                                </div>
                                            </div>
                                            <CustomRangeInput
                                                type="range"
                                                min="90" // 0.9
                                                max="300" // 3.0
                                                step="10"
                                                $size={5}
                                                value={backgroundBundleGap * 100}
                                                onChange={(e) => setBackgroundBundleGap(parseInt(e.target.value) / 100)}
                                                style={{ margin: '4px 0 8px 0' }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#333', fontWeight: 500 }}>{t.drawing.bg_darkness}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <input
                                                type="number"
                                                value={Math.round(lineOpacity * 100)}
                                                onChange={(e) => setLineOpacity((parseInt(e.target.value) || 0) / 100)}
                                                style={{
                                                    width: '58px',
                                                    border: '1px solid transparent',
                                                    background: 'transparent',
                                                    fontSize: '0.65rem',
                                                    color: '#333',
                                                    fontWeight: 500,
                                                    textAlign: 'right',
                                                    padding: 0
                                                }}
                                                onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#ddd'; }}
                                                onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                                            />
                                            <span style={{ fontSize: '0.7rem', color: '#333', fontWeight: 500 }}>%</span>
                                        </div>
                                    </div>
                                    <CustomRangeInput
                                        type="range"
                                        min="5"
                                        max="80"
                                        $size={6}
                                        $thumbColor={`rgb(${255 - (255 - 51) * lineOpacity}, ${255 - (255 - 51) * lineOpacity}, ${255 - (255 - 51) * lineOpacity})`}
                                        value={lineOpacity * 100}
                                        onChange={(e) => setLineOpacity(parseInt(e.target.value) / 100)}
                                        style={{ margin: '8px 0' }}
                                    />
                                </>
                            )}

                            <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#333' }}>{t.drawing.bg_paper_color}</div>
                                <div style={{ display: 'flex', background: '#f1f3f5', padding: '2px', borderRadius: '4px' }}>
                                    <button
                                        onClick={() => setBackgroundColorType('gray')}
                                        style={{
                                            padding: '2px 8px',
                                            fontSize: '0.7rem',
                                            border: 'none',
                                            borderRadius: '3px',
                                            background: backgroundColorType === 'gray' ? 'white' : 'transparent',
                                            boxShadow: backgroundColorType === 'gray' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                            cursor: 'pointer',
                                            color: backgroundColorType === 'gray' ? '#333' : '#888'
                                        }}
                                    >
                                        {t.drawing.bg_color_gray}
                                    </button>
                                    <button
                                        onClick={() => setBackgroundColorType('beige')}
                                        style={{
                                            padding: '2px 8px',
                                            fontSize: '0.7rem',
                                            border: 'none',
                                            borderRadius: '3px',
                                            background: backgroundColorType === 'beige' ? 'white' : 'transparent',
                                            boxShadow: backgroundColorType === 'beige' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                            cursor: 'pointer',
                                            color: backgroundColorType === 'beige' ? '#333' : '#888'
                                        }}
                                    >
                                        {t.drawing.bg_color_beige}
                                    </button>
                                    <button
                                        onClick={() => setBackgroundColorType('blue')}
                                        style={{
                                            padding: '2px 8px',
                                            fontSize: '0.7rem',
                                            border: 'none',
                                            borderRadius: '3px',
                                            background: backgroundColorType === 'blue' ? 'white' : 'transparent',
                                            boxShadow: backgroundColorType === 'blue' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                            cursor: 'pointer',
                                            color: backgroundColorType === 'blue' ? '#333' : '#888'
                                        }}
                                    >
                                        {t.drawing.bg_color_blue}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#333', fontWeight: 500 }}>{t.drawing.bg_intensity}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <input
                                        type="number"
                                        value={backgroundColorIntensity}
                                        onChange={(e) => setBackgroundColorIntensity(parseInt(e.target.value) || 0)}
                                        style={{
                                            width: '40px',
                                            border: '1px solid transparent',
                                            background: 'transparent',
                                            fontSize: '0.7rem',
                                            color: '#333',
                                            fontWeight: 500,
                                            textAlign: 'right',
                                            padding: 0
                                        }}
                                        onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#ddd'; }}
                                        onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: '#333', fontWeight: 500 }}>%</span>
                                </div>
                            </div>
                            <CustomRangeInput
                                type="range"
                                min="0"
                                max="100"
                                $size={6}
                                $thumbColor={currentBackgroundColor}
                                value={backgroundColorIntensity}
                                onChange={(e) => setBackgroundColorIntensity(parseInt(e.target.value))}
                                style={{ margin: '8px 0' }}
                            />

                            <div style={{ borderTop: '1px solid #eee', margin: '8px 0 4px 0' }}></div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <CompactModalButton
                                    onClick={() => {
                                        const settings: any = {
                                            type: background,
                                            size: backgroundSize,
                                            intensity: backgroundColorIntensity,
                                            colorType: backgroundColorType,
                                            opacity: lineOpacity,
                                            bundleGap: backgroundBundleGap,
                                            imageOpacity: backgroundImageOpacity
                                        };

                                        if (background === 'image' && backgroundImage) {
                                            try {
                                                if (backgroundImage instanceof HTMLCanvasElement) {
                                                    settings.imageData = backgroundImage.toDataURL('image/png');
                                                } else {
                                                    settings.imageData = backgroundImage.src;
                                                }
                                            } catch (e) {
                                                console.error('Failed to capture background image for default settings', e);
                                            }
                                        }

                                        try {
                                            localStorage.setItem('fabric_default_background_v2', JSON.stringify(settings));
                                        } catch (e) {
                                            console.error('Failed to save background defaults to localStorage (possibly too large)', e);
                                            // If it failed due to size, try saving without the image data as a fallback
                                            delete settings.imageData;
                                            localStorage.setItem('fabric_default_background_v2', JSON.stringify(settings));
                                            alert('Background settings saved, but the image was too large to be set as default.');
                                        }

                                        setIsBgPickerOpen(false);
                                        setSettingsAnchor(null);
                                    }}
                                    style={{ marginRight: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.4rem', border: '1px solid #ced4da', background: '#f8f9fa' }}
                                >
                                    {t.drawing.bg_save_default}
                                </CompactModalButton>
                                <CompactModalButton
                                    onClick={handleBgCancel}
                                >
                                    {t.drawing.cancel}
                                </CompactModalButton>
                                <CompactModalButton
                                    $variant="primary"
                                    onClick={handleBgOk}
                                >
                                    {t.drawing.ok}
                                </CompactModalButton>
                            </div>
                        </CompactModal>
                    </Backdrop>
                )
                }

                <CanvasWrapper
                    ref={containerRef}
                    $side={scrollbarSide}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                        ...backgroundStyle,
                        display: 'grid',
                        gridTemplateColumns: scrollbarSide === 'left' ? '12px 1fr' : '1fr 12px',
                        gridTemplateRows: (isZoomLocked || canvasScale <= 1.001) ? '1fr 0px' : '1fr 12px',
                        gridTemplateAreas: (isZoomLocked || canvasScale <= 1.001)
                            ? (scrollbarSide === 'left' ? '"vert main" "corner horiz"' : '"main vert" "horiz corner"') // technically bottom row is 0px so hidden
                            : (scrollbarSide === 'left' ? '"vert main" "corner horiz"' : '"main vert" "horiz corner"'),
                        overflow: 'hidden', // Container does not scroll
                        direction: 'ltr' // Always LTR for Grid
                    }}
                    className="canvas-scrollbar-container"
                >
                    {/* Vertical Scrollbar */}
                    {/* Vertical Scrollbar */}
                    <StyledScrollbar
                        ref={verticalScrollRef}
                        onScroll={handleVerticalScroll}
                        style={{
                            gridArea: 'vert',
                            overflowY: 'scroll',
                            overflowX: 'hidden'
                            // Removed width:100% since component handles it, but grid area constrains it.
                        }}
                    >
                        <div style={{ height: `${pageHeightState * canvasScale}px`, width: '1px' }} />
                    </StyledScrollbar>

                    {/* Main Canvas Viewport */}
                    <div
                        ref={canvasViewportRef}
                        style={{
                            gridArea: 'main',
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0 }} onTouchStart={(e) => e.stopPropagation()}>
                            <canvas ref={canvasRef} />
                        </div>
                    </div>

                    {/* Horizontal Scrollbar */}
                    <StyledScrollbar
                        ref={horizontalScrollRef}
                        onScroll={handleHorizontalScroll}
                        style={{
                            gridArea: 'horiz',
                            overflowX: 'scroll',
                            overflowY: 'hidden',
                            display: (isZoomLocked || canvasScale <= 1.001) ? 'none' : 'block'
                        }}
                    >
                        <div style={{ width: `${Math.max(pageWidthState * canvasScale, (fabricCanvasRef.current?.getWidth() || 0))}px`, height: '1px' }} />
                    </StyledScrollbar>

                    {/* Corner (Visual Spacer) */}
                    <div style={{
                        gridArea: 'corner',
                        background: '#f1f1f1',
                        display: (isZoomLocked || canvasScale <= 1.001) ? 'none' : 'block'
                    }} />

                </CanvasWrapper>
            </ModalContainer >

            {
                pdfDocToSelect && (
                    <PdfPageSelector
                        pdfDoc={pdfDocToSelect}
                        t={t}
                        onSelect={(canvas) => {
                            processImage(canvas);
                            setPdfDocToSelect(null);
                        }}
                        onCancel={() => setPdfDocToSelect(null)}
                    />
                )
            }

            <ConfirmModal
                isOpen={isClearConfirmOpen}
                message={t.drawing?.clear_all_confirm || 'Clear all?'}
                onConfirm={() => {
                    handleClear();
                    setIsClearConfirmOpen(false);
                }}
                onCancel={() => setIsClearConfirmOpen(false)}
                confirmText={t.drawing?.clear || 'Clear'}
                cancelText={t.drawing?.cancel || 'Cancel'}
                isDestructive={true}
            />

            <ConfirmModal
                isOpen={isPaletteResetConfirmOpen}
                message={t.drawing?.palette_reset_confirm || 'Reset this palette?'}
                onConfirm={() => {
                    if (paletteResetIndex !== null) handlePaletteReset(paletteResetIndex);
                    setIsPaletteResetConfirmOpen(false);
                }}
                onCancel={() => setIsPaletteResetConfirmOpen(false)}
                confirmText={t.drawing?.reset || 'Reset'}
                cancelText={t.drawing?.cancel || 'Cancel'}
            />

            {
                isExitConfirmOpen && (
                    <Backdrop style={{ zIndex: 20000 }}>
                        <CompactModal onClick={e => e.stopPropagation()} style={{ padding: '24px', width: '95vw', maxWidth: '400px', borderRadius: '16px', maxHeight: '80vh' }}>
                            <h3 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{t.drawing?.exit_title || 'Exit Canvas'}</h3>
                            <p style={{ color: '#4b5563', lineHeight: '1.6', margin: '12px 0 24px 0', fontSize: '0.95rem' }}>
                                {t.drawing?.cancel_confirm || 'Are you sure you want to exit? Unsaved changes will be lost.'}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <CompactModalButton
                                    $variant="primary"
                                    onClick={handleSaveAndExit}
                                    style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '0.95rem' }}
                                >
                                    {t.drawing?.save_exit || 'Save and Exit'}
                                </CompactModalButton>
                                <CompactModalButton
                                    onClick={handleConfirmExit}
                                    style={{ padding: '12px 16px', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', borderColor: '#fecaca', fontSize: '0.95rem' }}
                                >
                                    {t.drawing?.exit_no_save || 'Exit without Saving'}
                                </CompactModalButton>
                                <CompactModalButton
                                    onClick={() => setIsExitConfirmOpen(false)}
                                    style={{ padding: '12px 16px', borderRadius: '8px', color: '#4b5563', fontSize: '0.95rem' }}
                                >
                                    {t.drawing?.exit_cancel || 'Cancel'}
                                </CompactModalButton>
                            </div>
                        </CompactModal>
                    </Backdrop>
                )
            }

            {
                isHelpOpen && (
                    <Backdrop onClick={() => setIsHelpOpen(false)} style={{ zIndex: 11000 }}>
                        <CompactModal onClick={e => e.stopPropagation()} style={{ padding: '20px', width: '95vw', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }}>
                            <div style={{ padding: '8px' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600, color: '#111827', borderBottom: '2px solid #f1f3f5', paddingBottom: '10px' }}>📘 {t.drawing?.help || 'Canvas Guide'}</h3>

                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 600, color: '#1971c2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⌨️ {t.drawing?.shortcuts || 'Shortcuts'}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 24px', fontSize: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_select || 'Select'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>V</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_pen || 'Pen'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>P</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_line || 'Line'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>L</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_rect || 'Rect'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>R</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_circle || 'Circle'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>C</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_text || 'Text'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>T</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_eraser || 'Eraser'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>E</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_delete || 'Delete'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>D</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_undo || 'Undo'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>⌘Z</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_redo || 'Redo'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>⌘⇧Z</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_size || 'Size 1-5'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>1-5</kbd></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#495057' }}>{t.drawing?.sc_del_sel || 'Del Select'}</span><kbd style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #dee2e6', boxShadow: '0 1px 0 #dee2e6', color: '#333' }}>Del</kbd></div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 600, color: '#2f9e44', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💡 {t.drawing?.help_tips || 'Features & Tips'}</h4>
                                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', lineHeight: 1.6, color: '#495057', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><b>{t.drawing?.help_tip_detail_title}</b>: {t.drawing?.help_tip_detail_desc}</li>
                                        <li><b>{t.drawing?.help_tip_eraser_title}</b>: <span style={{ display: 'inline-flex', verticalAlign: 'text-bottom' }}><PixelEraserIcon /></span> <span style={{ display: 'inline-flex', verticalAlign: 'text-bottom' }}><ObjectEraserIcon /></span> {t.drawing?.help_tip_eraser_desc}</li>
                                        <li><b>{t.drawing?.help_tip_bg_title}</b>: <span style={{ display: 'inline-flex', verticalAlign: 'text-bottom' }}><BackgroundIcon /></span> {t.drawing?.help_tip_bg_desc}</li>
                                        <li><b>{t.drawing?.help_tip_image_title}</b>: <FiDownload size={14} style={{ verticalAlign: 'text-bottom' }} /> {t.drawing?.help_tip_image_desc}</li>
                                        <li><b>{t.drawing?.help_tip_clear_title}</b>: <FiTrash2 size={14} style={{ verticalAlign: 'text-bottom' }} /> {t.drawing?.help_tip_clear_desc}</li>
                                        <li><b>{t.drawing?.help_tip_cancel_title}</b>: <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', border: '1px solid #ced4da', verticalAlign: 'text-bottom', margin: '0 2px' }}><FiX size={10} color="#333" /></span> {t.drawing?.help_tip_cancel_desc}</li>
                                        <li><b>{t.drawing?.help_tip_save_title}</b>: <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: '#333', border: '1px solid #333', verticalAlign: 'text-bottom', margin: '0 2px' }}><FiCheck size={10} color="#ffffff" /></span> {t.drawing?.help_tip_save_desc}</li>
                                    </ul>
                                </div>
                            </div>
                            <CompactModalFooter>
                                <div />
                                <CompactModalButton onClick={() => setIsHelpOpen(false)} $variant="primary">
                                    {t.drawing?.close || 'Close'}
                                </CompactModalButton>
                            </CompactModalFooter>
                        </CompactModal>
                    </Backdrop>
                )
            }

            {
                isConfigOpen && (
                    <ToolbarConfigurator
                        currentItems={toolbarItems}
                        allItems={INITIAL_TOOLBAR_ITEMS}
                        onSaveItems={(items) => setToolbarItems(items)}
                        onClose={() => setIsConfigOpen(false)}
                        colors={availableColors}
                        brushSizes={availableBrushSizes}
                        scrollbarSide={scrollbarSide}
                        onScrollbarSideChange={setScrollbarSide}
                        maxPages={maxPages}
                        onMaxPagesChange={setMaxPages}
                        defaultZoomLocked={(() => {
                            const saved = localStorage.getItem('fabric_default_zoom_locked');
                            if (saved !== null) return saved === 'true';
                            return true;
                        })()}
                        onDefaultZoomLockedChange={(val) => {
                            localStorage.setItem('fabric_default_zoom_locked', val ? 'true' : 'false');
                            setIsZoomLocked(val);
                        }}
                        language={language as Language}
                        t={t}
                    />
                )
            }
            {
                savedToastVisible && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '16px 32px',
                        borderRadius: '12px',
                        zIndex: 12000,
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                        animation: 'fadeInOut 0.3s ease'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#20c997',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FiCheck size={28} color="white" />
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{'Saved!'}</span>
                    </div>
                )
            }
        </ModalOverlay >
    );
};
