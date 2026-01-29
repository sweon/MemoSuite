import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@memosuite/shared';

import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import ReactMarkdown from 'react-markdown';

import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { renderToStaticMarkup } from 'react-dom/server';
import styled, { useTheme } from 'styled-components';
import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { SpreadsheetModal } from '@memosuite/shared-spreadsheet';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

  const handleDrawingRef = useRef<(startLine?: number, endLine?: number) => void>(() => { });
  const handleSpreadsheetRef = useRef<(startLine?: number, endLine?: number) => void>(() => { });
  const updateWidgetsRef = useRef<(cm: any) => void>(() => { });
  const lastCursorRef = useRef<any>(null);

  const findBlock = (type: 'fabric' | 'spreadsheet') => {
    if (!cmRef.current) return { startLine: -1, endLine: -1 };
    const cm = cmRef.current;
    const cursor = cm.getCursor();
    let startLine = -1;
    let endLine = -1;
    const prefix = `\`\`\`${type}`;

    for (let r = cursor.line; r >= 0; r--) {
      const line = cm.getLine(r).trim();
      if (line.startsWith(prefix)) {
        startLine = r;
        break;
      }
      // If we find a closing block before the opening one, we are not inside a block
      if (r < cursor.line && line === '```') break;
    }

    if (startLine !== -1) {
      for (let r = startLine + 1; r < cm.lineCount(); r++) {
        if (cm.getLine(r).trim() === '```') {
          endLine = r;
          break;
        }
      }
    }

    if (startLine !== -1 && endLine !== -1 && cursor.line >= startLine && cursor.line <= endLine) {
      return { startLine, endLine };
    }
    return { startLine: -1, endLine: -1 };
  };

  const handleDrawing = (providedStartLine?: number, providedEndLine?: number) => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    let { startLine, endLine } = { startLine: providedStartLine ?? -1, endLine: providedEndLine ?? -1 };

    if (startLine === -1) {
      const found = findBlock('fabric');
      startLine = found.startLine;
      endLine = found.endLine;
    }

    if (startLine !== -1 && endLine !== -1) {
      const lines = [];
      for (let r = startLine + 1; r < endLine; r++) lines.push(cm.getLine(r));
      setInitialDrawingData(lines.join('\n').trim());
      editingBlockRef.current = { start: startLine, end: endLine };
      lastCursorRef.current = null;
    } else {
      setInitialDrawingData(undefined);
      editingBlockRef.current = null;
      lastCursorRef.current = cm.getCursor();
    }
    setIsDrawingOpen(true);
  };

  const handleSpreadsheet = (providedStartLine?: number, providedEndLine?: number) => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    let { startLine, endLine } = { startLine: providedStartLine ?? -1, endLine: providedEndLine ?? -1 };

    if (startLine === -1) {
      const found = findBlock('spreadsheet');
      startLine = found.startLine;
      endLine = found.endLine;
    }

    if (startLine !== -1 && endLine !== -1) {
      const lines = [];
      for (let r = startLine + 1; r < endLine; r++) lines.push(cm.getLine(r));
      try {
        setInitialSpreadsheetData(JSON.parse(lines.join('\n').trim()));
      } catch (e) {
        setInitialSpreadsheetData(undefined);
      }
      editingBlockRef.current = { start: startLine, end: endLine };
      lastCursorRef.current = null;
    } else {
      setInitialSpreadsheetData(undefined);
      editingBlockRef.current = null;
      lastCursorRef.current = cm.getCursor();
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
      cm.replaceRange(`\n${newBlock}\n`, cm.getCursor());
    }
    editingBlockRef.current = null;
    setIsDrawingOpen(false);
    onChange(cm.getValue());
  };

  const handleAutosaveDrawing = (json: string) => {
    if (!cmRef.current || !isDrawingOpen) return;
    const cm = cmRef.current;
    const newBlock = `\`\`\`fabric\n${json}\n\`\`\``;

    if (editingBlockRef.current) {
      const { start, end } = editingBlockRef.current;
      const currentBlock = cm.getRange({ line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length });
      if (newBlock !== currentBlock) {
        cm.replaceRange(newBlock, { line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length });
        onChange(cm.getValue());
      }
    } else if (lastCursorRef.current) {
      const cursor = lastCursorRef.current;
      const insertText = `\n\n${newBlock}\n`;
      cm.replaceRange(insertText, cursor);

      // Move cursor into the newly inserted block so findBlock can find it
      const newCursor = { line: cursor.line + 2, ch: 0 };
      cm.setCursor(newCursor);

      // Try to find the newly inserted block
      const found = findBlock('fabric');
      if (found.startLine !== -1) {
        editingBlockRef.current = { start: found.startLine, end: found.endLine };
      }
      lastCursorRef.current = null;
      onChange(cm.getValue());
    }
  };

  const handleSaveSpreadsheet = (data: any) => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const newBlock = `\`\`\`spreadsheet\n${JSON.stringify(data)}\n\`\`\``;
    if (editingBlockRef.current) {
      const { start, end } = editingBlockRef.current;
      cm.replaceRange(newBlock, { line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length });
    } else {
      cm.replaceRange(`\n${newBlock}\n`, cm.getCursor());
    }
    editingBlockRef.current = null;
    setIsSpreadsheetOpen(false);
    onChange(cm.getValue());
  };

  const handleAutosaveSpreadsheet = (data: any) => {
    if (!cmRef.current || !isSpreadsheetOpen) return;
    const cm = cmRef.current;
    const newBlock = `\`\`\`spreadsheet\n${JSON.stringify(data)}\n\`\`\``;

    if (editingBlockRef.current) {
      const { start, end } = editingBlockRef.current;
      const currentBlock = cm.getRange({ line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length });
      if (newBlock !== currentBlock) {
        cm.replaceRange(newBlock, { line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length });
        onChange(cm.getValue());
      }
    } else if (lastCursorRef.current) {
      const cursor = lastCursorRef.current;
      const insertText = `\n\n${newBlock}\n`;
      cm.replaceRange(insertText, cursor);

      // Move cursor into the newly inserted block so findBlock can find it
      const newCursor = { line: cursor.line + 2, ch: 0 };
      cm.setCursor(newCursor);

      // Try to find the newly inserted block
      const found = findBlock('spreadsheet');
      if (found.startLine !== -1) {
        editingBlockRef.current = { start: found.startLine, end: found.endLine };
      }
      lastCursorRef.current = null;
      onChange(cm.getValue());
    }
  };

  const customRenderer = (plainText: string) => {
    const processedText = plainText.replace(/```fabric\s*([\s\S]*?)\s*```/g, () => {
      return `
        <div class="drawing-widget-banner" style="
          background: #fcfcfd; border: 1px solid #edf2f7; border-left: 4px solid #4c6ef5;
          border-radius: 8px; padding: 12px 16px; margin: 16px 0; display: flex; align-items: center; gap: 12px; cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        ">
          <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 20px;">🎨</div>
          <div>
            <div style="font-weight: 600; color: #343a40; font-size: 14px;">${language === 'ko' ? '그리기 객체' : 'Drawing Object'}</div>
            <div style="font-size: 11px; color: #868e96; margin-top: 2px;">${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}</div>
          </div>
        </div>
      `;
    }).replace(/```spreadsheet\s*([\s\S]*?)\s*```/g, () => {
      return `
        <div class="spreadsheet-widget-banner" style="
          background: #fcfcfd; border: 1px solid #edf2f7; border-left: 4px solid #1098ad;
          border-radius: 8px; padding: 12px 16px; margin: 16px 0; display: flex; align-items: center; gap: 12px; cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        ">
          <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 20px;">📊</div>
          <div>
            <div style="font-weight: 600; color: #343a40; font-size: 14px;">${language === 'ko' ? '스프레드시트 객체' : 'Spreadsheet Object'}</div>
            <div style="font-size: 11px; color: #868e96; margin-top: 2px;">${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}</div>
          </div>
        </div>
      `;
    });

    const isDark = (useTheme() as any).mode === 'dark';

    return renderToStaticMarkup(
      <div className="preview-container">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeKatex]}
          components={{
            pre: ({ children, ...props }: any) => {
              const child = Array.isArray(children) ? children[0] : children;
              if (React.isValidElement(child) &&
                ((child.props as any).className?.includes('language-fabric') || (child.props as any).className?.includes('language-spreadsheet'))) {
                return <>{children}</>;
              }
              const updatedChild = React.isValidElement(child) ? React.cloneElement(child as any, { isBlock: true }) : children;
              return <div {...props}>{updatedChild}</div>;
            },
            code({ node, className, children, isBlock, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const languageStr = match ? match[1] : '';
              if (isBlock) {
                return (
                  <SyntaxHighlighter
                    style={isDark ? vscDarkPlus : vs}
                    language={languageStr || 'text'}
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
      "bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|",
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
      "|", "preview", "side-by-side", "fullscreen", "|", "guide"
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
      for (let i = 0; i < cm.lineCount(); i++) {
        const text = cm.getLine(i).trim();
        let type: 'fabric' | 'spreadsheet' | null = null;
        if (text.startsWith('```fabric')) type = 'fabric' as const;
        else if (text.startsWith('```spreadsheet')) type = 'spreadsheet' as const;

        if (type) {
          let startLine = i;
          let endLine = -1;
          for (let j = i + 1; j < cm.lineCount(); j++) {
            if (cm.getLine(j).trim() === '```') {
              endLine = j;
              break;
            }
          }
          if (endLine !== -1) {
            blocks.push({ type, start: { line: startLine, ch: 0 }, end: { line: endLine, ch: cm.getLine(endLine).length } });
            i = endLine;
          }
        }
      }

      existingMarks.forEach((mark) => {
        const pos = mark.find();
        if (!pos || !blocks.some(b => b.start.line === (pos as any).from.line && b.end.line === (pos as any).to.line)) {
          mark.clear();
        }
      });

      blocks.forEach(block => {
        const className = block.type === 'fabric' ? 'fabric-replacement-mark' : 'spreadsheet-replacement-mark';
        if (!cm.findMarksAt(block.start).some((m: any) => m.className === className)) {
          const el = document.createElement('div');
          el.className = block.type === 'fabric' ? 'drawing-widget-banner' : 'spreadsheet-widget-banner';
          el.style.cssText = `background: #f8f9fa; border: 1px solid #dee2e6; border-left: 4px solid ${block.type === 'fabric' ? '#4c6ef5' : '#1098ad'}; border-radius: 8px; padding: 12px 16px; margin: 4px 0; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;`;
          el.innerHTML = `<div style="font-size: 20px;">${block.type === 'fabric' ? '🎨' : '📊'}</div><div style="flex: 1;"><div style="font-weight: 600; color: #343a40; font-size: 14px;">${block.type === 'fabric' ? 'Drawing' : 'Spreadsheet'} Object</div><div style="font-size: 11px; color: #868e96;">${language === 'ko' ? '클릭하여 편집' : 'Click to edit'}</div></div>`;
          el.onclick = (e) => {
            e.stopPropagation(); e.preventDefault();
            cm.setCursor(block.start);
            if (block.type === 'fabric') handleDrawingRef.current(block.start.line, block.end.line);
            else handleSpreadsheetRef.current(block.start.line, block.end.line);
          };
          cm.markText(block.start, block.end, { replacedWith: el, atomic: true, className, selectRight: true, handleMouseEvents: true });
        }
      });
    };

    const cm = cmRef.current;
    if (cm) {
      updateWidgetsRef.current(cm);
      const changeHandler = () => updateWidgetsRef.current(cm);
      cm.on('change', changeHandler);
      return () => cm.off('change', changeHandler);
    }
  }, [value, language]);

  return (
    <>
      <EditorWrapper>
        <SimpleMDE
          value={value}
          onChange={onChange}
          options={options}
          getCodemirrorInstance={(cm) => {
            cmRef.current = cm;
            if (updateWidgetsRef.current) setTimeout(() => updateWidgetsRef.current(cm), 100);
          }}
        />
      </EditorWrapper>
      {isDrawingOpen && (
        <FabricCanvasModal
          language={language}
          initialData={initialDrawingData}
          onSave={handleSaveDrawing}
          onAutosave={handleAutosaveDrawing}
          onClose={() => { setIsDrawingOpen(false); editingBlockRef.current = null; }}
        />
      )}
      <SpreadsheetModal
        isOpen={isSpreadsheetOpen}
        onClose={() => { setIsSpreadsheetOpen(false); editingBlockRef.current = null; }}
        onSave={handleSaveSpreadsheet}
        onAutosave={handleAutosaveSpreadsheet}
        initialData={initialSpreadsheetData}
        language={language as 'en' | 'ko'}
      />
    </>
  );
};