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

const safeStorage = {
  getItem: (key: string) => { try { return localStorage.getItem(key); } catch (e) { return null; } },
  setItem: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch (e) { } },
  removeItem: (key: string) => { try { localStorage.removeItem(key); } catch (e) { } }
};

import styled, { useTheme } from 'styled-components';
import { fabric } from 'fabric';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { calculateBackgroundColor, createBackgroundPattern } from '@memosuite/shared-drawing';
import { BlurredText } from '../UI/BlurredText';
import { FiMaximize, FiSun, FiVolume2, FiX, FiArrowDown, FiExternalLink, FiSettings } from 'react-icons/fi';
import { FaYoutube } from 'react-icons/fa';

const PLAYLIST_DATA_CACHE = new Map<string, any>();

const REMARK_PLUGINS = [remarkMath, remarkGfm, remarkBreaks];
const REHYPE_PLUGINS = [rehypeRaw, rehypeKatex];

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
          touchAction: 'pan-y',
          display: 'flex',
          alignItems: 'flex-end',
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
          zIndex: 20,
          opacity: showHint ? 1 : 0,
          transform: `translateY(${showHint ? '0' : '10px'})`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '24px',
          fontSize: '13px',
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
  font-size: ${props => props.$fontSize ? `${props.$fontSize}px` : 'inherit'};
  
  /* Match LexicalEditor's sizing: 1px border + 0.5rem padding */
  padding: 0.5rem;
  padding-left: calc(0.5rem + 1px);
  padding-right: calc(0.5rem + 1px);

  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  p {
    margin-bottom: 0px;
    margin-top: 0px;
  }

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
    width: 16px;
    height: 16px;
    border: 2px solid ${({ theme }) => theme.colors.primary};
    border-radius: 4px;
    margin: 0 0.5em 0 0;
    vertical-align: middle;
    position: relative;
    top: -1px;
    cursor: pointer;
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
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    border: 2px solid ${({ theme }) => theme.mode === 'dark' ? '#888' : '#666'};
    background-color: ${({ theme }) => theme.colors.background};
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, ${({ theme }) => theme.mode === 'dark' ? '0.2' : '0.05'});
    
    th, td {
      border: 1px solid ${({ theme }) => theme.mode === 'dark' ? '#888' : '#666'};
      padding: 3px 12px;
      text-align: left;
      color: ${({ theme }) => theme.colors.text};
      word-break: break-word;
      overflow-wrap: break-word;
      line-height: 1.4;

      &:empty::after {
        content: '\\00a0';
        visibility: hidden;
      }
    }

    th {
      background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)'} !important;
      color: ${({ theme }) => theme.colors.text} !important;
      font-weight: 700;
      text-transform: none;
      font-size: 0.95rem;
      letter-spacing: normal;
      border-bottom: 2px solid ${({ theme }) => theme.mode === 'dark' ? '#aaa' : '#444'};
    }

    td {
      background-color: transparent;
    }

    tr:nth-child(even) td {
      background-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
    }

    tr:hover td {
      background-color: ${({ theme }) => theme.colors.primary}08;
    }
  }

  @media screen {
    .page-break {
      border-top: 2px dashed ${({ theme }) => theme.colors.border};
      margin: 2rem 0;
      position: relative;
      height: 0;
      overflow: visible;
      display: block;
      width: 100%;
    }
    .page-break::after {
      content: "Page Break";
      position: absolute;
      top: -10px;
      right: 1rem;
      background: ${({ theme }) => theme.colors.background};
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
      display: block !important;
      height: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      visibility: visible !important;
    }
  }

  hr {
    border: none !important;
    margin: 1em 0 !important;
    border-top: 2px solid ${({ theme }) => theme.colors.textSecondary} !important;
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
      margin-bottom: 0px;
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

            let maxBottom = 0;
            staticCanvas.getObjects().forEach(obj => {
              if ((obj as any).isPageBackground || (obj as any).excludeFromExport) return;
              const bottom = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1);
              if (bottom > maxBottom) maxBottom = bottom;
            });

            const h = Math.min(fullH, Math.max(200, maxBottom + 60));

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = w;
            exportCanvas.height = h;
            const ctx = exportCanvas.getContext('2d');

            if (ctx) {
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

const SpreadsheetPreview = React.memo(({ json, onClick }: { json: string; onClick?: () => void }) => {
  const { language } = useLanguage();
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data) || data.length === 0) return null;

    const sheet = data[0];
    const celldata = sheet.celldata || [];
    const matrixData = sheet.data;

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
            <div style={{ fontSize: '13px', color: '#868e96' }}>{onClick ? (language === 'ko' ? '클릭하여 편집' : 'Click to open editor') : (language === 'ko' ? '데이터 없음' : 'No data')}</div>
          </div>
        </div>
      );
    }

    let maxRow = 0;
    let maxCol = 0;
    const grid: any[][] = [];

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

      maxRow = displayMaxRow;
      maxCol = displayMaxCol;
    }

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        style={{
          overflow: 'auto',
          maxHeight: '400px',
          margin: '16px 0',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          cursor: onClick ? 'pointer' : 'default',
          backgroundColor: '#fff'
        }}
        title={onClick ? "Click to edit spreadsheet" : undefined}
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
          <div style={{ padding: '8px', textAlign: 'center', color: '#666', fontSize: '13px', background: '#f8f9fa', borderTop: '1px solid #d1d5db', position: 'sticky', bottom: 0, left: 0, width: '100%', boxSizing: 'border-box' }}>
            {language === 'ko' ? '... 항목 더 있음 (편집기에서 확인 가능) ...' : '... more data available in editor ...'}
          </div>
        )}
      </div>
    );
  } catch (e) {
    return <div style={{ color: 'red', fontSize: '13px' }}>Failed to render spreadsheet preview</div>;
  }
});

