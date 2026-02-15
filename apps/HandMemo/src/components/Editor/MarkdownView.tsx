import React from 'react';
import { useLanguage, metadataCache } from '@memosuite/shared';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Comment } from '../../db';

import ReactMarkdown from 'react-markdown';

import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import styled, { useTheme } from 'styled-components';
import { fabric } from 'fabric';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { calculateBackgroundColor, createBackgroundPattern } from '@memosuite/shared-drawing';
import { FiArrowDown, FiExternalLink, FiMaximize, FiSettings, FiSun, FiVolume2, FiX } from 'react-icons/fi';
import { FaYoutube } from 'react-icons/fa';


const MobileObjectGuard: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => {
  const [isTwoFingers, setIsTwoFingers] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const { language } = useLanguage();
  const timerRef = React.useRef<any>(null);
  const hintTimerRef = React.useRef<any>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      setIsTwoFingers(true);
      setShowHint(false);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    } else if (e.touches.length === 1) {
      // Start hint timer on first touch if not already showing
      if (!showHint && !hintTimerRef.current) {
        hintTimerRef.current = setTimeout(() => setShowHint(true), 600);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !isTwoFingers) {
      if (!showHint && !hintTimerRef.current) {
        hintTimerRef.current = setTimeout(() => setShowHint(true), 600);
      }
    } else if (e.touches.length >= 2) {
      setIsTwoFingers(true);
      setShowHint(false);
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }

    timerRef.current = setTimeout(() => {
      setIsTwoFingers(false);
      setShowHint(false);
    }, 500);
  };

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 10,
          pointerEvents: isTwoFingers ? 'none' : 'auto',
          touchAction: 'pan-y', // Allows parent page to scroll with 1 finger
          display: 'flex',
          alignItems: 'flex-end', // More subtle bottom position
          justifyContent: 'center',
          background: 'transparent',
          transition: 'all 0.3s'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
      >
        <div style={{
          position: 'absolute',
          bottom: '20px',
          zIndex: 20, // Ensure it's above the guard layer
          opacity: showHint ? 1 : 0,
          transform: `translateY(${showHint ? '0' : '10px'})`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)', // Add subtle border for visibility
          color: 'white',
          padding: '8px 16px',
          borderRadius: '24px',
          fontSize: '11px',
          fontWeight: 600,
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>✌️</span>
          {language === 'ko' ? '두 손가락 터치 후 내부 스크롤' : 'Use two fingers to scroll inside'}
        </div>
      </div>
      {children}
    </div>
  );
};
const JumpBackButton = styled.button`
  position: absolute;
  top: -34px;
  right: 0;
  z-index: 1000;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)'};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.primary}40;
  padding: 5px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.23s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);

  &:hover {
    transform: translateY(-1px);
    background: ${({ theme }) => theme.colors.primary};
    color: white;
    box-shadow: 0 4px 12px ${({ theme }) => theme.colors.primary}40;
  }

  &:active {
    transform: translateY(0);
  }
`;



const MarkdownContainer = styled.div.attrs({ className: 'markdown-view markdown-content' }) <{ $tableHeaderBg?: string; $fontSize?: number }>`
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};
  overscroll-behavior: none;
  -webkit-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;
  font-size: ${props => props.$fontSize ? `${props.$fontSize}pt` : 'inherit'};
  
  /* Match LexicalEditor's sizing: 1px border + 0.5rem padding */
  padding: 0.5rem;
  padding-left: calc(0.5rem + 1px);
  padding-right: calc(0.5rem + 1px);

  p {
    margin-bottom: 0px;
    margin-top: 0px;
  }

  h1 { font-size: 1.8em; font-weight: 700; margin: 0.5em 0; }
  h2 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; }
  h3 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0; }
  h4, h5, h6 { font-size: 1.1em; font-weight: 700; margin: 0.5em 0; }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  blockquote {
    border-left: 4px solid ${({ theme }) => theme.colors.border};
    padding-left: 1rem;
    margin-left: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  code {
    background: ${({ theme }) => theme.colors.surface};
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
  }

  pre {
    background: ${({ theme }) => theme.colors.surface};
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    
    code {
      background: transparent;
      padding: 0;
      color: inherit;
      font-size: 1em;
    }
  }

  ul, ol {
    padding-left: 1.5em;
  }

  input[type="checkbox"] {
    -webkit-appearance: none;
    appearance: none;
    width: 1.4em;
    height: 1.4em;
    border: 2px solid ${({ theme }) => theme.colors.primary};
    border-radius: 4px;
    margin: 0 0.4em 0.2em 0;
    vertical-align: middle;
    cursor: pointer;
    position: relative;
    background: transparent;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:checked {
      background: ${({ theme }) => theme.colors.primary};
      border-color: ${({ theme }) => theme.colors.primary};
    }

    &:checked::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 45%;
      width: 25%;
      height: 50%;
      border: solid white;
      border-width: 0 2.5px 2.5px 0;
      transform: translate(-50%, -50%) rotate(45deg);
    }

    &:hover {
      background: ${({ theme }) => theme.colors.primary}22;
    }
  }

  img {
    max-width: 100%;
    border-radius: 6px;
    display: block;
    margin: 1em auto;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
    
    th, td {
      border: 1px solid ${({ theme }) => theme.colors.border};
      padding: 0.5rem;
      text-align: left;
    }

    th {
      background: ${({ theme, $tableHeaderBg }) => $tableHeaderBg || theme.colors.surface};
      font-weight: 600;
    }
  }

  @media screen {
    .page-break {
      border-top: 2px dashed ${({ theme }) => theme.colors.border};
      margin: 2rem 0;
      position: relative;
      height: 0;
      overflow: visible;
    }
    .page-break::after {
      content: "Page Break";
      position: absolute;
      top: -10px;
      right: 1rem;
      background: ${({ theme }) => theme.colors.background || theme.colors.surface};
      padding: 0 8px;
      font-size: 10px;
      color: ${({ theme }) => theme.colors.textSecondary};
      font-weight: 600;
      border-radius: 4px;
      border: 1px solid ${({ theme }) => theme.colors.border};
    }
  }

  @media print {
    .page-break {
      display: block;
      height: 0;
      page-break-before: always;
      break-before: page;
      border: none;
      margin: 0;
      padding: 0;
    }
  }

  /* Collapsible / Details Styles */
  details {
    border-radius: 6px;
    padding: 0 12px 12px 12px;
    margin: 8px 0;
    transition: all 0.2s ease;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    overflow: hidden;

    summary {
      padding: 8px 0;
      cursor: pointer;
      font-weight: 600;
      color: ${({ theme }) => theme.colors.primary};
      outline: none;
      user-select: none;
      font-size: 0.9rem;

      &::-webkit-details-marker {
        margin-right: 8px;
      }
    }

    & > *:not(summary) {
      margin-bottom: 4px;
    }
  }
`;

const PREVIEW_CACHE = new Map<string, string>();
// Global registry for YT players to enable internal seeking



