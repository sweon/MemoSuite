import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@memosuite/shared';

import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import ReactMarkdown from 'react-markdown';

import rehypeRaw from 'rehype-raw';
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
  height: auto;
  overflow: visible;

  .EasyMDEContainer {
    height: auto;
    overflow: visible;

    .editor-toolbar {
      z-index: 4;
      background: ${({ theme }) => theme.colors.surface};
      border-color: ${({ theme }) => theme.colors.border};
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      position: sticky;
      top: 42px;

      @media (max-width: 480px) {
        top: 68px;
      }

      i {
        color: ${({ theme }) => theme.colors.text};
      }
      button:hover {
        background: ${({ theme }) => theme.colors.border};
      }
      button.active {
        background: ${({ theme }) => theme.colors.border};
      }

      /* Custom icon for drawing button (FiPenTool style) */
      button[title*="Drawing"] i.fa-pencil::before,
      button[title*="그리기"] i.fa-pencil::before {
        content: '';
        display: inline-block;
        width: 1em;
        height: 1em;
        vertical-align: middle;
        background-color: #D55E00;
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 19l7-7 3 3-7 7-3-3z'/%3E%3Cpath d='M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'/%3E%3Cpath d='M2 2l7.586 7.586'/%3E%3Ccircle cx='11' cy='11' r='2'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 19l7-7 3 3-7 7-3-3z'/%3E%3Cpath d='M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'/%3E%3Cpath d='M2 2l7.586 7.586'/%3E%3Ccircle cx='11' cy='11' r='2'/%3E%3C/svg%3E");
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
      }

      /* Custom icon for spreadsheet button (simple grid table) */
      button[title*="Spreadsheet"] i.fa-table::before,
      button[title*="스프레드시트"] i.fa-table::before {
        content: '';
        display: inline-block;
        width: 1em;
        height: 1em;
        vertical-align: middle;
        background-color: #009E73;
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23000'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2' fill='none' stroke='%23000' stroke-width='2'/%3E%3Cline x1='3' y1='9' x2='21' y2='9' stroke='%23000' stroke-width='2'/%3E%3Cline x1='3' y1='15' x2='21' y2='15' stroke='%23000' stroke-width='2'/%3E%3Cline x1='9' y1='3' x2='9' y2='21' stroke='%23000' stroke-width='2'/%3E%3Cline x1='15' y1='3' x2='15' y2='21' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23000'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2' fill='none' stroke='%23000' stroke-width='2'/%3E%3Cline x1='3' y1='9' x2='21' y2='9' stroke='%23000' stroke-width='2'/%3E%3Cline x1='3' y1='15' x2='21' y2='15' stroke='%23000' stroke-width='2'/%3E%3Cline x1='9' y1='3' x2='9' y2='21' stroke='%23000' stroke-width='2'/%3E%3Cline x1='15' y1='3' x2='15' y2='21' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E");
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
      }
    }
    
    .CodeMirror {
      height: auto !important;
      min-height: 300px;
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
      ul.contains-task-list {
        padding-left: 0;
        list-style: none;
      }
      li.task-list-item {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
      }
      input[type="checkbox"] {
        -webkit-appearance: none;
        appearance: none;
        width: 1.4em;
        height: 1.4em;
        border: 2px solid ${({ theme }) => theme.colors.primary};
        border-radius: 4px;
        margin: 0.1em 0.4em 0.2em 0;
        vertical-align: middle;
        cursor: pointer;
        position: relative;
        background: transparent;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;

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
      }

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
  initialScrollPercentage?: number;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  initialScrollPercentage
}) => {
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [initialDrawingData, setInitialDrawingData] = useState<string | undefined>(undefined);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [initialSpreadsheetData, setInitialSpreadsheetData] = useState<any>(undefined);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const cmRef = useRef<any>(null); // CodeMirror instance
  const { t, language } = useLanguage();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const editingBlockRef = useRef<{ start: number; end: number } | null>(null);

  const handleDrawingRef = useRef<(startLine?: number, endLine?: number) => void>(() => { });
  const handleSpreadsheetRef = useRef<(startLine?: number, endLine?: number) => void>(() => { });
  const updateWidgetsRef = useRef<(cm: any) => void>(() => { });
  const lastCursorRef = useRef<any>(null);
  const toggleChecklistRef = useRef<() => void>(() => { });

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

  const toggleChecklist = () => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const doc = cm.getDoc();
    const selections = doc.listSelections();

    for (const sel of selections) {
      const startLine = Math.min(sel.anchor.line, sel.head.line);
      const endLine = Math.max(sel.anchor.line, sel.head.line);

      for (let i = startLine; i <= endLine; i++) {
        const line = doc.getLine(i);
        const trim = line.trim();
        if (trim.startsWith('- [ ] ')) {
          const index = line.indexOf('- [ ] ');
          doc.replaceRange('', { line: i, ch: index }, { line: i, ch: index + 6 });
        } else if (trim.startsWith('- [x] ')) {
          const index = line.indexOf('- [x] ');
          doc.replaceRange('', { line: i, ch: index }, { line: i, ch: index + 6 });
        } else {
          const indentMatch = line.match(/^\s*/);
          const indent = indentMatch ? indentMatch[0] : '';
          const content = line.substring(indent.length);
          doc.replaceRange(`${indent}- [ ] ${content}`, { line: i, ch: 0 }, { line: i, ch: line.length });
        }
      }
    }
    cm.focus();
  };

  const handleMath = () => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const selection = cm.getSelection();
    cm.replaceSelection(`$${selection}$`);
    if (!selection) {
      const cursor = cm.getCursor();
      cm.setCursor({ line: cursor.line, ch: cursor.ch - 1 });
    }
    cm.focus();
  };

  const handleTime = () => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const now = new Date();
    const formatted = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
    cm.replaceSelection(formatted);
    cm.focus();
  };

  const handleDetails = () => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const selection = cm.getSelection();
    cm.replaceSelection(`<details>\n<summary>${language === 'ko' ? '자세히 보기' : 'Click to view'}</summary>\n\n${selection}\n</details>`);
    cm.focus();
  };

  const handleColor = () => {
    if (!cmRef.current) return;
    const cm = cmRef.current;
    const selection = cm.getSelection();
    cm.replaceSelection(`<span style="color:red">${selection}</span>`);
    cm.focus();
  };


  handleDrawingRef.current = handleDrawing;
  handleSpreadsheetRef.current = handleSpreadsheet;
  toggleChecklistRef.current = toggleChecklist;


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
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          remarkRehypeOptions={{ allowDangerousHtml: true }}
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
      "bold", "italic", "heading", "quote", "unordered-list", "ordered-list",
      {
        name: "checklist",
        action: () => toggleChecklistRef.current(),
        className: "fa fa-check-square-o",
        title: language === 'ko' ? "체크리스트" : "Checklist",
      },
      "link", "image",
      {
        name: "drawing",
        action: () => handleDrawingRef.current(),
        className: "fa fa-pencil",
        title: language === 'ko' ? "그리기 삽입 및 편집" : "Insert or Edit Drawing",
      },
      {
        name: "spreadsheet",
        action: () => handleSpreadsheetRef.current(),
        className: "fa fa-table",
        title: language === 'ko' ? "스프레드시트 삽입 및 편집" : "Insert or Edit Spreadsheet",
      },
      "horizontal-rule",
      {
        name: "math",
        action: () => handleMath(),
        className: "fa fa-superscript",
        title: language === 'ko' ? "수식 (LaTeX)" : "Math (LaTeX)",
      },
      {
        name: "time",
        action: () => handleTime(),
        className: "fa fa-clock-o",
        title: language === 'ko' ? "현재 시간 삽입" : "Insert Current Time",
      },
      {
        name: "details",
        action: () => handleDetails(),
        className: "fa fa-caret-square-o-down",
        title: language === 'ko' ? "접기/펼치기 (Details)" : "Collapse/Details",
      },
      {
        name: "color",
        action: () => handleColor(),
        className: "fa fa-paint-brush",
        title: language === 'ko' ? "빨간색 글씨" : "Red Text",
      },
      "guide"
    ] as any,
    autofocus: initialScrollPercentage !== undefined,
    toolbarSticky: true,
    toolbarStickyOffset: isMobile ? 90 : 48,
    status: false,
    codeMirrorOptions: {
      dragDrop: false,
      inputStyle: 'contenteditable',
      spellcheck: false,
    }
  }), [t, language, initialScrollPercentage]);

  useEffect(() => {
    if (cmRef.current && initialScrollPercentage !== undefined) {
      const cm = cmRef.current;
      setTimeout(() => {
        const lineCount = cm.lineCount();
        const targetLine = Math.floor(lineCount * initialScrollPercentage);
        cm.setCursor({ line: targetLine, ch: 0 });
        cm.focus();
      }, 100);
    }
  }, [initialScrollPercentage]);

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