const WebPreview = React.memo(({ url }: { url: string }) => {
  const { language } = useLanguage();
  const domain = new URL(url).hostname;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  const previewUrl = React.useMemo(() => {
    try {
      const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/) || url.match(/[?&]id=([^&]+)/);
      if (fileIdMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }
    } catch (e) { }
    return url;
  }, [url]);

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
            fontSize: '13px',
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
            fontSize: '13px',
            boxShadow: '0 2px 4px rgba(239, 142, 19, 0.2)',
            flexShrink: 0
          }}
        >
          {language === 'ko' ? '사이트 방문' : 'Visit Site'}
        </a>
      </div>

      <MobileObjectGuard>
        <div style={{
          height: '480px',
          width: '100%',
          position: 'relative',
          background: '#f8f9fa'
        }}>
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
          </div>
          <iframe
            src={previewUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#ffffff'
            }}
            title="Web Preview"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </MobileObjectGuard>
    </div>
  );
});


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

// Global registry for YT players to enable internal seeking


const YT_PLAYERS = new Map<string, any>();
let ACTIVE_YT_VIDEO_ID: string | null = null;

const YouTubePlayer = React.memo(({ videoId, startTimestamp, memoId,

  isShort }: {
    videoId: string; startTimestamp?: number; memoId?: number;
    wordTitle?: string;
    studyMode?: string; isShort?: boolean
  }) => {
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
  const isCaptionsOnRef = React.useRef(false);
  const applyCCSettingsRef = React.useRef<any>(null);
  const applyCaptionStylesRef = React.useRef<any>(null);
  const [isCCSettingsOpen, setIsCCSettingsOpen] = React.useState(false);
  const [ccTracks, setCCTracks] = React.useState<any[]>([]);
  const [activeTrackCode, setActiveTrackCode] = React.useState<string>('off');
  const [ccFontSize, setCCFontSize] = React.useState(() => {
    const saved = safeStorage.getItem('yt_cc_font_size');
    return saved ? parseInt(saved, 10) : 0;
  });
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
      const savedSize = safeStorage.getItem('yt_cc_font_size');
      const fontSize = overrideFontSize !== undefined ? overrideFontSize : (savedSize !== null ? parseInt(savedSize, 10) : ccFontSize);
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

    const savedTime = safeStorage.getItem(`yt_progress_${videoId}`);
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
            cc_load_policy: 0,
            hl: language,
            cc_lang_pref: language
          },
          events: {
            onReady: () => {
              if (isMounted.current) {
                setIsReady(true);
                if (playerRef.current.getDuration) setDuration(playerRef.current.getDuration());
                if (!ACTIVE_YT_VIDEO_ID) ACTIVE_YT_VIDEO_ID = videoId;

                // Set default caption styles to transparent background
                setTimeout(() => {
                  applyCaptionStylesRef.current?.();
                }, 1500);

              }
            },
            onStateChange: (event: any) => {
              if (!isMounted.current) return;
              setIsPlaying(event.data === 1);
              if (event.data === 1) { // playing
                ACTIVE_YT_VIDEO_ID = videoId;
                if (isCaptionsOnRef.current) applyCaptionStylesRef.current?.();
                if (!intervalRef.current) {
                  intervalRef.current = setInterval(() => {
                    if (playerRef.current && playerRef.current.getCurrentTime) {
                      const time = playerRef.current.getCurrentTime();
                      setCurrentTime(time);
                      const t = Math.floor(time);
                      if (t > 0) {
                        safeStorage.setItem(`yt_progress_${videoId}`, String(t));
                        safeStorage.setItem(`yt_last_active`, JSON.stringify({ videoId, time: t, timestamp: Date.now() }));
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
                    safeStorage.setItem(`yt_progress_${videoId}`, String(currentTime));
                    safeStorage.setItem(`yt_last_active`, JSON.stringify({ videoId, time: currentTime, timestamp: Date.now() }));
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

  React.useEffect(() => {
    const handleSeek = (e: any) => {
      if (e.detail?.videoId === videoId && playerRef.current) {
        playerRef.current.seekTo(e.detail.time, true);
        if (!isPlaying) playerRef.current.playVideo();
      }
    };
    window.addEventListener('yt-seek', handleSeek);
    return () => window.removeEventListener('yt-seek', handleSeek);
  }, [videoId, isPlaying]);

  const [jumpedCommentId, setJumpedCommentId] = React.useState<number | null>(null);
  const { language, t } = useLanguage();

  const comments = useLiveQuery(
    () => (memoId ? db.comments.where('wordId').equals(memoId).sortBy('createdAt') : [] as Comment[]),
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
    const val = Math.floor(seconds);
    const h = Math.floor(val / 3600);
    const m = Math.floor((val % 3600) / 60);
    const s = val % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const containerId = `yt-player-container-${videoId}`;

  const fetchTracks = (retries = 3) => {
    const player = playerRef.current;
    if (!player || !player.getOption) return;
    try {
      const tracks = player.getOption('captions', 'tracklist') || [];
      setCCTracks(tracks);
      if (tracks.length === 0 && retries > 0) setTimeout(() => fetchTracks(retries - 1), 500);
    } catch (err) {
      if (retries > 0) setTimeout(() => fetchTracks(retries - 1), 500);
    }
  };

  const lastAppliedTrackRef = React.useRef<string | null>(null);
  const applyPreferredCaptionTrack = React.useCallback((isExplicitToggle = false) => {
    const player = playerRef.current;
    if (!player || !player.getOption) return;
    try {
      const tracks = player.getOption('captions', 'tracklist') || [];
      const hasManualEn = tracks.some((t: any) => (t.languageCode?.includes('en') || t.displayName?.toLowerCase().includes('english')) && t.kind !== 'asr' && !t.languageCode?.startsWith('a.'));
      const hasKo = tracks.some((t: any) => t.languageCode === 'ko' || t.languageCode === 'ko-KR');
      const options: { code: string, isKoAuto?: boolean, isEnForce?: boolean }[] = [];
      tracks.forEach((t: any) => options.push({ code: t.languageCode }));
      if (!hasManualEn) options.push({ code: 'en-force', isEnForce: true });
      if (!hasKo) options.push({ code: 'ko-auto', isKoAuto: true });

      if (options.length > 0) {
        const savedTrack = safeStorage.getItem('yt_cc_track');
        let preferredOpt = null;
        if (savedTrack && savedTrack !== 'off') {
          preferredOpt = options.find(opt => opt.code === savedTrack) ||
            (savedTrack === 'ko-auto' ? options.find(opt => opt.isKoAuto) : null) ||
            (savedTrack === 'en-force' ? options.find(opt => opt.isEnForce) : null);
          if (!preferredOpt) {
            const base = savedTrack.split('-')[0].toLowerCase();
            preferredOpt = options.find(opt => opt.code.toLowerCase() === base) ||
              options.find(opt => opt.code.toLowerCase().startsWith(base + '-')) ||
              (base === 'ko' ? options.find(opt => opt.isKoAuto) : null) ||
              (base === 'en' ? options.find(opt => opt.isEnForce) : null);
          }
        }
        if (!preferredOpt && isExplicitToggle) {
          preferredOpt = options.find(opt => opt.code === language) ||
            (language === 'ko' ? options.find(opt => opt.isKoAuto) : null) ||
            (language === 'en' ? options.find(opt => opt.isEnForce) : null);
          if (preferredOpt) {
            const saveCode = preferredOpt.isKoAuto ? 'ko-auto' : (preferredOpt.isEnForce ? 'en-force' : preferredOpt.code);
            safeStorage.setItem('yt_cc_track', saveCode);
          }
        }
        if (preferredOpt) {
          const targetCode = preferredOpt.isKoAuto ? 'ko-auto' : (preferredOpt.isEnForce ? 'en-force' : preferredOpt.code);
          if (lastAppliedTrackRef.current === targetCode && !isExplicitToggle) {
            applyCaptionStylesRef.current?.();
            return;
          }
          if (preferredOpt.isKoAuto) {
            const enTrack = tracks.find((t: any) => t.languageCode?.includes('en')) || tracks[0] || { languageCode: 'en' };
            player.setOption('captions', 'track', { languageCode: enTrack.languageCode, translationLanguage: { languageCode: 'ko' } });
            setActiveTrackCode('ko-auto');
          } else if (preferredOpt.isEnForce) {
            const enTrack = tracks.find((t: any) => (t.kind === 'asr' || t.languageCode?.startsWith('a.')) && t.languageCode?.includes('en')) || tracks.find((t: any) => t.languageCode?.includes('en')) || { languageCode: 'en' };
            player.setOption('captions', 'track', { languageCode: enTrack.languageCode });
            setActiveTrackCode('en-force');
          } else {
            player.setOption('captions', 'track', { languageCode: preferredOpt.code });
            setActiveTrackCode(preferredOpt.code);
          }
          lastAppliedTrackRef.current = targetCode;
        }
      } else {
        player.unloadModule('captions');
        setIsCaptionsOn(false);
        isCaptionsOnRef.current = false;
        setActiveTrackCode('off');
        lastAppliedTrackRef.current = null;
      }
      applyCaptionStylesRef.current?.();
    } catch (e) { }
  }, [language, applyCaptionStyles]);
  const applyCCSettings = React.useCallback((retries = 50, isExplicitToggle = false) => {
    const player = playerRef.current;
    if (!player || !player.getOption) return;
    try {
      const tracks = player.getOption('captions', 'tracklist');
      if (tracks && tracks.length > 0) {
        applyPreferredCaptionTrack(isExplicitToggle);
        return;
      }
    } catch (e) { }
    if (retries > 0) setTimeout(() => applyCCSettingsRef.current?.(retries - 1, isExplicitToggle), 100);
  }, [applyPreferredCaptionTrack]);
  applyCCSettingsRef.current = applyCCSettings;
  applyCaptionStylesRef.current = applyCaptionStyles;

  const toggleCaptions = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isCaptionsOn) {
        player.unloadModule('captions');
        setIsCaptionsOn(false);
        isCaptionsOnRef.current = false;
        setActiveTrackCode('off');
      } else {
        player.loadModule('captions');
        setIsCaptionsOn(true);
        isCaptionsOnRef.current = true;
        applyCCSettingsRef.current?.(50, true);
      }
    } catch (e) { }
    ACTIVE_YT_VIDEO_ID = videoId;
  };



  const toggleCCSettings = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isCCSettingsOpen) fetchTracks();
    setIsCCSettingsOpen(!isCCSettingsOpen);
    ACTIVE_YT_VIDEO_ID = videoId;
  };

  const toggleFullScreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    ACTIVE_YT_VIDEO_ID = videoId;
    const elem = document.getElementById(containerId);
    if (!elem) return;
    if (!document.fullscreenElement) elem.requestFullscreen().catch(() => { });
    else document.exitFullscreen();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (document.activeElement?.getAttribute('contenteditable') === 'true' || document.activeElement?.closest('[contenteditable="true"]')) return;
      if (document.activeElement?.closest('.CodeMirror')) return;
      if (ACTIVE_YT_VIDEO_ID !== videoId) return;
      const player = playerRef.current;
      if (!player) return;
      const key = e.key.toLowerCase();
      if (key === 'k' || e.key === ' ') {
        e.preventDefault();
        if (isPlaying) player.pauseVideo();
        else player.playVideo();
      } else if (key === 'f') { e.preventDefault(); toggleFullScreen(); }
      else if (key === 'c') { e.preventDefault(); toggleCaptions(); }
      else if (key === 'm') { e.preventDefault(); if (player.isMuted()) player.unMute(); else player.mute(); }
      else if (key === 'j' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const skip = key === 'j' ? 10 : 5;
        const target = Math.max(0, player.getCurrentTime() - skip);
        setCurrentTime(target); player.seekTo(target, true);
      } else if (key === 'l' || e.key === 'ArrowRight') {
        e.preventDefault();
        const skip = key === 'l' ? 10 : 5;
        const target = Math.min(player.getDuration(), player.getCurrentTime() + skip);
        setCurrentTime(target); player.seekTo(target, true);
      } else if (e.key === 'ArrowUp') {
        if (!isFullScreen) return;
        e.preventDefault();
        const newVol = Math.min(100, player.getVolume() + 5);
        player.setVolume(newVol); setVolumeToast(newVol);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => { if (isMounted.current) setVolumeToast(null); }, 1000);
      } else if (e.key === 'ArrowDown') {
        if (!isFullScreen) return;
        e.preventDefault();
        const newVol = Math.max(0, player.getVolume() - 5);
        player.setVolume(newVol); setVolumeToast(newVol);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => { if (isMounted.current) setVolumeToast(null); }, 1000);
      } else if (e.key === 'Home') {
        if (!isFullScreen) return; e.preventDefault();
        setCurrentTime(0); player.seekTo(0, true);
      } else if (e.key === 'End') {
        if (!isFullScreen) return; e.preventDefault();
        const target = player.getDuration();
        setCurrentTime(target); player.seekTo(target, true);
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const percent = parseInt(e.key) * 10;
        const target = (player.getDuration() * percent) / 100;
        setCurrentTime(target); player.seekTo(target, true);
      } else if (e.key === '>' || e.key === '<') {
        e.preventDefault();
        const rates = player.getAvailablePlaybackRates();
        const currentRate = player.getPlaybackRate();
        const currentIndex = rates.indexOf(currentRate);
        let newRate = currentRate;
        if (e.key === '>') { if (currentIndex < rates.length - 1) { newRate = rates[currentIndex + 1]; player.setPlaybackRate(newRate); } }
        else { if (currentIndex > 0) { newRate = rates[currentIndex - 1]; player.setPlaybackRate(newRate); } }
        setPlaybackRateToast(newRate);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => { if (isMounted.current) setPlaybackRateToast(null); }, 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCaptionsOn, videoId, language, isFullScreen]);

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    if (!wrapperRef.current?.parentElement) return;
    const updateScale = () => {
      if (!wrapperRef.current?.parentElement) return;
      const containerWidth = wrapperRef.current.parentElement.offsetWidth;
      if (containerWidth > 0) setScale(containerWidth / 380);
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapperRef.current.parentElement);
    updateScale();
    return () => observer.disconnect();
  }, []);

  if (hasError) {
    return (
      <div style={{ borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <iframe width="100%" height="315" src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3${startTimestamp ? `&start=${startTimestamp}` : ''}`} title="YouTube Video Fallback" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', margin: '16px 0', marginTop: (jumpedCommentId !== null || memoId) ? '40px' : '16px', transition: 'margin-top 0.3s ease' }}>
      <div style={{ position: 'absolute', top: '-34px', right: 0, display: 'flex', gap: '8px', zIndex: 10 }}>
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
      <div id={`yt-player-container-${videoId}`} style={{ position: 'relative', paddingBottom: isFullScreen ? 0 : '56.25%', height: isFullScreen ? '100%' : 0, overflow: 'hidden', borderRadius: isFullScreen ? 0 : '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', background: '#000', display: isFullScreen ? 'flex' : 'block', alignItems: isFullScreen ? 'center' : 'initial', justifyContent: isFullScreen ? 'center' : 'initial', cursor: (isFullScreen && isMouseIdle) ? 'none' : 'auto' }}>
        {isFullScreen && <div style={{ position: 'absolute', inset: 0, background: 'black', opacity: 1 - brightness, pointerEvents: 'none', zIndex: 15 }} />}
        {!isReady && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '13px', background: '#111', zIndex: 1 }}>YouTube Loading...</div>}
        <div ref={wrapperRef} style={{ position: isFullScreen ? 'relative' : 'absolute', top: 0, left: 0, width: isFullScreen ? (isShort && isMobilePortrait ? '100vw' : 'min(100vw, calc(100vh * 16 / 9))') : '380px', height: isFullScreen ? (isShort && isMobilePortrait ? '100vh' : 'min(100vh, calc(100vw * 9 / 16))') : '214px', transform: isFullScreen ? 'none' : `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        {isReady && (
          <div onClick={() => { if (isCCSettingsOpen) { setIsCCSettingsOpen(false); return; } if (clickTimerRef.current) clearTimeout(clickTimerRef.current); clickTimerRef.current = setTimeout(() => { ACTIVE_YT_VIDEO_ID = videoId; isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo(); clickTimerRef.current = null; }, 250); }}
            onDoubleClick={() => { if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } toggleFullScreen(); }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, cursor: (isFullScreen && isMouseIdle) ? 'none' : 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'transparent', touchAction: isFullScreen ? 'none' : 'auto', WebkitTapHighlightColor: 'transparent', transition: 'none' }}
            onTouchStart={(e) => { if (!isFullScreen) return; const touch = e.touches[0]; const rect = e.currentTarget.getBoundingClientRect(); const x = touch.clientX - rect.left; touchStartRef.current = { x: touch.clientX, y: touch.clientY, vol: playerRef.current?.getVolume() || 0, bright: brightness, currentTime: playerRef.current?.getCurrentTime() || 0, side: x < rect.width / 2 ? 'left' : 'right' }; touchTypeRef.current = 'none'; }}
            onTouchMove={(e) => {
              if (!isFullScreen || !touchStartRef.current) return;
              const touch = e.touches[0];
              const dx = touch.clientX - touchStartRef.current.x; const dy = touch.clientY - touchStartRef.current.y;
              if (touchTypeRef.current === 'none') { if (Math.abs(dx) > 10) touchTypeRef.current = 'horizontal'; else if (Math.abs(dy) > 10) touchTypeRef.current = 'vertical'; }
              if (touchTypeRef.current === 'horizontal') { const target = Math.max(0, Math.min(duration, touchStartRef.current.currentTime + dx * 0.5)); setCurrentTime(target); playerRef.current?.seekTo(target, true); }
              else if (touchTypeRef.current === 'vertical') {
                if (touchStartRef.current.side === 'right') { const nextVol = Math.max(0, Math.min(100, touchStartRef.current.vol - dy * 0.5)); playerRef.current?.setVolume(nextVol); setVolumeToast(Math.round(nextVol)); if (toastTimerRef.current) clearTimeout(toastTimerRef.current); toastTimerRef.current = setTimeout(() => setVolumeToast(null), 1500); }
                else { const nextBright = Math.max(0.1, Math.min(1, touchStartRef.current.bright - dy * 0.005)); setBrightness(nextBright); setBrightnessToast(nextBright); if (toastTimerRef.current) clearTimeout(toastTimerRef.current); toastTimerRef.current = setTimeout(() => setBrightnessToast(null), 1500); }
              }
            }} onTouchEnd={() => { touchStartRef.current = null; touchTypeRef.current = 'none'; }}>
            {isCCSettingsOpen && (
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: '50px', right: '12px', background: 'rgba(28, 28, 28, 0.95)', borderRadius: '12px', padding: '16px', width: '240px', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}><FiSettings size={14} />{language === 'ko' ? '자막 설정' : 'Caption Settings'}</div><button onClick={() => setIsCCSettingsOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}><FiX size={16} /></button></div>
                <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '13px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{language === 'ko' ? '언어 선택' : 'Language'}</div>
                  <select value={activeTrackCode} onChange={(e) => {
                    const code = e.target.value; setActiveTrackCode(code); isSwitchingCCTrack.current = true; ccTimersRef.current.forEach(t => clearTimeout(t)); ccTimersRef.current = [];
                    if (code === 'off') { playerRef.current?.unloadModule('captions'); setIsCaptionsOn(false); isCaptionsOnRef.current = false; isSwitchingCCTrack.current = false; }
                    else {
                      if (!isCaptionsOn) { playerRef.current?.loadModule('captions'); setIsCaptionsOn(true); isCaptionsOnRef.current = true; }
                      const wasTranslating = Boolean(playerRef.current?.getOption('captions', 'track')?.translationLanguage?.languageCode);
                      if (code === 'ko-auto') { safeStorage.setItem('yt_cc_track', 'ko-auto'); setTimeout(() => { const tracks = playerRef.current?.getOption('captions', 'tracklist') || []; const enTrack = tracks.find((t: any) => t.languageCode?.includes('en')) || tracks[0] || { languageCode: 'en' }; playerRef.current?.setOption('captions', 'track', { languageCode: enTrack.languageCode, translationLanguage: { languageCode: 'ko' } }); applyCaptionStylesRef.current?.(); setTimeout(() => { isSwitchingCCTrack.current = false; }, 1500); }, 100); }
                      else if (code === 'en-force') { safeStorage.setItem('yt_cc_track', 'en-force'); if (wasTranslating) { playerRef.current?.unloadModule('captions'); playerRef.current?.loadModule('captions'); } setTimeout(() => { const tracks = playerRef.current?.getOption('captions', 'tracklist') || []; const enTrack = tracks.find((t: any) => (t.kind === 'asr' || t.languageCode?.startsWith('a.')) && t.languageCode?.includes('en')) || tracks.find((t: any) => t.languageCode?.includes('en')) || { languageCode: 'en' }; playerRef.current?.setOption('captions', 'track', { languageCode: enTrack.languageCode }); applyCaptionStylesRef.current?.(); setTimeout(() => { isSwitchingCCTrack.current = false; }, 1500); }, wasTranslating ? 300 : 100); }
                      else { safeStorage.setItem('yt_cc_track', code); if (wasTranslating) { playerRef.current?.unloadModule('captions'); playerRef.current?.loadModule('captions'); } setTimeout(() => { playerRef.current?.setOption('captions', 'track', { languageCode: code }); applyCaptionStylesRef.current?.(); setTimeout(() => { isSwitchingCCTrack.current = false; }, 1500); }, wasTranslating ? 300 : 100); }
                    } setIsCCSettingsOpen(false);
                  }} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '13px', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                    <option value="" disabled>{language === 'ko' ? '언어 선택' : 'Language'}</option><option value="off" style={{ background: '#1c1c1c' }}>{language === 'ko' ? '자막 끄기' : 'Captions Off'}</option>
                    {ccTracks.map((track: any) => <option key={`${track.languageCode}-${track.kind}`} value={track.languageCode} style={{ background: '#1c1c1c' }}>{track.displayName} {track.kind === 'asr' || track.languageCode?.startsWith('a.') ? `(${language === 'ko' ? '자동 생성' : 'auto-generated'})` : ''}</option>)}
                    {!ccTracks.some((t: any) => t.languageCode?.includes('en') || t.displayName?.toLowerCase().includes('english')) && <option value="en-force" style={{ background: '#1c1c1c' }}>{language === 'ko' ? '영어 (자동 생성)' : 'English (Auto-generated)'}</option>}
                    {!ccTracks.some((t: any) => t.languageCode === 'ko' || t.languageCode === 'ko-KR') && <option value="ko-auto" style={{ background: '#1c1c1c' }}>{language === 'ko' ? '한국어 (자동 번역)' : 'Korean (auto-translate)'}</option>}
                  </select></div>
                <div><div style={{ fontSize: '13px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{language === 'ko' ? '글자 크기' : 'Font Size'}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>{[{ label: '50%', val: -1 }, { label: '100%', val: 0 }, { label: '150%', val: 1 }, { label: '200%', val: 2 }, { label: '300%', val: 3 }].map(size => <button key={size.val} onClick={() => { setCCFontSize(size.val); safeStorage.setItem('yt_cc_font_size', String(size.val)); applyCaptionStyles(size.val); }} style={{ flex: 1, padding: '5px 0', background: ccFontSize === size.val ? 'rgba(239, 142, 19, 0.2)' : 'rgba(255,255,255,0.08)', border: ccFontSize === size.val ? '1px solid #ef8e13' : '1px solid transparent', borderRadius: '4px', color: ccFontSize === size.val ? '#ef8e13' : '#ddd', fontSize: '13px', cursor: 'pointer' }}>{size.label}</button>)}</div></div>
              </div>)}
            {playbackRateToast !== null && <div style={{ position: 'absolute', top: '20%', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', zIndex: 20 }}>{playbackRateToast}x</div>}
            {volumeToast !== null && <div style={{ position: 'absolute', top: '20%', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', zIndex: 20, display: 'flex', alignItems: 'center', gap: '8px' }}><FiVolume2 size={16} /> {volumeToast}%</div>}
            {brightnessToast !== null && <div style={{ position: 'absolute', top: '20%', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', zIndex: 20, display: 'flex', alignItems: 'center', gap: '8px' }}><FiSun size={16} /> {Math.round(brightnessToast * 100)}%</div>}
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '12px', color: '#fff', cursor: 'default', opacity: isPlaying ? 0 : 1, pointerEvents: isPlaying ? 'none' : 'auto', transition: 'opacity 0.2s', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))', zIndex: 20 }}>
              <input type="range" min={0} max={duration || 100} value={currentTime} onChange={(e) => { const time = parseFloat(e.target.value); setCurrentTime(time); ACTIVE_YT_VIDEO_ID = videoId; playerRef.current?.seekTo(time); }} style={{ flex: 1, height: '3px', cursor: 'pointer', accentColor: '#ef8e13' }} />
              <div style={{ fontSize: '13px', fontFamily: 'monospace', minWidth: '75px', textAlign: 'right' }}>{formatTime(currentTime)} / {formatTime(duration)}</div>
              <a href={`https://www.youtube.com/watch?v=${videoId}${currentTime > 0 ? `&t=${Math.floor(currentTime)}` : ''}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: isMobilePortrait ? '#ff0000' : '#ddd', textDecoration: 'none', padding: isMobilePortrait ? '4px' : '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', whiteSpace: 'nowrap', marginLeft: '4px' }} title={language === 'ko' ? '유튜브에서 시청' : 'Watch on YouTube'}>
                {isMobilePortrait ? <FaYoutube size={18} /> : <><FiExternalLink size={12} />{language === 'ko' ? '유튜브에서 시청' : 'Watch on YouTube'}</>}
              </a>
              <button onClick={(e) => { if (ccClickTimerRef.current) clearTimeout(ccClickTimerRef.current); ccClickTimerRef.current = setTimeout(() => { toggleCaptions(e); ccClickTimerRef.current = null; }, 500); }} onDoubleClick={(e) => { if (ccClickTimerRef.current) { clearTimeout(ccClickTimerRef.current); ccClickTimerRef.current = null; } toggleCCSettings(e); }} title={language === 'ko' ? '자막 (더블클릭: 설정)' : 'Subtitles (Double-click: Settings)'} style={{ background: 'none', border: 'none', color: isCaptionsOn ? '#ef8e13' : '#ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '4px' }}>
                <div style={{ border: `1.5px solid ${isCaptionsOn ? '#ef8e13' : '#ddd'}`, borderRadius: '2px', padding: '1px 3px', fontSize: '9px', fontWeight: 'bold', lineHeight: 1, color: isCaptionsOn ? '#ef8e13' : '#ddd' }}>CC</div>
              </button>
              <button onClick={toggleFullScreen} title={language === 'ko' ? '전체 화면' : 'Full Screen'} style={{ background: 'none', border: 'none', color: '#ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '4px' }}><FiMaximize size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const YoutubePlaylistView = React.memo(({ playlistId }: { playlistId: string }) => {
  const [playlistVideos, setPlaylistVideos] = React.useState<{ id: string, title: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (PLAYLIST_DATA_CACHE.has(playlistId)) {
      setPlaylistVideos(PLAYLIST_DATA_CACHE.get(playlistId));
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchPlaylist = async () => {
      try {
        const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        const html = await Promise.any([
          fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`).then(res => res.ok ? res.text() : Promise.reject()),
          fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`).then(res => res.ok ? res.text() : Promise.reject()),
          fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`).then(res => res.ok ? res.json() : Promise.reject()).then(data => data.contents || Promise.reject())
        ]);
        const videos: { id: string, title: string }[] = [];
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{(?:[^}]*?"runs":\[\{"text":"(.*?)"\}\]|"simpleText":"(.*?)"\})/g;
        let match; const seen = new Set();
        while ((match = regex.exec(html)) !== null) {
          const id = match[1]; let title = match[2] || match[3] || '영상 제목 없음';
          title = title.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
          if (!seen.has(id)) { seen.add(id); videos.push({ id, title }); }
        }
        if (videos.length === 0) {
          const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g; let m;
          while ((m = idRegex.exec(html)) !== null) { if (!seen.has(m[1])) { seen.add(m[1]); videos.push({ id: m[1], title: '영상 제목 없음' }); } }
        }
        if (videos.length > 0) {
          setPlaylistVideos(videos);
          PLAYLIST_DATA_CACHE.set(playlistId, videos);
        }
      } catch (e) { } finally { setLoading(false); }
    };
    fetchPlaylist();
  }, [playlistId]);
  if (loading) return <div style={{ margin: '16px 0', padding: '12px', color: '#868e96', fontSize: '14px', border: '1px solid #e9ecef', borderRadius: '8px' }}>loading playlist...</div>;
  if (playlistVideos.length > 0) return (<div style={{ margin: '16px 0', padding: '12px', border: '1px solid #e9ecef', borderRadius: '8px' }}><div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Playlist ({playlistVideos.length})</div>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{playlistVideos.map((v, i) => (<li key={v.id} style={{ marginBottom: '8px', fontSize: '14px' }}><a href={`https://www.youtube.com/watch?v=${v.id}&list=${playlistId}&index=${i + 1}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#065fd4', display: 'flex', gap: '8px', alignItems: 'baseline' }}><span style={{ color: '#868e96', minWidth: '24px', fontSize: '13px' }}>{i + 1}.</span><span style={{ lineHeight: '1.4' }}>{v.title}</span></a></li>))}</ul></div>);
  return (<div style={{ margin: '16px 0', padding: '12px', border: '1px solid #e9ecef', borderRadius: '8px' }}><div style={{ marginBottom: '8px', fontSize: '14px' }}>Unable to extract videos list.</div><a href={`https://www.youtube.com/playlist?list=${playlistId}`} target="_blank" rel="noopener noreferrer" style={{ color: '#065fd4', textDecoration: 'none', fontSize: '14px' }}>Open Playlist on YouTube ↗</a></div>);
});


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

export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(({ content,
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
  const stateRef = React.useRef({ onEditDrawing, onEditSpreadsheet, isDark, memoId, isReadOnly, isComment, wordTitle, studyMode });
  stateRef.current = { onEditDrawing, onEditSpreadsheet, isDark, memoId, isReadOnly, isComment, wordTitle, studyMode };

  React.useEffect(() => {
    const handleSeek = (e: any) => {
      const { videoId, time } = e.detail;
      const player = (window as any).YT_PLAYERS?.get(videoId) || (window as any).YT?.get?.(videoId);
      const internalPlayer = (window as any).YT_PLAYERS_INTERNAL?.get?.(videoId);
      const activePlayer = internalPlayer || player;

      if (activePlayer && activePlayer.seekTo) {
        activePlayer.seekTo(time, true);
        if (activePlayer.playVideo) activePlayer.playVideo();
      }
    };
    window.addEventListener('yt-seek', handleSeek);
    return () => window.removeEventListener('yt-seek', handleSeek);
  }, []);




  const processedContent = React.useMemo(() => {
    let result = content;
    result = result.replace(
      /^:::collapse\s*(.*?)\n([\s\S]*?)\n:::$/gm,
      (_, title, body) => `<details><summary>${title.trim() || 'Details'}</summary>\n\n${body}\n\n</details>`
    );
    // Page break handling: handle \newpage with or without surrounding whitespace
    result = result.replace(/^\s*\\newpage\s*$/gm, '<div class="page-break"></div>');

    // Restore word blurring logic
    if (studyMode === 'hide-words' && wordTitle && wordTitle.trim()) {
      const escapedWord = wordTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(\\b${escapedWord}\\b)`, 'gi');
      result = result.replace(regex, '<span class="blurred-word">$1</span>');
    }

    return result;
  }, [content, studyMode, wordTitle]);


  const components = React.useMemo(() => ({
    a: ({ href, children, ...props }: any) => {
      try {
        if (!href) return <a {...props}>{children}</a>;
        let cleanHref = href;
        try { cleanHref = decodeURIComponent(href); } catch (e) { }
        cleanHref = (cleanHref || '').replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&#x26;/g, '&');

        // Handle timestamp links in comments or anywhere to seek instead of opening new tab
        const isYoutubeUrl = (cleanHref.includes('youtube.com') || cleanHref.includes('youtu.be'));
        const tMatch = cleanHref.match(/[?&]t=(\d+)/);
        if (isYoutubeUrl && tMatch) {
          let videoId = '';
          const vParamMatch = cleanHref.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          if (vParamMatch) videoId = vParamMatch[1];
          else {
            const pathMatch = cleanHref.match(/(?:youtu\.be\/|embed\/|shorts\/|v\/)([a-zA-Z0-9_-]{11})/);
            if (pathMatch) videoId = pathMatch[1];
          }

          if (videoId) {
            return (
              <a
                href={href}
                onClick={(e) => {
                  const el = document.getElementById(`yt-player-container-${videoId}`);
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    window.dispatchEvent(new CustomEvent('yt-seek', { detail: { videoId, time: parseInt(tMatch[1]) } }));
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          }
        }

        const isYoutube = isYoutubeUrl && !stateRef.current.isComment;
        if (isYoutube) {
          let videoId = ''; let timestamp = 0;
          const vParamMatch = cleanHref.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          if (vParamMatch && vParamMatch[1]) { videoId = vParamMatch[1]; }
          else {
            const pathMatch = cleanHref.match(/(?:youtu\.be\/|embed\/|shorts\/|v\/)([a-zA-Z0-9_-]{11})/);
            if (pathMatch && pathMatch[1]) videoId = pathMatch[1];
          }
          if (tMatch && tMatch[1]) timestamp = parseInt(tMatch[1]);
          if (videoId) return (
            <div key={`yt-wrap-${videoId}`} id={`yt-player-container-${videoId}`} style={{ margin: '16px 0' }}>
              <YouTubePlayer
                key={`yt-${videoId}`}
                videoId={videoId}
                startTimestamp={timestamp > 0 ? timestamp : undefined}
                memoId={stateRef.current.memoId}
                wordTitle={stateRef.current.wordTitle}
                studyMode={stateRef.current.studyMode}
                isShort={cleanHref.includes('shorts/')}
              />
            </div>
          );
          else {
            let playlistId = '';
            const listMatch = cleanHref.match(/[?&]list=([a-zA-Z0-9_-]+)/);
            if (listMatch) playlistId = listMatch[1];
            else { const showMatch = cleanHref.match(/\/show\/([a-zA-Z0-9_-]+)/); if (showMatch) playlistId = showMatch[1]; }
            if (playlistId) { if (playlistId.startsWith('VL')) playlistId = playlistId.substring(2); return <YoutubePlaylistView key={`pl-${playlistId}`} playlistId={playlistId} />; }
          }
        }
        const isStandalone = typeof children === 'string' && (children === href || children.startsWith('http'));
        if (isStandalone && href.startsWith('http')) return <WebPreview key={`web-${href}`} url={href} />;
        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
      } catch (e) { return <a href={href} {...props}>{children}</a>; }
    },
    img: ({ src, alt }: any) => {
      try {
        if (src) {
          const fileIdMatch = src.match(/\/file\/d\/([^\/]+)/) || src.match(/[?&]id=([^&]+)/);
          if (fileIdMatch && (src.includes('drive.google.com') || src.includes('docs.google.com'))) {
            const previewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
            const directImgUrl = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
            return (
              <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: '500px', margin: '1em 0' }}>
                <iframe
                  src={previewUrl}
                  width="100%"
                  height="100%"
                  style={{ border: '1px solid #ddd', borderRadius: '8px' }}
                  allow="autoplay"
                  title={alt}
                />
                <img className="print-fallback-img" src={directImgUrl} alt={alt} style={{ display: 'none', maxWidth: '100%', height: 'auto' }} />
              </div>
            );
          }
        }
        const meta = metadataCache.get(src || '');
        if (meta) {
          return (<img src={src} alt={alt} width={meta.width} height={meta.height} style={{ aspectRatio: `${meta.width} / ${meta.height}`, height: 'auto', maxWidth: '100%', display: 'block', margin: '1em auto' }} />);
        }
        return <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: '6px', display: 'block', margin: '1em auto' }} />;
      } catch (e) { return <img src={src} alt={alt} style={{ maxWidth: '100%' }} />; }
    },
    pre: ({ children, ...props }: any) => {
      try {
        const child = Array.isArray(children) ? children[0] : children;
        if (React.isValidElement(child) && (child.props as any).className?.includes('language-fabric')) return <>{children}</>;
        if (React.isValidElement(child) && (child.props as any).className?.includes('language-spreadsheet')) return <>{children}</>;
        return <div {...props}>{children}</div>;
      } catch (e) { return <pre {...props}>{children}</pre>; }
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      try {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        const json = String(children).replace(/\n$/, '');
        if (!inline && language === 'fabric') return <FabricPreview json={json} onClick={!stateRef.current.isReadOnly && stateRef.current.onEditDrawing ? () => stateRef.current.onEditDrawing?.(json) : undefined} />;
        if (!inline && language === 'spreadsheet') return <SpreadsheetPreview json={json} onClick={!stateRef.current.isReadOnly && stateRef.current.onEditSpreadsheet ? () => stateRef.current.onEditSpreadsheet?.(json) : undefined} />;
        if (!inline && language === 'web') { try { const url = json.trim(); new URL(url); return <WebPreview key={`web-${url}`} url={url} />; } catch (e) { return <code className={className} {...props}>{children}</code>; } }
        if (!inline && (language === 'youtube' || language === 'yt')) {
          try {
            let videoId = ''; const parts = json.split('\n'); const rawUrl = parts[0].trim();
            const startParam = parts.find(p => p.startsWith('start='))?.split('=')[1];
            const startTimestamp = startParam ? parseInt(startParam) : undefined;
            const isShort = parts.some(p => p.includes('short'));
            if (rawUrl.includes('youtube.com/watch?v=')) videoId = new URL(rawUrl).searchParams.get('v') || '';
            else if (rawUrl.includes('youtu.be/')) videoId = rawUrl.split('youtu.be/')[1].split('?')[0];
            else if (rawUrl.includes('youtube.com/shorts/')) videoId = rawUrl.split('youtube.com/shorts/')[1].split('?')[0];
            else videoId = rawUrl;
            if (videoId) return <YouTubePlayer key={`yt-${videoId}`} videoId={videoId} startTimestamp={startTimestamp} memoId={stateRef.current.memoId} isShort={isShort} />;
          } catch (e) { }
        }
        if (!inline) return (<SyntaxHighlighter style={stateRef.current.isDark ? vscDarkPlus : vs} language={language || 'text'} PreTag="div" {...props}>{json}</SyntaxHighlighter>);
        return <code className={className} {...props}>{children}</code>;
      } catch (e) { return <code className={className} {...props}>{children}</code>; }
    },
    span: ({ node, className, children, ...props }: any) => {
      if (className === 'blurred-word') {
        const isBlurred = stateRef.current.studyMode === 'hide-words';
        return <BlurredText $isBlurred={isBlurred}>{children}</BlurredText>;
      }
      let styleObj = props.style;
      if (typeof styleObj === 'string') {
        const style: Record<string, string> = {};
        styleObj.split(';').forEach(rule => {
          const colonIdx = rule.indexOf(':');
          if (colonIdx > -1) {
            const key = rule.slice(0, colonIdx).trim();
            const value = rule.slice(colonIdx + 1).trim();
            if (key && value) {
              const camelCaseKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
              style[camelCaseKey] = value;
            }
          }
        });
        styleObj = style;
      }
      return <span className={className} {...props} style={styleObj}>{children}</span>;
    },
    ...['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].reduce((acc, tag) => {
      acc[tag] = ({ node, children, ...props }: any) => {
        let styleObj = props.style;
        if (typeof styleObj === 'string') {
          const style: Record<string, string> = {};
          styleObj.split(';').forEach((rule: string) => {
            const colonIdx = rule.indexOf(':');
            if (colonIdx > -1) {
              const key = rule.slice(0, colonIdx).trim();
              const value = rule.slice(colonIdx + 1).trim();
              if (key && value) {
                const camelCaseKey = key.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
                style[camelCaseKey] = value;
              }
            }
          });
          styleObj = style;
        }
        if (props.align) {
          styleObj = { ...styleObj, textAlign: props.align === 'justify' ? 'justify' : props.align };
          delete props.align;
        }
        const Tag = tag as any;
        return <Tag {...props} style={styleObj}>{children}</Tag>;
      };
      return acc;
    }, {} as any)
  }), []);
  return (
    <MarkdownContainer $tableHeaderBg={tableHeaderBg} $fontSize={fontSize}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        remarkRehypeOptions={{ allowDangerousHtml: true }}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </MarkdownContainer>
  );
});