const FabricPreview = React.memo(({ json, onClick }: { json: string; onClick?: () => void }) => {
  const [imgSrc, setImgSrc] = React.useState<string | null>(PREVIEW_CACHE.get(json) || null);
  const [loading, setLoading] = React.useState(!imgSrc);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    if (imgSrc) return;

    // NAVIGATION SAFETY: Give 400ms buffer for navigation/switching to complete
    const timer = setTimeout(() => {
      if (!isMountedRef.current) return;

      const runDrawing = () => {
        if (!isMountedRef.current) return;
        try {
          const pureJson = json.split('\n<!--SVG_PREVIEW_START-->')[0];
          const data = JSON.parse(pureJson);

          const offscreen = document.createElement('canvas');
          const staticCanvas = new fabric.StaticCanvas(offscreen, {
            enableRetinaScaling: false,
            renderOnAddRemove: false,
            skipTargetFind: true
          });

          const finishRendering = (bgPattern?: fabric.Pattern) => {
            if (!isMountedRef.current) {
              staticCanvas.dispose();
              return;
            }

            const w = staticCanvas.getWidth() || 800;
            const fullH = staticCanvas.getHeight() || 600;

            // Calculate content height to crop empty bottom space
            let maxBottom = 0;
            staticCanvas.getObjects().forEach(obj => {
              if ((obj as any).isPageBackground || (obj as any).excludeFromExport) return;
              const bottom = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1);
              if (bottom > maxBottom) maxBottom = bottom;
            });

            // Crop to content + small margin, but keep at least 200px and don't exceed full height
            const h = Math.min(fullH, Math.max(200, maxBottom + 60));

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = w;
            exportCanvas.height = h;
            const ctx = exportCanvas.getContext('2d');

            if (ctx) {
              // 1. Draw Background Pattern
              if (bgPattern) {
                const src = (bgPattern as any).source;
                if (src) {
                  const pat = ctx.createPattern(src, bgPattern.repeat || 'repeat');
                  if (pat) {
                    ctx.fillStyle = pat;
                    ctx.fillRect(0, 0, w, h);
                  }
                }
              }

              // 2. Draw Fabric Drawing on top
              // We draw the original staticCanvas. It will be cropped by exportCanvas dimensions.
              ctx.drawImage(staticCanvas.getElement(), 0, 0);

              const base64 = exportCanvas.toDataURL('image/png', 0.5);

              PREVIEW_CACHE.set(json, base64);
              setImgSrc(base64);
            }

            setLoading(false);
            staticCanvas.dispose();
          };

          staticCanvas.loadFromJSON(data, () => {
            if (!isMountedRef.current) {
              staticCanvas.dispose();
              return;
            }

            // Sync canvas dimensions
            const w = data.width || 800;
            const h = data.height || 600;
            staticCanvas.setDimensions({ width: w, height: h });

            if (data.backgroundConfig) {
              const cfg = data.backgroundConfig;
              const bgColor = calculateBackgroundColor(cfg.colorType, cfg.intensity);

              const renderWithPattern = (img?: HTMLImageElement) => {
                if (!isMountedRef.current) return;
                const pat = createBackgroundPattern(
                  cfg.type, bgColor, cfg.opacity, cfg.size, false, cfg.bundleGap, img, cfg.imageOpacity, staticCanvas.getWidth()
                );
                staticCanvas.renderAll();
                finishRendering(pat as fabric.Pattern);
              };

              if (cfg.type === 'image' && cfg.imageData) {
                const img = new Image();
                img.onload = () => renderWithPattern(img);
                img.src = cfg.imageData;
                return;
              } else {
                renderWithPattern();
                return;
              }
            }

            finishRendering();
          });
        } catch (e) {
          console.error('Fabric load fail', e);
          if (isMountedRef.current) setLoading(false);
        }
      };

      // IDLE PRIORITY: Drawing work should not block user interactions
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runDrawing, { timeout: 1500 });
      } else {
        runDrawing();
      }
    }, 400);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, [json, imgSrc]);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        border: onClick ? '1px solid #eee' : 'none',
        borderRadius: onClick ? '4px' : '0',
        margin: onClick ? '8px 0' : '0',
        minHeight: imgSrc ? 'auto' : '120px',
        width: '100%',
        position: 'relative'
      }}
    >
      {loading ? (
        <div style={{ padding: '20px', color: '#adb5bd', fontSize: '0.8rem', fontStyle: 'italic' }}>
          Loading drawing...
        </div>
      ) : imgSrc ? (
        <img src={imgSrc} alt="Drawing" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
      ) : null}
    </div>
  );
});

