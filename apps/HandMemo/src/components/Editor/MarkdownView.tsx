import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import styled, { useTheme } from 'styled-components';
import { fabric } from 'fabric';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculateBackgroundColor, createBackgroundPattern } from '@memosuite/shared-drawing';

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

          const finishRendering = () => {
            if (!isMountedRef.current) {
              staticCanvas.dispose();
              return;
            }

            const w = data.width || 800;
            const multiplier = w > 1000 ? 1000 / w : 1;

            const base64 = staticCanvas.toDataURL({
              format: 'png',
              quality: 0.5,
              multiplier
            });

            PREVIEW_CACHE.set(json, base64);
            setImgSrc(base64);
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

            // Handle Background config if exists
            if (data.backgroundConfig) {
              const cfg = data.backgroundConfig;
              const bgColor = calculateBackgroundColor(cfg.colorType, cfg.intensity);

              if (cfg.type === 'image' && cfg.imageData) {
                const img = new Image();
                img.onload = () => {
                  if (!isMountedRef.current) return;
                  const pat = createBackgroundPattern(
                    cfg.type, bgColor, cfg.opacity, cfg.size, false, cfg.bundleGap, img, cfg.imageOpacity, staticCanvas.getWidth()
                  );
                  staticCanvas.setBackgroundColor(pat, () => {
                    staticCanvas.renderAll();
                    finishRendering();
                  });
                };
                img.src = cfg.imageData;
                return; // Wait for image load
              } else {
                const pat = createBackgroundPattern(
                  cfg.type, bgColor, cfg.opacity, cfg.size, false, cfg.bundleGap, undefined, cfg.imageOpacity, staticCanvas.getWidth()
                );
                staticCanvas.setBackgroundColor(pat, () => {
                  staticCanvas.renderAll();
                  finishRendering();
                });
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
          <div style={{ padding: '8px', textAlign: 'center', color: '#666', fontSize: '11px', background: '#f8f9fa', borderTop: '1px solid #d1d5db', position: 'sticky', bottom: 0, left: 0, width: '100%', boxSizing: 'border-box' }}>
            {language === 'ko' ? '... 항목 더 있음 (편집기에서 확인 가능) ...' : '... more data available in editor ...'}
          </div>
        )}
      </div>
    );
  } catch (e) {
    return <div style={{ color: 'red', fontSize: '12px' }}>Failed to render spreadsheet preview</div>;
  }
};

interface MarkdownViewProps {
  content: string;
  tableHeaderBg?: string;
  onEditDrawing?: (json: string) => void;
  onEditSpreadsheet?: (json: string) => void;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  tableHeaderBg,
  onEditDrawing,
  onEditSpreadsheet
}) => {
  const theme = useTheme() as any;
  const isDark = theme.mode === 'dark';

  return (
    <MarkdownContainer $tableHeaderBg={tableHeaderBg}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
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
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </MarkdownContainer>
  );
};
