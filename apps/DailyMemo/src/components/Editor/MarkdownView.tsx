import React from 'react';
import { useLanguage } from '@memosuite/shared';

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
import { FiMaximize, FiSun, FiVolume2, FiX } from 'react-icons/fi';


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
`;

const PREVIEW_CACHE = new Map<string, string>();

// Global registry for YT players to enable internal seeking
const YT_PLAYERS = new Map<string, any>();
let ACTIVE_YT_VIDEO_ID: string | null = null;



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

const YouTubePlayer = ({ videoId, startTimestamp, isShort }: { videoId: string; startTimestamp?: number; memoId?: number; isShort?: boolean }) => {
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

  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [isMouseIdle, setIsMouseIdle] = React.useState(false);
  const mouseIdleTimerRef = React.useRef<any>(null);

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



  const applyCaptionStyles = React.useCallback((overrideFontSize?: number) => {
    const player = playerRef.current;
    if (!player) return;

    const size = overrideFontSize !== undefined ? overrideFontSize : ccFontSize;

    // Use a small delay to ensure YT has processed the font update
    setTimeout(() => {
      try {
        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe) {
          // YT internal: captions style can be adjusted via player options
          player.setOption('captions', 'fontSize', size);
          // Force a small update to reflect
          if (isPlaying) {
            player.pauseVideo();
            player.playVideo();
          }
        }
      } catch (e) {
        console.warn('Failed to apply caption styles', e);
      }
    }, 50);
  }, [ccFontSize, isPlaying]);

  const loadCCTracks = React.useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      const tracks = player.getOption('captions', 'tracklist') || [];
      const current = player.getOption('captions', 'track') || {};
      setCCTracks(tracks);
      setActiveTrackCode(current.languageCode || 'off');
    } catch (e) {
      console.warn('Failed to load CC tracks', e);
    }
  }, []);

  const setCCTrack = React.useCallback((trackCode: string) => {
    const player = playerRef.current;
    if (!player) return;

    try {
      isSwitchingCCTrack.current = true;
      if (trackCode === 'off') {
        player.unloadModule('captions');
        setIsCaptionsOn(false);
      } else {
        player.loadModule('captions');
        player.setOption('captions', 'track', { languageCode: trackCode });
        setIsCaptionsOn(true);
        applyCaptionStyles();
      }
      setActiveTrackCode(trackCode);

      // Reset switching flag after a delay
      const timer = setTimeout(() => {
        isSwitchingCCTrack.current = false;
      }, 500);
      ccTimersRef.current.push(timer);
    } catch (e) {
      console.warn('Failed to set CC track', e);
      isSwitchingCCTrack.current = false;
    }
  }, [applyCaptionStyles]);

  const updateCCFontSize = React.useCallback((delta: number) => {
    setCCFontSize(prev => {
      const next = Math.max(-2, Math.min(3, prev + delta));
      applyCaptionStyles(next);
      return next;
    });
  }, [applyCaptionStyles]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPlayerReady = (event: any) => {
      if (!isMounted.current) return;
      setIsReady(true);
      setDuration(event.target.getDuration());
      loadCCTracks();
      // Apply initial font size preference (usually 0 is default)
      applyCaptionStyles(0);

      // Ensure start timestamp if provided
      if (startTimestamp) event.target.seekTo(startTimestamp, true);
    };

    const onPlayerStateChange = (event: any) => {
      if (!isMounted.current) return;
      setIsPlaying(event.data === (window as any).YT.PlayerState.PLAYING);
      if (event.data === (window as any).YT.PlayerState.PLAYING) {
        ACTIVE_YT_VIDEO_ID = videoId;
      } else if (event.data === (window as any).YT.PlayerState.ENDED) {
        if (ACTIVE_YT_VIDEO_ID === videoId) ACTIVE_YT_VIDEO_ID = null;
      }
    };

    const initPlayer = () => {
      playerRef.current = new (window as any).YT.Player(container, {
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          controls: 0, // We use custom controls
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          cc_load_policy: 0 // We handle CC manually
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: () => setHasError(true)
        }
      });
      YT_PLAYERS.set(videoId, playerRef.current);
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else if ((window as any).YT.Player) {
      initPlayer();
    }

    return () => {
      isMounted.current = false;
      if (playerRef.current) playerRef.current.destroy();
      YT_PLAYERS.delete(videoId);
      if (ACTIVE_YT_VIDEO_ID === videoId) ACTIVE_YT_VIDEO_ID = null;
    };
  }, [videoId, startTimestamp, applyCaptionStyles, loadCCTracks]);

  // Sync current time
  React.useEffect(() => {
    if (!isReady) return;
    intervalRef.current = setInterval(() => {
      if (playerRef.current && isPlaying) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 500);
    return () => clearInterval(intervalRef.current);
  }, [isReady, isPlaying]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (time: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
  };

  const showToast = (val: number, setter: (v: number | null) => void) => {
    setter(val);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setter(null), 1000);
  };

  const handleToggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!isFullScreen) {
      if (containerRef.current.parentElement?.requestFullscreen) {
        containerRef.current.parentElement.requestFullscreen();
      } else if ((containerRef.current.parentElement as any).webkitRequestFullscreen) {
        (containerRef.current.parentElement as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  React.useEffect(() => {
    const handleFSChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
    };
  }, []);

  const handleMouseMove = () => {
    setIsMouseIdle(false);
    if (mouseIdleTimerRef.current) clearTimeout(mouseIdleTimerRef.current);
    mouseIdleTimerRef.current = setTimeout(() => setIsMouseIdle(true), 3000);
  };



  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTouchStartCustom = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const player = playerRef.current;
    if (!player) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      vol: player.getVolume(),
      bright: brightness,
      currentTime: player.getCurrentTime(),
      side: touch.clientX < window.innerWidth / 2 ? 'left' : 'right'
    };
    touchTypeRef.current = 'none';
  };

  const handleTouchMoveCustom = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (touchTypeRef.current === 'none') {
      if (Math.abs(dx) > 10) touchTypeRef.current = 'horizontal';
      else if (Math.abs(dy) > 10) touchTypeRef.current = 'vertical';
    }

    if (touchTypeRef.current === 'vertical') {
      const delta = -(dy / window.innerHeight) * 100;
      if (touchStartRef.current.side === 'right') {
        // Volume
        const next = Math.max(0, Math.min(100, touchStartRef.current.vol + delta));
        playerRef.current.setVolume(next);
        showToast(Math.round(next), setVolumeToast);
      } else {
        // Brightness
        const next = Math.max(0.2, Math.min(1.5, touchStartRef.current.bright + (delta / 50)));
        setBrightness(next);
        showToast(Math.round(((next - 0.2) / 1.3) * 100), setBrightnessToast);
      }
    } else if (touchTypeRef.current === 'horizontal') {
      const delta = (dx / window.innerWidth) * duration * 0.5;
      const next = Math.max(0, Math.min(duration, touchStartRef.current.currentTime + delta));
      playerRef.current.seekTo(next, true);
      setCurrentTime(next);
    }
  };

  const handleDoubleTap = (side: 'left' | 'right') => {
    const player = playerRef.current;
    if (!player) return;
    const delta = side === 'left' ? -10 : 10;
    const next = Math.max(0, Math.min(duration, player.getCurrentTime() + delta));
    player.seekTo(next, true);
    setCurrentTime(next);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const side = e.clientX < window.innerWidth / 2 ? 'left' : 'right';

    if (clickTimerRef.current && (now - clickTimerRef.current.time < 300)) {
      clearTimeout(clickTimerRef.current.timer);
      clickTimerRef.current = null;
      handleDoubleTap(side);
    } else {
      const timer = setTimeout(() => {
        handlePlayPause();
        clickTimerRef.current = null;
      }, 300);
      clickTimerRef.current = { time: now, timer };
    }
  };


  if (hasError) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        width: isShort ? '320px' : '100%',
        aspectRatio: isShort ? '9/16' : '16/9',
        margin: '2rem auto',
        background: '#000',
        borderRadius: isFullScreen ? '0' : '16px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: isFullScreen ? 'none' : '0 20px 40px rgba(0,0,0,0.4)',
        filter: `brightness(${brightness})`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        maxWidth: isShort ? '320px' : '1000px',
        zIndex: isFullScreen ? 10000 : 1,
        touchAction: 'none'
      }}
      onTouchStart={handleTouchStartCustom}
      onTouchMove={handleTouchMoveCustom}
      onClick={handleContainerClick}
    >
      <div id={`yt-player-${videoId}`} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Overlay Toasts */}
      {(volumeToast !== null || brightnessToast !== null) && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          padding: '12px 24px',
          borderRadius: '30px',
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100
        }}>
          {volumeToast !== null ? <FiVolume2 /> : <FiSun />}
          {volumeToast !== null ? volumeToast : brightnessToast}%
        </div>
      )}

      {/* Controls Overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '2rem 1.5rem 1rem',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        opacity: isMouseIdle && isPlaying ? 0 : 1,
        transition: 'opacity 0.4s',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        zIndex: 50
      }}>
        {/* Progress Bar */}
        <div style={{ position: 'relative', width: '100%', height: '4px', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            handleSeek(pct * duration);
          }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }} />
          <div style={{ position: 'absolute', width: `${(currentTime / duration) * 100}%`, height: '100%', background: '#ef8e13', borderRadius: '2px', transition: 'width 0.1s linear' }} />
          <div style={{
            position: 'absolute',
            left: `${(currentTime / duration) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px', height: '12px',
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            display: isMouseIdle ? 'none' : 'block'
          }} />
        </div>

        {/* Bottom Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            <div style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'monospace', opacity: 0.9 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rates = [1, 1.25, 1.5, 2, 0.5, 0.75];
                const current = playerRef.current?.getPlaybackRate() || 1;
                const next = rates[(rates.indexOf(current) + 1) % rates.length];
                playerRef.current?.setPlaybackRate(next);
                setPlaybackRateToast(next);
                setTimeout(() => setPlaybackRateToast(null), 1500);
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {playbackRateToast ? `${playbackRateToast}x` : 'SPEED'}
            </button>

            {/* CC Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCCSettingsOpen(!isCCSettingsOpen);
                }}
                style={{
                  background: isCaptionsOn ? '#ef8e13' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: isCaptionsOn ? '#000' : '#fff',
                  width: '28px', height: '28px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                CC
              </button>

              {isCCSettingsOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '40px',
                  right: 0,
                  background: 'rgba(0,0,0,0.9)',
                  backdropFilter: 'blur(10px)',
                  padding: '12px',
                  borderRadius: '12px',
                  width: '180px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  zIndex: 100
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>Captions</span>
                    <button onClick={() => setIsCCSettingsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><FiX /></button>
                  </div>

                  {/* Size control in CC menu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '10px', color: '#888' }}>Size</span>
                    <button onClick={() => updateCCFontSize(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '20px' }}>-</button>
                    <span style={{ fontSize: '11px', flex: 1, textAlign: 'center' }}>{ccFontSize + 3}</span>
                    <button onClick={() => updateCCFontSize(1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '20px' }}>+</button>
                  </div>

                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <button
                      onClick={() => setCCTrack('off')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        background: activeTrackCode === 'off' ? 'rgba(239, 142, 19, 0.2)' : 'none',
                        border: 'none',
                        color: activeTrackCode === 'off' ? '#ef8e13' : '#fff',
                        fontSize: '12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Off
                    </button>
                    {ccTracks.map(track => (
                      <button
                        key={track.languageCode}
                        onClick={() => setCCTrack(track.languageCode)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 8px',
                          background: activeTrackCode === track.languageCode ? 'rgba(239, 142, 19, 0.2)' : 'none',
                          border: 'none',
                          color: activeTrackCode === track.languageCode ? '#ef8e13' : '#fff',
                          fontSize: '12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginTop: '2px'
                        }}
                      >
                        {track.baseUrl ? track.languageName : `${track.languageName} (Auto)`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleToggleFullScreen(); }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
            >
              <FiMaximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


interface MarkdownViewProps {
  content: string;
  memoId?: number;
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
  isReadOnly = false,
  tableHeaderBg,
  onEditDrawing,
  onEditSpreadsheet,
  fontSize
}) => {
  const theme = useTheme() as any;
  const isDark = theme.mode === 'dark';

  const processedContent = React.useMemo(() => {
    return content.replace(/^\\newpage\s*$/gm, '<div class="page-break"></div>');
  }, [content]);

  return (
    <MarkdownContainer $tableHeaderBg={tableHeaderBg} $fontSize={fontSize}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        remarkRehypeOptions={{ allowDangerousHtml: true }}
        components={{
          pre: ({ children, ...props }: any) => {
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
          },
          code({ node, inline, className, children, ...props }: any) {
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
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </MarkdownContainer>
  );
};