const SpreadsheetPreview = ({ json, onClick }: { json: string; onClick?: () => void }) => {
  const { language } = useLanguage();
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data) || data.length === 0) return null;

    const sheet = data[0];
    const celldata = sheet.celldata || [];
    const matrixData = sheet.data; // 2D array format

    // Check if we have data in either format
    const hasCelldata = Array.isArray(celldata) && celldata.length > 0;
    const hasMatrixData = Array.isArray(matrixData) && matrixData.length > 0;

    if (!hasCelldata && !hasMatrixData) {
      return (
        <div
          onClick={onClick}
          style={{
            background: '#fcfcfd',
            border: '1px solid #d1d5db',
            borderLeft: '4px solid #00acc1',
            borderRadius: '6px',
            padding: '16px 20px',
            margin: '16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: onClick ? 'pointer' : 'default',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '20px' }}>📊</div>
          <div>
            <div style={{ fontWeight: 600, color: '#343a40' }}>{language === 'ko' ? '스프레드시트 (비어 있음)' : 'Spreadsheet (Empty)'}</div>
            <div style={{ fontSize: '11px', color: '#868e96' }}>{onClick ? (language === 'ko' ? '클릭하여 편집' : 'Click to open editor') : (language === 'ko' ? '데이터 없음' : 'No data')}</div>
          </div>
        </div>
      );
    }

    let maxRow = 0;
    let maxCol = 0;
    const grid: any[][] = [];

    // Handle 2D matrix data format
    if (hasMatrixData) {
      maxRow = Math.min(matrixData.length - 1, 100);
      for (let r = 0; r <= maxRow; r++) {
        grid[r] = [];
        const row = matrixData[r] || [];
        maxCol = Math.max(maxCol, row.length - 1);
        for (let c = 0; c < row.length && c <= 20; c++) {
          const cell = row[c];
          if (cell) {
            grid[r][c] = cell.m || cell.v || "";
          } else {
            grid[r][c] = "";
          }
        }
      }
      maxCol = Math.min(maxCol, 20);
    }
    // Handle celldata (sparse) format
    else if (hasCelldata) {
      celldata.forEach((cell: any) => {
        if (cell.r > maxRow) maxRow = cell.r;
        if (cell.c > maxCol) maxCol = cell.c;
      });

      const displayMaxRow = Math.min(maxRow, 100);
      const displayMaxCol = Math.min(maxCol, 20);

      for (let r = 0; r <= displayMaxRow; r++) {
        grid[r] = [];
        for (let c = 0; c <= displayMaxCol; c++) {
          grid[r][c] = "";
        }
      }

      celldata.forEach((cell: any) => {
        if (cell.r <= displayMaxRow && cell.c <= displayMaxCol) {
          const val = cell.v?.m || cell.v?.v || "";
          grid[cell.r][cell.c] = val;
        }
      });

      maxCol = displayMaxCol;
    }

    return (
      <MobileObjectGuard onClick={onClick}>
        <div
          style={{
            overflow: 'auto',
            maxHeight: '400px',
            margin: '0',
            border: 'none',
            cursor: onClick ? 'pointer' : 'default',
            backgroundColor: '#fff'
          }}
        >
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', lineHeight: '20px' }}>
            <thead>
              <tr>
                <th style={{ background: '#f8f9fa', border: '1px solid #d1d5db', width: '32px', height: '20px', textAlign: 'center', color: '#666', padding: '0 4px', fontWeight: 500 }}>#</th>
                {Array.from({ length: maxCol + 1 }).map((_, c) => (
                  <th key={c} style={{ background: '#f8f9fa', border: '1px solid #d1d5db', height: '20px', padding: '0 8px', fontWeight: 500, color: '#666', textAlign: 'center' }}>
                    {String.fromCharCode(65 + c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  <td style={{ background: '#f8f9fa', border: '1px solid #d1d5db', textAlign: 'center', color: '#666', fontSize: '11px', padding: '0 4px', height: '20px' }}>{r + 1}</td>
                  {row.map((val, c) => (
                    <td key={c} style={{ border: '1px solid #d1d5db', height: '20px', padding: '0 6px', minWidth: '60px', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', verticalAlign: 'middle' }}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(maxRow >= 100 || maxCol >= 20) && (
            <div style={{ padding: '8px', textAlign: 'center', color: '#666', fontSize: '11px', background: '#f8f9fa', borderTop: '1px solid #d1d5db', position: 'sticky', bottom: 0, left: 0, width: '100%', boxSizing: 'border-box' }}>
              {language === 'ko' ? '... 항목 더 있음 (편집기에서 확인 가능) ...' : '... more data available in editor ...'}
            </div>
          )}
        </div>
      </MobileObjectGuard>
    );
  } catch (e) {
    return <div style={{ color: 'red', fontSize: '12px' }}>Failed to render spreadsheet preview</div>;
  }
};

const WebPreview = ({ url }: { url: string }) => {
  const { language } = useLanguage();
  const domain = new URL(url).hostname;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <div style={{
      margin: '20px 0',
      border: '1px solid #e1e4e8',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Bookmark Header */}
      <div style={{
        padding: '14px 18px',
        background: '#fcfcfd',
        borderBottom: '1px solid #e1e4e8',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <img
          src={faviconUrl}
          alt="icon"
          style={{ width: '20px', height: '20px', borderRadius: '4px' }}
          onError={(e: any) => e.target.style.display = 'none'}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#1a1d21',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {domain}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#6a737d',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {url}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 600,
            background: '#ef8e13',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(239, 142, 19, 0.2)',
            flexShrink: 0
          }}
        >
          {language === 'ko' ? '사이트 방문' : 'Visit Site'}
        </a>
      </div>

      {/* Preview Area with Fallback Message */}
      <MobileObjectGuard>
        <div style={{
          height: '480px',
          width: '100%',
          position: 'relative',
          background: '#f8f9fa'
        }}>
          {/* Fallback message shown if iframe is blocked or loading */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            color: '#868e96'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌐</div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {language === 'ko'
                ? '일부 사이트는 보안 정책상 미리보기를 허용하지 않습니다.'
                : 'Some sites may block previews due to security policies.'}
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {language === 'ko'
                ? '내용이 보이지 않으면 상단 버튼을 눌러 새 창에서 확인해주세요.'
                : 'If you cannot see the content, please use the button above to open it.'}
            </div>
          </div>

          <iframe
            src={url}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#ffffff' // Opaque background to cover fallback if successful
            }}
            title="Web Preview"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </MobileObjectGuard>
    </div>
  );
};

const YT_PLAYERS = new Map<string, any>();
let ACTIVE_YT_VIDEO_ID: string | null = null;

const YouTubePlayer = ({ videoId, startTimestamp, memoId,
  wordTitle,
  studyMode, isShort }: { videoId: string; startTimestamp?: number; memoId?: number;
  wordTitle?: string;
  studyMode?: string; isShort?: boolean }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);
  const intervalRef = React.useRef<any>(null);
  const isMounted = React.useRef(true);
  const [hasError, setHasError] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playbackRateToast, setPlaybackRateToast] = React.useState<number | null>(null);
  const [isCaptionsOn, setIsCaptionsOn] = React.useState(false);
  const [isCCSettingsOpen, setIsCCSettingsOpen] = React.useState(false);
  const [ccTracks, setCCTracks] = React.useState<any[]>([]);
  const [activeTrackCode, setActiveTrackCode] = React.useState<string>('off');
  const [ccFontSize, setCCFontSize] = React.useState(0);
  const [volumeToast, setVolumeToast] = React.useState<number | null>(null);

  const ccTimersRef = React.useRef<any[]>([]);
  const isSwitchingCCTrack = React.useRef(false);

  const toastTimerRef = React.useRef<any>(null);
  const clickTimerRef = React.useRef<any>(null);
  const ccClickTimerRef = React.useRef<any>(null);
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [isMouseIdle, setIsMouseIdle] = React.useState(false);
  const mouseIdleTimerRef = React.useRef<any>(null);
  const [isMobilePortrait, setIsMobilePortrait] = React.useState(false);
  const [brightness, setBrightness] = React.useState(1);
  const [brightnessToast, setBrightnessToast] = React.useState<number | null>(null);

  const touchStartRef = React.useRef<{
    x: number;
    y: number;
    vol: number;
    bright: number;
    currentTime: number;
    side: 'left' | 'right';
  } | null>(null);
  const touchTypeRef = React.useRef<'none' | 'vertical' | 'horizontal'>('none');

  React.useEffect(() => {
    const checkPortrait = () => {
      // Typically consider mobile as width < 768
      setIsMobilePortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    checkPortrait();
    window.addEventListener('resize', checkPortrait);
    return () => window.removeEventListener('resize', checkPortrait);
  }, []);


  const applyCaptionStyles = React.useCallback((overrideFontSize?: number) => {
    const player = playerRef.current;
    if (!player || !player.setOption) return;
    try {
      const fontSize = overrideFontSize !== undefined ? overrideFontSize : ccFontSize;
      player.setOption('captions', 'backgroundOpacity', 0);
      player.setOption('captions', 'windowOpacity', 0);
      player.setOption('captions', 'fontSize', fontSize);
    } catch (e) { }
  }, [ccFontSize]);

  React.useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // Handle cursor auto-hide in fullscreen
  React.useEffect(() => {
    const handleMouseMove = () => {
      if (!isFullScreen) return;
      setIsMouseIdle(false);
      if (mouseIdleTimerRef.current) clearTimeout(mouseIdleTimerRef.current);
      mouseIdleTimerRef.current = setTimeout(() => {
        setIsMouseIdle(true);
      }, 3000);
    };

    if (isFullScreen) {
      document.addEventListener('mousemove', handleMouseMove);
      setIsMouseIdle(false);
      mouseIdleTimerRef.current = setTimeout(() => setIsMouseIdle(true), 3000);
    } else {
      setIsMouseIdle(false);
      if (mouseIdleTimerRef.current) clearTimeout(mouseIdleTimerRef.current);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (mouseIdleTimerRef.current) clearTimeout(mouseIdleTimerRef.current);
    };
  }, [isFullScreen]);

  React.useEffect(() => {
    isMounted.current = true;

    const savedTime = localStorage.getItem(`yt_progress_${videoId}`);
    const resumeTime = savedTime ? parseInt(savedTime) : 0;

    // Priority: Explicit URL timestamp > Saved progress
    const startSeconds = startTimestamp !== undefined ? startTimestamp : (resumeTime > 10 ? resumeTime - 2 : resumeTime);

    const initPlayer = () => {
      if (!isMounted.current || !containerRef.current || playerRef.current) return;

      try {
        const YT = (window as any).YT;
        if (!YT || !YT.Player) return;

        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            start: startSeconds,
            origin: window.location.origin,
            modestbranding: 1,
            enablejsapi: 1,
            rel: 0,
            controls: 0,
            iv_load_policy: 3,
            fs: 1,
            disablekb: 1,
            cc_load_policy: 0
          },
          events: {
            onReady: () => {
              if (isMounted.current) {
                setIsReady(true);
                if (playerRef.current.getDuration) setDuration(playerRef.current.getDuration());
                if (!ACTIVE_YT_VIDEO_ID) ACTIVE_YT_VIDEO_ID = videoId;

                // Set default caption styles to transparent background
                setTimeout(() => {
                  applyCaptionStyles();
                }, 1500);

                // Auto-enable English ASR if no manual En tracks exist (likely an English video)
                const player = playerRef.current;
                setTimeout(() => {
                  try {
                    const tryAutoEnable = () => {
                      if (!isMounted.current || !player.getOption) return false;
                      const tracks = player.getOption('captions', 'tracklist') || [];

                      // Check for manual English tracks
                      const hasManualEn = tracks.some((t: any) =>
                        (t.languageCode?.includes('en') || t.displayName?.toLowerCase().includes('english')) &&
                        t.kind !== 'asr' && !t.languageCode?.startsWith('a.')
                      );

                      // Check for ASR English tracks
                      const asrEn = tracks.find((t: any) =>
                        (t.languageCode?.includes('en') || t.displayName?.toLowerCase().includes('english')) &&
                        (t.kind === 'asr' || t.languageCode?.startsWith('a.'))
                      );

                      if (!hasManualEn && asrEn) {
                        player.setOption('captions', 'track', { languageCode: asrEn.languageCode });
                        setActiveTrackCode(asrEn.languageCode);
                        setIsCaptionsOn(true);
                        setTimeout(() => {
                          if (isMounted.current) applyCaptionStyles();
                        }, 500);
                        return true;
                      }
                      return false;
                    };

                    // Initial try + retries since metadata can be slow
                    if (!tryAutoEnable()) {
                      setTimeout(() => { if (isMounted.current && !tryAutoEnable()) setTimeout(() => isMounted.current && tryAutoEnable(), 2000); }, 1000);
                    }
                  } catch (e) { }
                }, 1500);
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted.current) return;
              setIsPlaying(event.data === 1);
              if (event.data === 1) { // playing
                ACTIVE_YT_VIDEO_ID = videoId;
                if (!intervalRef.current) {
                  intervalRef.current = setInterval(() => {
                    if (playerRef.current && playerRef.current.getCurrentTime) {
                      const time = playerRef.current.getCurrentTime();
                      setCurrentTime(time);
                      const t = Math.floor(time);
                      if (t > 0) {
                        localStorage.setItem(`yt_progress_${videoId}`, String(t));
                        localStorage.setItem(`yt_last_active`, JSON.stringify({ videoId, time: t, timestamp: Date.now() }));
                      }
                    }
                  }, 500); // Faster updates for progress bar
                }
              } else { // paused/ended/etc
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                if (playerRef.current && playerRef.current.getCurrentTime) {
                  const currentTime = Math.floor(playerRef.current.getCurrentTime());
                  if (currentTime > 0) {
                    localStorage.setItem(`yt_progress_${videoId}`, String(currentTime));
                    localStorage.setItem(`yt_last_active`, JSON.stringify({ videoId, time: currentTime, timestamp: Date.now() }));
                  }
                }
              }
            },
            onError: () => {
              if (isMounted.current) setHasError(true);
            }
          }
        });
      } catch (err) {
        console.error('YT init fail', err);
        if (isMounted.current) setHasError(true);
      }
    };

    const handleAPIReady = () => {
      if (isMounted.current) initPlayer();
    };

    const checkAndInit = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        if (!(window as any).onYouTubeIframeAPIReady) {
          (window as any).onYouTubeIframeAPIReady = () => {
            window.dispatchEvent(new CustomEvent('youtubeAPIReady'));
          };

          if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
          }
        }
        window.addEventListener('youtubeAPIReady', handleAPIReady);
      }
    };

    checkAndInit();

    return () => {
      isMounted.current = false;
      if (videoId) YT_PLAYERS.delete(videoId);
      if (ACTIVE_YT_VIDEO_ID === videoId) ACTIVE_YT_VIDEO_ID = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('youtubeAPIReady', handleAPIReady);

      if (playerRef.current) {
        try {
          if (playerRef.current.destroy) {
            playerRef.current.destroy();
          }
        } catch (e) {
          // cleanup fail is okay
        }
        playerRef.current = null;
      }
    };
  }, [videoId, startTimestamp]);

  const [jumpedCommentId, setJumpedCommentId] = React.useState<number | null>(null);
  const { language, t } = useLanguage();

  const comments = useLiveQuery(
    () => (memoId ? db.comments.where('memoId').equals(memoId).sortBy('createdAt') : [] as Comment[]),
    [memoId]
  );

  const videoComments = React.useMemo(() => {
    if (!comments) return [];
    return comments.filter(c => c.content.includes(videoId));
  }, [comments, videoId]);

  const lastVideoCommentId = videoComments.length > 0 ? videoComments[videoComments.length - 1].id : null;

  React.useEffect(() => {
    const handleJump = (e: any) => {
      if (e.detail?.videoId === videoId) {
        setJumpedCommentId(e.detail.commentId);
        ACTIVE_YT_VIDEO_ID = videoId;
      } else {
        setJumpedCommentId(null);
      }
    };
    window.addEventListener('yt-jump-success', handleJump);
    return () => window.removeEventListener('yt-jump-success', handleJump);
  }, [videoId]);

  const handleReturn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (jumpedCommentId !== null) {
      window.dispatchEvent(new CustomEvent('return-to-comment', { detail: { commentId: jumpedCommentId } }));
      setJumpedCommentId(null);
    }
  };

  const scrollToLastComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lastVideoCommentId) {
      window.dispatchEvent(new CustomEvent('return-to-comment', { detail: { commentId: lastVideoCommentId } }));
    } else {
      // Scroll to the end of ALL comments if none for this video
      const lastId = (comments && comments.length > 0) ? comments[comments.length - 1].id : -1;
      window.dispatchEvent(new CustomEvent('return-to-comment', { detail: { commentId: lastId } }));
    }
  };

  React.useEffect(() => {
    if (isReady && playerRef.current && videoId) {
      YT_PLAYERS.set(videoId, playerRef.current);
      if (!ACTIVE_YT_VIDEO_ID) ACTIVE_YT_VIDEO_ID = videoId;
    }
  }, [isReady, videoId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const containerId = `yt-player-container-${videoId}`;

  const fetchTracks = (retries = 3) => {
    const player = playerRef.current;
    if (!player || !player.getOption) return;

    try {
      const tracks = player.getOption('captions', 'tracklist') || [];
      setCCTracks(tracks);

      const currentTrack = player.getOption('captions', 'track');
      console.log('[YT] Current track for dropdown:', currentTrack);

      if (currentTrack?.translationLanguage?.languageCode === 'ko') {
        setActiveTrackCode('ko-auto');
      } else if (currentTrack?.languageCode) {
        // Find if this language code is in tracks
        const hasExact = tracks.some((t: any) => t.languageCode === currentTrack.languageCode);

        // Logical check for "en-force" (English auto-gen)
        const isEnglish = currentTrack.languageCode.includes('en') || currentTrack.languageCode.startsWith('a.en');

        if (!hasExact && isEnglish) {
          setActiveTrackCode('en-force');
        } else {
          setActiveTrackCode(currentTrack.languageCode);
        }
      } else if (isCaptionsOn && activeTrackCode !== 'off') {
        // Keep our local state if player is briefly uncertain
        // This helps when module is just loaded
      } else {
        setActiveTrackCode('off');
      }

      if (tracks.length === 0 && retries > 0) {
        setTimeout(() => fetchTracks(retries - 1), 500);
      }
    } catch (err) {
      if (retries > 0) setTimeout(() => fetchTracks(retries - 1), 500);
    }
  };

  const toggleCaptions = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const player = playerRef.current;
    if (!player) return;

    try {
      if (isCaptionsOn) {
        player.unloadModule('captions');
        setIsCaptionsOn(false);
        setActiveTrackCode('off');
      } else {
        player.loadModule('captions');
        setIsCaptionsOn(true);
        setTimeout(() => {
          const currentTrack = player.getOption('captions', 'track');
          if (currentTrack?.languageCode) {
            setActiveTrackCode(currentTrack.languageCode);
          }
          applyCaptionStyles();
        }, 500);
      }
    } catch (err) {
      console.error('Captions toggle failed', err);
    }
    ACTIVE_YT_VIDEO_ID = videoId;
  };

  const toggleCCSettings = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const player = playerRef.current;
    if (!player) return;

    if (!isCCSettingsOpen) {
      fetchTracks();
    }
    setIsCCSettingsOpen(!isCCSettingsOpen);
    ACTIVE_YT_VIDEO_ID = videoId;
  };

  const toggleFullScreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    ACTIVE_YT_VIDEO_ID = videoId;
    const elem = document.getElementById(containerId);
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (document.activeElement?.closest('.CodeMirror')) return;

      if (ACTIVE_YT_VIDEO_ID !== videoId) return;

      const player = playerRef.current;
      if (!player) return;

      const key = e.key.toLowerCase();

      // Play/Pause: 'k' or 'Space'
      if (key === 'k' || e.key === ' ') {
        if (e.key === ' ' && !isFullScreen) return;
        e.preventDefault();
        if (isPlaying) player.pauseVideo();
        else player.playVideo();
      }
      // Fullscreen: 'f'
      else if (key === 'f') {
        e.preventDefault();
        toggleFullScreen();
      }
      // Subtitles: 'c'
      else if (key === 'c') {
        e.preventDefault();
        toggleCaptions();
      }
      // Mute/Unmute: 'm'
      else if (key === 'm') {
        e.preventDefault();
        if (player.isMuted()) {
          player.unMute();
        } else {
          player.mute();
        }
      }
      // Forward/Backward
      else if (key === 'j' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const skip = key === 'j' ? 10 : 5;
        const target = Math.max(0, player.getCurrentTime() - skip);
        setCurrentTime(target);
        player.seekTo(target, true);
      }
      else if (key === 'l' || e.key === 'ArrowRight') {
        e.preventDefault();
        const skip = key === 'l' ? 10 : 5;
        const target = Math.min(player.getDuration(), player.getCurrentTime() + skip);
        setCurrentTime(target);
        player.seekTo(target, true);
      }
      // Volume
      else if (e.key === 'ArrowUp') {
        if (!isFullScreen) return;
        e.preventDefault();
        const newVol = Math.min(100, player.getVolume() + 5);
        player.setVolume(newVol);
        setVolumeToast(newVol);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          if (isMounted.current) setVolumeToast(null);
        }, 1000);
      }
      else if (e.key === 'ArrowDown') {
        if (!isFullScreen) return;
        e.preventDefault();
        const newVol = Math.max(0, player.getVolume() - 5);
        player.setVolume(newVol);
        setVolumeToast(newVol);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          if (isMounted.current) setVolumeToast(null);
        }, 1000);
      }
      // Home / End
      else if (e.key === 'Home') {
        if (!isFullScreen) return;
        e.preventDefault();
        const target = 0;
        setCurrentTime(target);
        player.seekTo(target, true);
      }
      else if (e.key === 'End') {
        if (!isFullScreen) return;
        e.preventDefault();
        const target = player.getDuration();
        setCurrentTime(target);
        player.seekTo(target, true);
      }
      // Percent Jump: 0-9
      else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const percent = parseInt(e.key) * 10;
        const target = (player.getDuration() * percent) / 100;
        setCurrentTime(target);
        player.seekTo(target, true);
      }
      // Playback Speed: Shift + > ('.') and Shift + < (',')
      else if (e.key === '>' || e.key === '<') {
        e.preventDefault();
        const rates = player.getAvailablePlaybackRates();
        const currentRate = player.getPlaybackRate();
        const currentIndex = rates.indexOf(currentRate);

        let newRate = currentRate;
        if (e.key === '>') {
          if (currentIndex < rates.length - 1) {
            newRate = rates[currentIndex + 1];
            player.setPlaybackRate(newRate);
          }
        } else {
          if (currentIndex > 0) {
            newRate = rates[currentIndex - 1];
            player.setPlaybackRate(newRate);
          }
        }

        // Show toast
        setPlaybackRateToast(newRate);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          if (isMounted.current) setPlaybackRateToast(null);
        }, 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCaptionsOn, videoId, language]);

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    if (!wrapperRef.current?.parentElement) return;
    const updateScale = () => {
      if (!wrapperRef.current?.parentElement) return;
      const containerWidth = wrapperRef.current.parentElement.offsetWidth;
      if (containerWidth > 0) {
        // Method 44: Force YouTube into 'Mini-Player' mode (< 400px)
        // At this width, YouTube disables the large 'More videos' shelf on pause
        setScale(containerWidth / 380);
      }
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapperRef.current.parentElement);
    updateScale();
    return () => observer.disconnect();
  }, []);

  if (hasError) {
    return (
      <div style={{ borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <iframe
          width="100%"
          height="315"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3${startTimestamp ? `&start=${startTimestamp}` : ''}`}
          title="YouTube Video Fallback"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      margin: '16px 0',
      marginTop: (jumpedCommentId !== null || memoId) ? '40px' : '16px',
      transition: 'margin-top 0.3s ease'
    }}>
      <div style={{
        position: 'absolute',
        top: '-34px',
        right: 0,
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        {jumpedCommentId !== null && (
          <JumpBackButton onClick={handleReturn} title={t.comments.scroll_to_comment} style={{ position: 'static' }}>
            <FiArrowDown /> {language === 'ko' ? '댓글로 돌아가기' : 'Back to Comment'}
          </JumpBackButton>
        )}
        {memoId && (
          <JumpBackButton onClick={scrollToLastComment} title={lastVideoCommentId ? (language === 'ko' ? '댓글 있음' : 'Comments exist') : (language === 'ko' ? '댓글로 가기' : 'Go to comment')} style={{ position: 'static' }}>
            <FiArrowDown /> {lastVideoCommentId ? (language === 'ko' ? '댓글 있음' : 'Comments exist') : (language === 'ko' ? '댓글로 가기' : 'Go to comment')}
          </JumpBackButton>
        )}
      </div>
      <div
        id={`yt-player-container-${videoId}`}
        style={{
          position: 'relative',
          paddingBottom: isFullScreen ? 0 : '56.25%',
          height: isFullScreen ? '100%' : 0,
          overflow: 'hidden',
          borderRadius: isFullScreen ? 0 : '4px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          background: '#000',
          display: isFullScreen ? 'flex' : 'block',
          alignItems: isFullScreen ? 'center' : 'initial',
          justifyContent: isFullScreen ? 'center' : 'initial',
          cursor: (isFullScreen && isMouseIdle) ? 'none' : 'auto'
        }}>
        {/* Brightness Overlay */}
        {isFullScreen && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'black',
            opacity: 1 - brightness,
            pointerEvents: 'none',
            zIndex: 15
          }} />
        )}
        {!isReady && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '11px',
            background: '#111',
            zIndex: 1
          }}>
            YouTube Loading...
          </div>
        )}
        <div
          ref={wrapperRef}
          style={{
            position: isFullScreen ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            width: isFullScreen ? (isShort && isMobilePortrait ? '100vw' : 'min(100vw, calc(100vh * 16 / 9))') : '380px',
            height: isFullScreen ? (isShort && isMobilePortrait ? '100vh' : 'min(100vh, calc(100vw * 9 / 16))') : '214px',
            transform: isFullScreen ? 'none' : `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none'
          }}
        >
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Interaction Layer */}
        {isReady && (
          <div
            onClick={() => {
              if (isCCSettingsOpen) {
                setIsCCSettingsOpen(false);
                return;
              }

              if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
              clickTimerRef.current = setTimeout(() => {
                ACTIVE_YT_VIDEO_ID = videoId;
                isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo();
                clickTimerRef.current = null;
              }, 250);
            }}
            onDoubleClick={() => {
              if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
              }
              toggleFullScreen();
            }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 10,
              cursor: (isFullScreen && isMouseIdle) ? 'none' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'transparent',
              touchAction: isFullScreen ? 'none' : 'auto',
              WebkitTapHighlightColor: 'transparent',
              transition: 'none'
            }}
            onTouchStart={(e) => {
              if (!isFullScreen) return;
              const touch = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const x = touch.clientX - rect.left;

              touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                vol: playerRef.current?.getVolume() || 0,
                bright: brightness,
                currentTime: playerRef.current?.getCurrentTime() || 0,
                side: x < rect.width / 2 ? 'left' : 'right'
              };
              touchTypeRef.current = 'none';
            }
            }
            onTouchMove={(e) => {
              if (!isFullScreen || !touchStartRef.current) return;
              const touch = e.touches[0];
              const dx = touch.clientX - touchStartRef.current.x;
              const dy = touch.clientY - touchStartRef.current.y;

              if (touchTypeRef.current === 'none') {
                if (Math.abs(dx) > 10) touchTypeRef.current = 'horizontal';
                else if (Math.abs(dy) > 10) touchTypeRef.current = 'vertical';
              }

              if (touchTypeRef.current === 'horizontal') {
                // Seek logic: 1 pixel = 0.5 seconds (adjust sensitivity)
                const seekDelta = dx * 0.5;
                const target = Math.max(0, Math.min(duration, touchStartRef.current.currentTime + seekDelta));
                setCurrentTime(target);
                playerRef.current?.seekTo(target, true);
              } else if (touchTypeRef.current === 'vertical') {
                if (touchStartRef.current.side === 'right') {
                  // Volume logic: swipe up (dy negative) increases volume
                  const volDelta = -dy * 0.5;
                  const newVol = Math.max(0, Math.min(100, touchStartRef.current.vol + volDelta));
                  playerRef.current?.setVolume(newVol);
                  setVolumeToast(Math.round(newVol));
                  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = setTimeout(() => setVolumeToast(null), 1500);
                } else {
                  // Brightness logic
                  const brightDelta = -dy * 0.005;
                  const newBright = Math.max(0.1, Math.min(1, touchStartRef.current.bright + brightDelta));
                  setBrightness(newBright);
                  setBrightnessToast(newBright);
                  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = setTimeout(() => setBrightnessToast(null), 1500);
                }
              }
            }}
            onTouchEnd={() => {
              touchStartRef.current = null;
              touchTypeRef.current = 'none';
            }}
          >
            {/* Subtitle Settings Overlay */}
            {isCCSettingsOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: '50px',
                  right: '12px',
                  background: 'rgba(28, 28, 28, 0.95)',
                  borderRadius: '12px',
                  padding: '16px',
                  width: '240px',
                  zIndex: 100,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  color: '#fff',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                    <FiSettings size={14} />
                    {language === 'ko' ? '자막 설정' : 'Caption Settings'}
                  </div>
                  <button
                    onClick={() => setIsCCSettingsOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
                  >
                    <FiX size={16} />
                  </button>
                </div>

                {/* Tracks Selection - Dropdown */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {language === 'ko' ? '언어 선택' : 'Language'}
                  </div>
                  <select
                    value={activeTrackCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setActiveTrackCode(code);
                      isSwitchingCCTrack.current = true;

                      ccTimersRef.current.forEach(t => clearTimeout(t));
                      ccTimersRef.current = [];

                      if (code === 'off') {
                        playerRef.current?.unloadModule('captions');
                        setIsCaptionsOn(false);
                        isSwitchingCCTrack.current = false;
                      } else {
                        if (!isCaptionsOn) {
                          playerRef.current?.loadModule('captions');
                          setIsCaptionsOn(true);
                        }

                        const currentTrack = playerRef.current?.getOption('captions', 'track');
                        const wasTranslating = !!currentTrack?.translationLanguage?.languageCode;

                        if (code === 'ko-auto') {
                          setTimeout(() => {
                            const tracks = playerRef.current?.getOption('captions', 'tracklist') || [];
                            const enTrack = tracks.find((t: any) => t.languageCode?.includes('en')) || tracks[0] || { languageCode: 'en' };
                            playerRef.current?.setOption('captions', 'track', {
                              languageCode: enTrack.languageCode,
                              translationLanguage: { languageCode: 'ko' }
                            });
                            applyCaptionStyles();
                            setTimeout(() => { isSwitchingCCTrack.current = false; }, 1500);
                          }, 100);
                        } else if (code === 'en-force') {
                          if (wasTranslating) {
                            playerRef.current?.unloadModule('captions');
                            playerRef.current?.loadModule('captions');
                          }
                          setTimeout(() => {
                            const tracks = playerRef.current?.getOption('captions', 'tracklist') || [];
                            const enTrack = tracks.find((t: any) => (t.kind === 'asr' || t.languageCode?.startsWith('a.')) && t.languageCode?.includes('en')) ||
                              tracks.find((t: any) => t.languageCode?.includes('en')) || { languageCode: 'en' };
                            playerRef.current?.setOption('captions', 'track', { languageCode: enTrack.languageCode });
                            applyCaptionStyles();
                            setTimeout(() => { isSwitchingCCTrack.current = false; }, 1500);
                          }, wasTranslating ? 300 : 100);
                        } else {
                          if (wasTranslating) {
                            playerRef.current?.unloadModule('captions');
                            playerRef.current?.loadModule('captions');
                          }
                          setTimeout(() => {
                            playerRef.current?.setOption('captions', 'track', { languageCode: code });
                            applyCaptionStyles();
                            setTimeout(() => { isSwitchingCCTrack.current = false; }, 1500);
                          }, wasTranslating ? 300 : 100);
                        }
                      }
                      setIsCCSettingsOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none'
                    }}
                  >
                    <option value="" disabled>{language === 'ko' ? '언어 선택' : 'Language'}</option>
                    <option value="off" style={{ background: '#1c1c1c' }}>{language === 'ko' ? '자막 끄기' : 'Captions Off'}</option>
                    {ccTracks.map((track: any) => {
                      const isAsr = track.kind === 'asr' || track.languageCode?.startsWith('a.');
                      return (
                        <option
                          key={`${track.languageCode}-${track.kind}`}
                          value={track.languageCode}
                          style={{ background: '#1c1c1c' }}
                        >
                          {track.displayName} {isAsr ? `(${language === 'ko' ? '자동 생성' : 'auto-generated'})` : ''}
                        </option>
                      );
                    })}
                    {!ccTracks.some((t: any) => t.languageCode?.includes('en') || t.displayName?.toLowerCase().includes('english')) && (
                      <option value="en-force" style={{ background: '#1c1c1c' }}>
                        {language === 'ko' ? '영어 (자동 생성)' : 'English (Auto-generated)'}
                      </option>
                    )}
                    {!ccTracks.some((t: any) => t.languageCode === 'ko' || t.languageCode === 'ko-KR') && (
                      <option value="ko-auto" style={{ background: '#1c1c1c' }}>
                        {language === 'ko' ? '한국어 (자동 번역)' : 'Korean (auto-translate)'}
                      </option>
                    )}
                  </select>
                </div>

                {/* Font Size */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {language === 'ko' ? '글자 크기' : 'Font Size'}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { label: '50%', val: -1 },
                      { label: '100%', val: 0 },
                      { label: '150%', val: 1 },
                      { label: '200%', val: 2 },
                      { label: '300%', val: 3 }
                    ].map(size => {
                      const isActive = ccFontSize === size.val;
                      return (
                        <button
                          key={size.val}
                          onClick={() => {
                            setCCFontSize(size.val);
                            applyCaptionStyles(size.val);
                          }}
                          style={{
                            flex: 1,
                            padding: '5px 0',
                            background: isActive ? 'rgba(239, 142, 19, 0.2)' : 'rgba(255,255,255,0.08)',
                            border: isActive ? '1px solid #ef8e13' : '1px solid transparent',
                            borderRadius: '4px',
                            color: isActive ? '#ef8e13' : '#ddd',
                            fontSize: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        >
                          {size.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {/* Speed Toast Notification */}
            {playbackRateToast !== null && (
              <div style={{
                position: 'absolute',
                top: '20%',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                pointerEvents: 'none',
                zIndex: 20
              }}>
                {playbackRateToast}x
              </div>
            )}
            {/* Volume Toast Notification */}
            {volumeToast !== null && (
              <div style={{
                position: 'absolute',
                top: '20%',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                pointerEvents: 'none',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FiVolume2 size={16} /> {volumeToast}%
              </div>
            )}

            {/* Brightness Toast Notification */}
            {brightnessToast !== null && (
              <div style={{
                position: 'absolute',
                top: '20%',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                pointerEvents: 'none',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FiSun size={16} /> {Math.round(brightnessToast * 100)}%
              </div>
            )}

            {/* Control Bar - Using opacity to avoid flicker on play/pause */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: '12px',
                color: '#fff',
                cursor: 'default',
                opacity: isPlaying ? 0 : 1,
                pointerEvents: isPlaying ? 'none' : 'auto',
                transition: 'opacity 0.2s ease',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                zIndex: 20
              }}
            >
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  setCurrentTime(time);
                  ACTIVE_YT_VIDEO_ID = videoId;
                  playerRef.current?.seekTo(time);
                }}
                style={{
                  flex: 1,
                  height: '3px',
                  cursor: 'pointer',
                  accentColor: '#ef8e13'
                }}
              />
              <div style={{ fontSize: '11px', fontFamily: 'monospace', minWidth: '75px', textAlign: 'right' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <a
                href={`https://www.youtube.com/watch?v=${videoId}${currentTime > 0 ? `&t=${Math.floor(currentTime)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: isMobilePortrait ? '#ff0000' : '#ddd',
                  textDecoration: 'none',
                  padding: isMobilePortrait ? '4px' : '4px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  whiteSpace: 'nowrap',
                  marginLeft: '4px',
                  transition: 'all 0.2s'
                }}
                title={language === 'ko' ? '유튜브에서 시청' : 'Watch on YouTube'}
              >
                {isMobilePortrait ? (
                  <FaYoutube size={18} />
                ) : (
                  <>
                    <FiExternalLink size={12} />
                    {language === 'ko' ? '유튜브에서 시청' : 'Watch on YouTube'}
                  </>
                )}
              </a>


              <button
                onClick={(e) => {
                  if (ccClickTimerRef.current) clearTimeout(ccClickTimerRef.current);
                  ccClickTimerRef.current = setTimeout(() => {
                    toggleCaptions(e);
                    ccClickTimerRef.current = null;
                  }, 500); // 500ms delay to distinguish dblclick
                }}
                onDoubleClick={(e) => {
                  if (ccClickTimerRef.current) {
                    clearTimeout(ccClickTimerRef.current);
                    ccClickTimerRef.current = null;
                  }
                  toggleCCSettings(e);
                }}
                title={language === 'ko' ? '자막 (더블클릭: 설정)' : 'Subtitles (Double-click: Settings)'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isCaptionsOn ? '#ef8e13' : '#ddd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  marginLeft: '4px',
                  transition: 'color 0.2s'
                }}
              >
                <div style={{
                  border: `1.5px solid ${isCaptionsOn ? '#ef8e13' : '#ddd'}`,
                  borderRadius: '2px',
                  padding: '1px 3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  color: isCaptionsOn ? '#ef8e13' : '#ddd',
                  transition: 'all 0.2s'
                }}>
                  CC
                </div>
              </button>

              <button
                onClick={toggleFullScreen}
                title={language === 'ko' ? '전체 화면' : 'Full Screen'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ddd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  marginLeft: '4px'
                }}
              >
                <FiMaximize size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const YoutubePlaylistView = ({ playlistId }: { playlistId: string }) => {
  const [playlistVideos, setPlaylistVideos] = React.useState<{ id: string, title: string }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    // Attempt to fetch playlist page to extract video titles
    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

        // Use multiple proxies in parallel for maximum speed
        const html = await Promise.any([
          fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`).then(res => res.ok ? res.text() : Promise.reject()),
          fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`).then(res => res.ok ? res.text() : Promise.reject()),
          fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => data.contents || Promise.reject())
        ]);

        const videos: { id: string, title: string }[] = [];
        // Enhanced regex to match both formats (runs and simpleText)
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{(?:[^}]*?"runs":\[\{"text":"(.*?)"\}\]|"simpleText":"(.*?)"\})/g;
        let match;
        const seen = new Set();
        while ((match = regex.exec(html)) !== null) {
          const id = match[1];
          let title = match[2] || match[3] || '영상 제목 없음';
          title = title.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
          if (!seen.has(id)) {
            seen.add(id);
            videos.push({ id, title });
          }
        }

        // Absolute fallback: if still zero, just search for videoIds alone
        if (videos.length === 0) {
          const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
          let m;
          while ((m = idRegex.exec(html)) !== null) {
            const id = m[1];
            if (!seen.has(id)) {
              seen.add(id);
              videos.push({ id, title: '영상 제목 없음' });
            }
          }
        }

        if (videos.length > 0) {
          setPlaylistVideos(videos);
        }
      } catch (e) {
        console.error('Playlist fetch failed', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [playlistId]);

  if (loading) {
    return <div style={{ margin: '16px 0', padding: '12px', color: '#868e96', fontSize: '14px', border: '1px solid #e9ecef', borderRadius: '8px' }}>loading playlist...</div>;
  }

  if (playlistVideos.length > 0) {
    return (
      <div style={{ margin: '16px 0', padding: '12px', border: '1px solid #e9ecef', borderRadius: '8px' }}>
        <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          Playlist ({playlistVideos.length})
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {playlistVideos.map((v, i) => (
            <li key={v.id} style={{ marginBottom: '8px', fontSize: '14px' }}>
              <a
                href={`https://www.youtube.com/watch?v=${v.id}&list=${playlistId}&index=${i + 1}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: '#065fd4', display: 'flex', gap: '8px', alignItems: 'baseline' }}
              >
                <span style={{ color: '#868e96', minWidth: '24px', fontSize: '12px' }}>{i + 1}.</span>
                <span style={{ lineHeight: '1.4' }}>{v.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ margin: '16px 0', padding: '12px', border: '1px solid #e9ecef', borderRadius: '8px' }}>
      <div style={{ marginBottom: '8px', fontSize: '14px' }}>
        Unable to extract videos list.
      </div>
      <a
        href={`https://www.youtube.com/playlist?list=${playlistId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#065fd4', textDecoration: 'none', fontSize: '14px' }}
      >
        Open Playlist on YouTube ↗
      </a>
    </div>
  );
};




interface MarkdownViewProps {
    content: string;
    memoId?: number;
  wordTitle?: string;
  studyMode?: string;
    isReadOnly?: boolean;
    isComment?: boolean;
    tableHeaderBg?: string;
    onEditDrawing?: (json: string) => void;
    onEditSpreadsheet?: (json: string) => void;
    fontSize?: number;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
    content,
    memoId,
  wordTitle,
  studyMode,
    isReadOnly = false,
    isComment = false,
    tableHeaderBg,
    onEditDrawing,
    onEditSpreadsheet,
    fontSize
}) => {
    const theme = useTheme() as any;
    const isDark = theme.mode === 'dark';

    const processedContent = React.useMemo(() => {
        let result = content;
        // Convert :::collapse Title ... ::: to <details><summary>Title</summary>...</details>
        result = result.replace(
            /^:::collapse\s*(.*?)\n([\s\S]*?)\n:::$/gm,
            (_, title, body) => `<details><summary>${title.trim() || 'Details'}</summary>\n\n${body}\n\n</details>`
        );
        return result.replace(/^\\newpage\s*$/gm, '<div class="page-break"></div>');
    }, [content]);

    const components = React.useMemo(() => ({
        a: ({ href, children, ...props }: any) => {
            try {
                if (!href) return <a {...props}>{children}</a>;

                let cleanHref = href;
                try {
                    cleanHref = decodeURIComponent(href);
                } catch (e) { }

                // Clean common HTML entities
                cleanHref = (cleanHref || '')
                    .replace(/&amp;/g, '&')
                    .replace(/&#38;/g, '&')
                    .replace(/&#x26;/g, '&');

                const isYoutube =
                    (cleanHref.includes('youtube.com') ||
                        cleanHref.includes('youtu.be')) && !isComment;

                if (isYoutube) {
                    let videoId = '';
                    let timestamp = 0;

                    // 1. Check for 'v=' parameter anywhere in query string
                    const vParamMatch = cleanHref.match(/[?&]v=([a-zA-Z0-9_-]{11})/);

                    if (vParamMatch && vParamMatch[1]) {
                        videoId = vParamMatch[1];
                    } else {
                        // 2. Check for path-based IDs (youtu.be, embed, shorts, v)
                        const pathMatch = cleanHref.match(/(?:youtu\.be\/|embed\/|shorts\/|v\/)([a-zA-Z0-9_-]{11})/);
                        if (pathMatch && pathMatch[1]) {
                            videoId = pathMatch[1];
                        }
                    }

                    const tMatch = cleanHref.match(/[?&]t=(\d+)/);
                    if (tMatch && tMatch[1]) {
                        timestamp = parseInt(tMatch[1]);
                    }

                    if (videoId) {
                        return (
                            <div key={videoId} style={{ margin: '16px 0' }}>
                                <YouTubePlayer
                                    videoId={videoId}
                                    startTimestamp={timestamp > 0 ? timestamp : undefined}
                                    memoId={memoId}
                                    isShort={cleanHref.includes('shorts/')}
                                />
                            </div>
                        );
                    } else {
                        // Check for playlist ID if video ID is missing
                        let playlistId = '';
                        const listMatch = cleanHref.match(/[?&]list=([a-zA-Z0-9_-]+)/);
                        if (listMatch) playlistId = listMatch[1];
                        else {
                            const showMatch = cleanHref.match(/\/show\/([a-zA-Z0-9_-]+)/);
                            if (showMatch) playlistId = showMatch[1];
                        }

                        if (playlistId) {
                            // Remove 'VL' prefix if present
                            if (playlistId.startsWith('VL')) {
                                playlistId = playlistId.substring(2);
                            }
                            return <YoutubePlaylistView playlistId={playlistId} />;
                        }
                    }
                }

                // General Web Preview for standalone links (links that match children or are on their own)
                const isStandalone = typeof children === 'string' && (children === href || children.startsWith('http'));
                if (isStandalone && href.startsWith('http')) {
                    return <WebPreview url={href} />;
                }

                return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
            } catch (err) {
                console.error('Link render error', err);
                return <a href={href} {...props}>{children}</a>;
            }
        },
        img: ({ src, alt }: any) => {
            try {
                const meta = metadataCache.get(src || '');
                if (meta) {
                    return (
                        <img
                            src={src}
                            alt={alt}
                            width={meta.width}
                            height={meta.height}
                            style={{
                                aspectRatio: `${meta.width} / ${meta.height}`,
                                height: 'auto',
                                maxWidth: '100%',
                                display: 'block',
                                margin: '1em auto'
                            }}
                        />
                    );
                }
                return <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: '6px', display: 'block', margin: '1em auto' }} />;
            } catch (err) {
                return <img src={src} alt={alt} style={{ maxWidth: '100%' }} />;
            }
        },
        pre: ({ children, ...props }: any) => {
            try {
                const child = Array.isArray(children) ? children[0] : children;
                if (React.isValidElement(child) &&
                    (child.props as any).className?.includes('language-fabric')) {
                    return <>{children}</>;
                }
                if (React.isValidElement(child) &&
                    (child.props as any).className?.includes('language-spreadsheet')) {
                    return <>{children}</>;
                }
                return <div {...props}>{children}</div>;
            } catch (err) {
                return <pre {...props}>{children}</pre>;
            }
        },
        code: ({ node, inline, className, children, ...props }: any) => {
            try {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const json = String(children).replace(/\n$/, '');

                if (!inline && language === 'fabric') {
                    return <FabricPreview json={json} onClick={!isReadOnly && onEditDrawing ? () => onEditDrawing(json) : undefined} />;
                }

                if (!inline && language === 'spreadsheet') {
                    return <SpreadsheetPreview json={json} onClick={!isReadOnly && onEditSpreadsheet ? () => onEditSpreadsheet(json) : undefined} />;
                }

                if (!inline && language === 'web') {
                    try {
                        const url = json.trim();
                        new URL(url); // basic check
                        return <WebPreview url={url} />;
                    } catch (e) {
                        return <code className={className} {...props}>{children}</code>;
                    }
                }

                if (!inline && (language === 'youtube' || language === 'yt')) {
                    try {
                        let videoId = '';
                        const parts = json.split('\n');
                        const rawUrl = parts[0].trim();
                        const startParam = parts.find(p => p.startsWith('start='))?.split('=')[1];
                        const startTimestamp = startParam ? parseInt(startParam) : undefined;
                        const isShort = parts.some(p => p.includes('short'));

                        if (rawUrl.includes('youtube.com/watch?v=')) {
                            videoId = new URL(rawUrl).searchParams.get('v') || '';
                        } else if (rawUrl.includes('youtu.be/')) {
                            videoId = rawUrl.split('youtu.be/')[1].split('?')[0];
                        } else if (rawUrl.includes('youtube.com/shorts/')) {
                            videoId = rawUrl.split('youtube.com/shorts/')[1].split('?')[0];
                        } else {
                            videoId = rawUrl; // fallback assumes literal videoId
                        }

                        if (videoId) return <YouTubePlayer videoId={videoId} startTimestamp={startTimestamp} memoId={memoId} isShort={isShort} />;
                    } catch (e) { }
                }

                if (!inline) {
                    return (
                        <SyntaxHighlighter
                            style={isDark ? vscDarkPlus : vs}
                            language={language || 'text'}
                            PreTag="div"
                            {...props}
                        >
                            {json}
                        </SyntaxHighlighter>
                    );
                }

                return <code className={className} {...props}>{children}</code>;
            } catch (err) {
                return <code className={className} {...props}>{children}</code>;
            }
        }
    }), [onEditDrawing, onEditSpreadsheet, isDark, memoId,
  wordTitle,
  studyMode, isReadOnly, isComment]);

    return (
        <MarkdownContainer $tableHeaderBg={tableHeaderBg} $fontSize={fontSize}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                remarkRehypeOptions={{ allowDangerousHtml: true }}
                components={components}
            >
                {processedContent}
            </ReactMarkdown>
        </MarkdownContainer>
    );
};
