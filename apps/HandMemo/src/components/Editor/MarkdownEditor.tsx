import React, { useState, useRef, useEffect } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { renderToStaticMarkup } from 'react-dom/server';
import styled, { useTheme } from 'styled-components';
import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLanguage } from '../../contexts/LanguageContext';

// Custom styles for the editor to match theme
const EditorWrapper = styled.div`
  .EasyMDEContainer {
    .editor-toolbar {
      background: ${({ theme }) => theme.colors.surface};
      border-color: ${({ theme }) => theme.colors.border};
      i {
        color: ${({ theme }) => theme.colors.text};
      }
      button:hover {
        background: ${({ theme }) => theme.colors.border};
      }
      button.active {
        background: ${({ theme }) => theme.colors.border};
      }
    }
    
    .CodeMirror {
      background: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.text};
      border-color: ${({ theme }) => theme.colors.border};

      .CodeMirror-selected {
        background: ${({ theme }) => theme.colors.primary}55 !important;
      }
      
      .CodeMirror-selectedtext {
        color: inherit !important;
      }

      @media (max-width: 768px) {
        .CodeMirror-lines {
          padding: 4px 0;
        }
        pre.CodeMirror-line {
          padding: 0 4px !important;
        }
      }
    }
    
    .CodeMirror-cursor {
      border-left: 1px solid ${({ theme }) => theme.colors.text} !important;
    }
    
    .editor-preview {
      background: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.text};
      overscroll-behavior: none;
      
      /* Markdown Styles */
      blockquote {
        border-left-color: ${({ theme }) => theme.colors.border};
        color: ${({ theme }) => theme.colors.textSecondary};
      }
      a {
        color: ${({ theme }) => theme.colors.primary};
      }
      pre {
        background: ${({ theme }) => theme.colors.surface};
      }
      code {
        background: ${({ theme }) => theme.colors.surface};
      }
    }
    
    .editor-statusbar {
      color: ${({ theme }) => theme.colors.textSecondary};
    }

    .preview-container {
      padding: 10px;
      @media (max-width: 768px) {
        padding: 4px;
      }
    }
  }
`;

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange }) => {
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [initialDrawingData, setInitialDrawingData] = useState<string | undefined>(undefined);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [initialSpreadsheetData, setInitialSpreadsheetData] = useState<any>(undefined);
  const cmRef = useRef<any>(null); // CodeMirror instance
  const { t, language } = useLanguage();
  const editingBlockRef = useRef<{ start: number; end: number } | null>(null);

  // Stable reference to the handler for the toolbar
  const handleDrawingRef = useRef<(startLine?: number, endLine?: number) => void>(() => { });
  const handleSpreadsheetRef = useRef<(startLine?: number, endLine?: number) => void>(() => { });

  // Ref to hold the widget update function for external access (initial load)
  const updateWidgetsRef = useRef<(cm: any) => void>(() => { });

  const handleDrawing = (providedStartLine?: number, providedEndLine?: number) => {
    if (!cmRef.current) return;
    const cm = cmRef.current;

    let startLine = providedStartLine ?? -1;
    let endLine = providedEndLine ?? -1;

    if (startLine === -1) {
      const cursor = cm.getCursor();
      // Look up for start
      for (let i = cursor.line; i >= 0; i--) {
        const text = cm.getLine(i);
        if (text.trim().startsWith('```fabric')) {
          startLine = i;
          break;
        }
      }
      // Look down for end
      if (startLine !== -1) {
        for (let i = startLine + 1; i < cm.lineCount(); i++) {
          const text = cm.getLine(i);
          if (text.trim() === '```') {
            endLine = i;
            break;
          }
        }
      }
    }

    if (startLine !== -1 && endLine !== -1) {
      // Editing existing
      const lines = [];
      for (let i = startLine + 1; i < endLine; i++) {
        lines.push(cm.getLine(i));
      }
      let jsonStr = lines.join('\n').trim();
      if (jsonStr) {
        setInitialDrawingData(jsonStr);
      } else {
        setInitialDrawingData(undefined);
      }
      editingBlockRef.current = { start: startLine, end: endLine };
    } else {
      // New Drawing
      setInitialDrawingData(undefined);
      editingBlockRef.current = null;
    }

    setIsDrawingOpen(true);
  };

  const handleSpreadsheet = (providedStartLine?: number, providedEndLine?: number) => {
    if (!cmRef.current) return;
    const cm = cmRef.current;

    let startLine = providedStartLine ?? -1;
    let endLine = providedEndLine ?? -1;

    if (startLine === -1) {
      const cursor = cm.getCursor();
      for (let i = cursor.line; i >= 0; i--) {
        if (cm.getLine(i).trim().startsWith('```spreadsheet')) {
          startLine = i;
          break;
        }
      }
      if (startLine !== -1) {
        for (let i = startLine + 1; i < cm.lineCount(); i++) {
          if (cm.getLine(i).trim() === '```') {
            endLine = i;
            break;
          }
        }
      }
    }

    if (startLine !== -1 && endLine !== -1) {
      const lines = [];
      for (let i = startLine + 1; i < endLine; i++) {
        lines.push(cm.getLine(i));
      }
      try {
        setInitialSpreadsheetData(JSON.parse(lines.join('\n').trim()));
      } catch (e) {
        setInitialSpreadsheetData(undefined);
      }
      editingBlockRef.current = { start: startLine, end: endLine };
    } else {
      setInitialSpreadsheetData(undefined);
      editingBlockRef.current = null;
    }

    setIsSpreadsheetOpen(true);
  };

  handleDrawingRef.current = handleDrawing;
  handleSpreadsheetRef.current = handleSpreadsheet;

  const handleSaveDrawing = (json: string) => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const newBlock = `\`\`\`fabric\n${json}\n\`\`\``;

    if (editingBlockRef.current) {
      const { start, end } = editingBlockRef.current;
      cm.replaceRange(newBlock, { line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length });
    } else {
      const cursor = cm.getCursor();
      cm.replaceRange(`\n${newBlock}\n`, cursor);
    }

    editingBlockRef.current = null;
    setIsDrawingOpen(false);
    onChange(cm.getValue());
  };

  const handleSaveSpreadsheet = (data: any) => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const newBlock = `\`\`\`spreadsheet\n${JSON.stringify(data)}\n\`\`\``;

    if (editingBlockRef.current) {
      const { start, end } = editingBlockRef.current;
      cm.replaceRange(newBlock, { line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length });
    } else {
      const cursor = cm.getCursor();
      cm.replaceRange(`\n${newBlock}\n`, cursor);
    }

    editingBlockRef.current = null;
    setIsSpreadsheetOpen(false);
    onChange(cm.getValue());
  };

  const customRenderer = (plainText: string) => {
    const processedText = plainText.replace(/```fabric\s*([\s\S]*?)\s*```/g, () => {
      return `
          <div class="drawing-widget-banner" style="
            background: #fcfcfd; 
            border: 1px solid #edf2f7; 
            border-left: 4px solid #4c6ef5;
            border-radius: 8px; 
            padding: 12px 16px; 
            margin: 16px 0; 
            display: flex; 
            align-items: center; 
            gap: 12px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          " title="${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}">
            <div style="
              display: flex; 
              align-items: center; 
              justify-content: center; 
              width: 40px; 
              height: 40px; 
              background: #fff; 
              border-radius: 8px; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              font-size: 20px;
            ">🎨</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #343a40; font-size: 14px;">${language === 'ko' ? '그리기 객체' : 'Drawing Object'}</div>
              <div style="font-size: 11px; color: #868e96; margin-top: 2px;">
                ${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}
              </div>
            </div>
          </div>
        `;
    }).replace(/```spreadsheet\s*([\s\S]*?)\s*```/g, (_, jsonContent) => {
      try {
        const data = JSON.parse(jsonContent);
        if (Array.isArray(data) && data.length > 0) {
          const sheet = data[0];
          const celldata = sheet.celldata || [];
          const matrixData = sheet.data;

          const hasCelldata = Array.isArray(celldata) && celldata.length > 0;
          const hasMatrixData = Array.isArray(matrixData) && matrixData.length > 0;

          if (!hasCelldata && !hasMatrixData) {
            return `
                  <div class="spreadsheet-widget-banner" style="
                    background: #fcfcfd; 
                    border: 1px solid #d1d5db; 
                    border-left: 4px solid #00acc1;
                    border-radius: 6px; 
                    padding: 16px 20px; 
                    margin: 16px 0; 
                    display: flex; 
                    align-items: center; 
                    gap: 12px;
                    cursor: pointer;
                    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                  ">
                    <div style="font-size: 20px;">📊</div>
                    <div>
                      <div style="font-weight: 600; color: #343a40;">${language === 'ko' ? '스프레드시트 (비어 있음)' : 'Spreadsheet (Empty)'}</div>
                      <div style="font-size: 11px; color: #868e96;">${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}</div>
                    </div>
                  </div>
                `;
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
                grid[r][c] = cell ? (cell.m || cell.v || "") : "";
              }
            }
            maxCol = Math.min(maxCol, 20);
          } else if (hasCelldata) {
            celldata.forEach((cell: any) => {
              if (cell.r > maxRow) maxRow = cell.r;
              if (cell.c > maxCol) maxCol = cell.c;
            });
            maxRow = Math.min(maxRow, 100);
            maxCol = Math.min(maxCol, 20);
            for (let r = 0; r <= maxRow; r++) {
              grid[r] = new Array(maxCol + 1).fill("");
            }
            celldata.forEach((cell: any) => {
              if (cell.r <= maxRow && cell.c <= maxCol) {
                grid[cell.r][cell.c] = cell.v?.m || cell.v?.v || "";
              }
            });
          }

          let tableHtml = `<div class="spreadsheet-widget-banner" style="overflow: auto; max-height: 400px; margin: 16px 0; border: 1px solid #d1d5db; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); cursor: pointer; background: #fff;" title="${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}">`;
          tableHtml += '<table style="border-collapse: collapse; width: 100%; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 20px;">';
          tableHtml += '<thead><tr><th style="background:#f8f9fa; border: 1px solid #d1d5db; width: 32px; height: 20px; text-align: center; color: #666; padding: 0 4px; font-weight: 500;">#</th>';
          for (let c = 0; c <= maxCol; c++) {
            tableHtml += `<th style="background:#f8f9fa; border: 1px solid #d1d5db; height: 20px; padding: 0 8px; font-weight: 500; color: #666; text-align: center; min-width: 60px;">${String.fromCharCode(65 + c)}</th>`;
          }
          tableHtml += '</tr></thead><tbody>';
          for (let r = 0; r <= maxRow; r++) {
            tableHtml += `<tr><td style="background:#f8f9fa; border: 1px solid #d1d5db; height: 20px; text-align: center; color: #666; font-size: 11px; padding: 0 4px;">${r + 1}</td>`;
            for (let c = 0; c <= maxCol; c++) {
              tableHtml += `<td style="border: 1px solid #d1d5db; height: 20px; padding: 0 6px; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; vertical-align: middle;">${grid[r][c]}</td>`;
            }
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody></table>';
          if (sheet.data?.length > 101 || (sheet.data?.[0]?.length > 21) || maxRow >= 100 || maxCol >= 20) {
            tableHtml += `<div style="padding: 6px; text-align: center; color: #868e96; font-size: 11px; background: #f8f9fa; border-top: 1px solid #d1d5db; font-weight: 400; position: sticky; bottom: 0; left: 0; width: 100%; box-sizing: border-box;">${language === 'ko' ? '... 항목 더 있음 (편집기에서 확인 가능) ...' : '... more data available in editor ...'}</div>`;
          }
          tableHtml += '</div>';
          return tableHtml;
        }
      } catch (e) { }

      return `
            <div class="spreadsheet-widget-banner" style="
              background: linear-gradient(to right, #e3fafc, #e9ecef); 
              border: 1px solid #99e9f2; 
              border-left: 4px solid #1098ad;
              border-radius: 6px; 
              padding: 16px 20px; 
              margin: 16px 0; 
              display: flex; 
              align-items: center; 
              gap: 12px;
              cursor: pointer;
              font-family: system-ui, sans-serif;
            ">
              <div style="font-size: 20px;">📊</div>
              <div>
                <div style="font-weight: 600; color: #0c8599;">Spreadsheet Object</div>
                <div style="font-size: 11px; color: #66d9e8;">${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}</div>
              </div>
            </div>
          `;
    });

    const theme = useTheme() as any;
    const isDark = theme.mode === 'dark';

    return renderToStaticMarkup(
      <div className="preview-container">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            pre: ({ children, ...props }: any) => {
              const child = Array.isArray(children) ? children[0] : children;
              if (React.isValidElement(child) &&
                ((child.props as any).className?.includes('language-fabric') || (child.props as any).className?.includes('language-spreadsheet'))) {
                return <>{children}</>;
              }
              const updatedChild = React.isValidElement(child)
                ? React.cloneElement(child as any, { isBlock: true })
                : children;
              return <div {...props}>{updatedChild}</div>;
            },
            code({ node, className, children, isBlock, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';

              if (isBlock) {
                return (
                  <SyntaxHighlighter
                    style={isDark ? vscDarkPlus : vs}
                    language={language || 'text'}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              }
              return <code className={className} {...props}>{children}</code>;
            }
          }}
        >
          {processedText}
        </ReactMarkdown>
      </div>
    );
  };

  const options = React.useMemo(() => ({
    spellChecker: false,
    placeholder: "Type here... (Markdown + Math supported)",
    previewRender: customRenderer,
    toolbar: [
      "bold", "italic", "heading",
      "quote", "unordered-list", "ordered-list",
      "link", "image",
      {
        name: "drawing",
        action: () => handleDrawingRef.current(),
        className: "fa fa-pencil",
        title: language === 'ko' ? "그리기 삽입/편집" : "Insert/Edit Drawing",
      },
      {
        name: "spreadsheet",
        action: () => handleSpreadsheetRef.current(),
        className: "fa fa-table",
        title: language === 'ko' ? "스프레드시트 삽입/편집" : "Insert/Edit Spreadsheet",
      },
      "preview", "side-by-side", "fullscreen",
      "guide"
    ] as any,
    autofocus: false,
    status: false,
    maxHeight: "500px",
  }), [t, language]);

  useEffect(() => {
    updateWidgetsRef.current = (cm: any) => {
      if (!cm) return;

      const existingMarks: any[] = [];
      cm.getAllMarks().forEach((m: any) => {
        if (m.className === 'fabric-replacement-mark' || m.className === 'spreadsheet-replacement-mark') {
          existingMarks.push(m);
        }
      });

      const blocks: { type: 'fabric' | 'spreadsheet'; start: any; end: any; }[] = [];
      const lineCount = cm.lineCount();
      let inBlock = false;
      let blockType: 'fabric' | 'spreadsheet' | null = null;
      let startLine = -1;

      for (let i = 0; i < lineCount; i++) {
        const lineText = cm.getLine(i);
        if (lineText.trim().startsWith('```fabric')) {
          inBlock = true;
          blockType = 'fabric';
          startLine = i;
        } else if (lineText.trim().startsWith('```spreadsheet')) {
          inBlock = true;
          blockType = 'spreadsheet';
          startLine = i;
        } else if (inBlock && lineText.trim().startsWith('```')) {
          blocks.push({
            type: blockType!,
            start: { line: startLine, ch: 0 },
            end: { line: i, ch: lineText.length }
          });
          inBlock = false;
        }
      }

      existingMarks.forEach((mark) => {
        const pos = mark.find();
        if (!pos) return;
        const isStillValid = blocks.some(block =>
          block.start.line === pos.from.line && block.end.line === pos.to.line
        );
        if (!isStillValid) mark.clear();
      });

      blocks.forEach(block => {
        const marksAtStart = cm.findMarksAt(block.start);
        const className = block.type === 'fabric' ? 'fabric-replacement-mark' : 'spreadsheet-replacement-mark';
        const hasMark = marksAtStart.some((m: any) => m.className === className);

        if (!hasMark) {
          const el = document.createElement('div');
          el.className = block.type === 'fabric' ? 'drawing-widget-banner' : 'spreadsheet-widget-banner';
          el.style.cssText = `
                background: #f8f9fa; 
                border: 1px solid #dee2e6; 
                border-left: 4px solid ${block.type === 'fabric' ? '#4c6ef5' : '#1098ad'};
                border-radius: 8px; 
                padding: 12px 16px; 
                margin: 4px 0; 
                display: flex; 
                align-items: center; 
                gap: 12px;
                font-family: system-ui, sans-serif;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                cursor: pointer;
                user-select: none;
              `;
          el.innerHTML = `
                <div style="font-size: 20px;">${block.type === 'fabric' ? '🎨' : '📊'}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: #343a40; font-size: 14px;">${block.type === 'fabric' ? 'Drawing' : 'Spreadsheet'} Object</div>
                  <div style="font-size: 11px; color: #868e96;">${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}</div>
                </div>
              `;

          el.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            cm.setCursor(block.start);
            if (block.type === 'fabric') handleDrawingRef.current(block.start.line, block.end.line);
            else handleSpreadsheetRef.current(block.start.line, block.end.line);
          };

          cm.markText(block.start, block.end, {
            replacedWith: el,
            atomic: true,
            className: className,
            selectRight: true,
            handleMouseEvents: true
          });
        }
      });
    };

    const cm = cmRef.current;
    if (cm) {
      updateWidgetsRef.current(cm);
      const changeHandler = () => updateWidgetsRef.current(cm);
      cm.on('change', changeHandler);

      const handleWidgetClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const spreadsheetBanner = target.closest('.spreadsheet-widget-banner');
        const fabricBanner = target.closest('.drawing-widget-banner');

        if (spreadsheetBanner || fabricBanner) {
          e.preventDefault();
          e.stopPropagation();
          const pos = cm.coordsChar({ left: e.clientX, top: e.clientY }, 'window');
          const marks = cm.findMarksAt(pos);

          let startLine: number | undefined;
          let endLine: number | undefined;

          if (spreadsheetBanner) {
            const mark = marks.find((m: any) => m.className === 'spreadsheet-replacement-mark');
            if (mark) {
              const range = mark.find();
              if (range) {
                startLine = (range as any).from.line;
                endLine = (range as any).to.line;
                cm.setCursor((range as any).from);
              }
            }
            handleSpreadsheetRef.current(startLine, endLine);
          } else if (fabricBanner) {
            const mark = marks.find((m: any) => m.className === 'fabric-replacement-mark');
            if (mark) {
              const range = mark.find();
              if (range) {
                startLine = (range as any).from.line;
                endLine = (range as any).to.line;
                cm.setCursor((range as any).from);
              }
            }
            handleDrawingRef.current(startLine, endLine);
          }
        }
      };

      const container = containerRef.current;
      if (container) container.addEventListener('click', handleWidgetClick, true);

      return () => {
        cm.off('change', changeHandler);
        if (container) container.removeEventListener('click', handleWidgetClick, true);
      };
    }
  }, [value, language]);

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <EditorWrapper ref={containerRef}>
        <SimpleMDE
          value={value}
          onChange={onChange}
          options={options}
          getCodemirrorInstance={(cm) => {
            cmRef.current = cm;
            if (updateWidgetsRef.current) {
              setTimeout(() => updateWidgetsRef.current(cm), 100);
            }
          }}
        />
      </EditorWrapper>
      {isDrawingOpen && (
        <FabricCanvasModal
          language={language}
          initialData={initialDrawingData}
          onSave={handleSaveDrawing}
          onClose={() => {
            setIsDrawingOpen(false);
            editingBlockRef.current = null;
          }}
        />
      )}
      <SpreadsheetModal
        isOpen={isSpreadsheetOpen}
        onClose={() => {
          setIsSpreadsheetOpen(false);
          editingBlockRef.current = null;
        }}
        onSave={handleSaveSpreadsheet}
        initialData={initialSpreadsheetData}
        language={language as 'en' | 'ko'}
      />
    </>
  );
};
