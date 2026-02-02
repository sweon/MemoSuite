import React from 'react';
import { useLanguage, metadataCache } from '@memosuite/shared';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Comment } from '../../db';

import ReactMarkdown from 'react-markdown';

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
import { FiArrowDown } from 'react-icons/fi';

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
          {language === 'ko' ? '두 손가락으로 내부 스크롤' : 'Use two fingers to scroll inside'}
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

const MarkdownContainer = styled.div<{ $tableHeaderBg?: string }>`
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text};
  overscroll-behavior: none;

  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  p {
    margin-bottom: 1em;
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
`;

const PREVIEW_CACHE = new Map<string, string>();

// Global registry for YT players to enable internal seeking
const YT_PLAYERS = new Map<string, any>();



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

const YouTubePlayer = ({ videoId, startTimestamp, memoId }: { videoId: string; startTimestamp?: number; memoId?: number }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);
  const intervalRef = React.useRef<any>(null);
  const isMounted = React.useRef(true);
  const [hasError, setHasError] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

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
          playerVars: {
            start: startSeconds,
            origin: window.location.origin,
            modestbranding: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: () => {
              if (isMounted.current) setIsReady(true);
            },
            onStateChange: (event: any) => {
              if (!isMounted.current) return;
              if (event.data === 1) { // playing
                if (!intervalRef.current) {
                  intervalRef.current = setInterval(() => {
                    if (playerRef.current && playerRef.current.getCurrentTime) {
                      const currentTime = Math.floor(playerRef.current.getCurrentTime());
                      if (currentTime > 0) {
                        localStorage.setItem(`yt_progress_${videoId}`, String(currentTime));
                        localStorage.setItem(`yt_last_active`, JSON.stringify({ videoId, time: currentTime, timestamp: Date.now() }));
                      }
                    }
                  }, 2000); // More frequent updates for better accuracy
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

  // Handle registration when ready
  React.useEffect(() => {
    if (isReady && playerRef.current && videoId) {
      YT_PLAYERS.set(videoId, playerRef.current);
    }
  }, [isReady, videoId]);

  if (hasError) {
    return (
      <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <iframe
          width="100%"
          height="315"
          src={`https://www.youtube.com/embed/${videoId}${startTimestamp ? `?start=${startTimestamp}` : ''}`}
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
        id={`yt-player-${videoId}`}
        style={{
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          background: '#000',
          transition: 'opacity 0.5s'
        }}>
        {!isReady && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '11px',
            background: '#111'
          }}>
            YouTube Loading...
          </div>
        )}
        <div ref={containerRef} style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }} />
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
        // Use AllOrigins proxy to avoid CORS
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/playlist?list=${playlistId}`)}`);
        if (!res.ok) throw new Error('Proxy fetch failed');
        const data = await res.json();
        const html = data.contents || '';

        const videos: { id: string, title: string }[] = [];
        // Enhanced regex to match both formats
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"(?:[^}]*?"title":\{"runs":\[\{"text":"(.*?)"\}\])?/g;
        let match;
        const seen = new Set();
        while ((match = regex.exec(html)) !== null) {
          const id = match[1];
          let title = match[2] || 'Untitled Video';
          title = title.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
          if (!seen.has(id)) {
            seen.add(id);
            videos.push({ id, title });
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
  tableHeaderBg?: string;
  onEditDrawing?: (json: string) => void;
  onEditSpreadsheet?: (json: string) => void;
  isComment?: boolean;
}

export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(({
  content,
  memoId,
  tableHeaderBg,
  onEditDrawing,
  onEditSpreadsheet,
  isComment
}) => {
  const theme = useTheme() as any;
  const isDark = theme.mode === 'dark';

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
                <YouTubePlayer videoId={videoId} startTimestamp={timestamp > 0 ? timestamp : undefined} memoId={memoId} />
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
          return <FabricPreview json={json} onClick={onEditDrawing ? () => onEditDrawing(json) : undefined} />;
        }

        if (!inline && language === 'spreadsheet') {
          return <SpreadsheetPreview json={json} onClick={onEditSpreadsheet ? () => onEditSpreadsheet(json) : undefined} />;
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
  }), [onEditDrawing, onEditSpreadsheet, isDark]);

  return (
    <MarkdownContainer $tableHeaderBg={tableHeaderBg}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </MarkdownContainer>
  );
}, (prev, next) => {
  // Only re-render if the content or visual style actually changes.
  // We ignore functional props (onEditDrawing, etc) because they are typically
  // inline-defined in parents and would otherwise trigger unnecessary re-renders
  // and remounts of heavy components like YouTube players.
  return prev.content === next.content &&
    prev.tableHeaderBg === next.tableHeaderBg;
});