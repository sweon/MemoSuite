import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { TRANSFORMERS, CHECK_LIST } from "@lexical/markdown";
import type { Transformer, TextMatchTransformer } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { MemoSuiteTheme } from "./themes/MemoSuiteTheme";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { $nodesOfType, ParagraphNode, $isTextNode, $createTextNode, $createParagraphNode } from "lexical";
import type { LexicalNode, EditorState } from "lexical";

import { HandwritingNode, $createHandwritingNode } from "./nodes/HandwritingNode";
import { SpreadsheetNode, $createSpreadsheetNode } from "./nodes/SpreadsheetNode";
import { ImageNode, $createImageNode, $isImageNode } from "./nodes/ImageNode";
import { CollapsibleNode, $createCollapsibleNode, $isCollapsibleNode } from "./nodes/CollapsibleNode";

import { ToolbarPlugin } from "./plugins/ToolbarPlugin";
import { ListMaxIndentLevelPlugin } from "./plugins/ListMaxIndentLevelPlugin";
import { TableResizerPlugin } from "./plugins/TableResizerPlugin";

const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  (text: string) => {
    const match = URL_REGEX.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith("http") ? fullMatch : `https://${fullMatch}`,
    };
  },
  (text: string) => {
    const match = EMAIL_REGEX.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: `mailto:${fullMatch}`,
    };
  },
];

const EditorContainer = styled.div`
  position: relative;
  text-align: left;
  border-radius: 8px;
  background: #1e1e1e; /* Deep dark background */
  color: #d4d4d4; /* Soft muted text */
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  container-type: inline-size;
`;

const Content = styled(ContentEditable) <{ $tabSize?: number; $fontSize?: number }>`
  min-height: 300px;
  max-height: 600px;
  outline: none;
  padding: 0.5rem;
  padding-bottom: 5rem; /* Large bottom padding for easy clicking below last node */
  tab-size: ${props => props.$tabSize || 4};
  overflow-y: auto;
  font-size: ${props => props.$fontSize ? `${props.$fontSize}pt` : 'calc(1.85cqi)'};
  line-height: 1.5;

  @container (min-width: 21cm) {
    /* Optional: cap the scaling if desired, or keep it perfectly relative */
  }
  
  /* Theme Styles */
  .editor-placeholder {
    color: #666;
    overflow: hidden;
    position: absolute;
    text-overflow: ellipsis;
    top: 0px;
    left: 0rem;
    font-size: ${props => props.$fontSize ? `${props.$fontSize}pt` : 'calc(1.85cqi)'};
    user-select: none;
    display: inline-block;
    pointer-events: none;
    padding: 0.5rem;
  }

  .editor-paragraph {
    margin: 0;
    margin-bottom: 0px;
    position: relative;
    color: #d4d4d4;
  }
  
  .editor-heading-h1 { font-size: 1.8em; font-weight: 700; margin: 0.5em 0; color: #fff; }
  .editor-heading-h2 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; color: #eee; }
  .editor-heading-h3 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0; color: #ddd; }
  
  .editor-quote {
    margin: 1em 0;
    margin-left: 0;
    font-size: 15px;
    color: #aaa;
    border-left: 4px solid #444;
    padding-left: 16px;
    font-style: italic;
  }
  
  .editor-list-ol { padding: 0; margin: 0 0 8px 32px; list-style-type: decimal; }
  .editor-list-ul { padding: 0; margin: 0 0 8px 32px; list-style-type: disc; }
  .editor-listitem { margin: 4px 0; }
  
  .editor-nested-listitem {
    list-style-type: none;
  }

  .editor-text-bold { font-weight: bold; }
  .editor-text-italic { font-style: italic; }
  .editor-text-underline { text-decoration: underline; }
  .editor-text-strikethrough { text-decoration: line-through; }
  .editor-text-underlineStrikethrough { text-decoration: underline line-through; }
  
  .editor-text-code {
    background-color: #2d2d2d;
    color: #ce9178; /* Muted orange for code */
    padding: 2px 4px;
    border-radius: 4px;
    font-family: 'Fira Code', Menlo, Consolas, Monaco, monospace;
    font-size: 90%;
  }
  
  .editor-code {
    background-color: #252526;
    color: #d4d4d4;
    font-family: 'Fira Code', Menlo, Consolas, Monaco, monospace;
    display: block;
    padding: 16px;
    line-height: 1.5;
    font-size: 13px;
    margin: 8px 0;
    border-radius: 8px;
    overflow-x: auto;
    position: relative;
    border: 1px solid #333;
  }

  .editor-link {
    color: ${(props: any) => props.theme.colors?.primary || "#007bff"};
    text-decoration: underline;
    cursor: pointer;
  }

  /* Table Styles */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    border: 1px solid #333;
    /* Remove table-layout: fixed to allow resizer to control widths */
  }
  th, td {
    border: 1px solid #333;
    padding: 8px;
    text-align: left;
    color: #d4d4d4;
    word-break: break-word; /* Enable wrapping within cells */
    overflow-wrap: break-word;
    min-width: 40px;
  }
  th {
    background-color: #2d2d2d;
    font-weight: 600;
  }
  td {
    background-color: #1e1e1e;
  }

  /* Checklist Styles */
  .editor-list-checklist {
    padding: 0;
    margin: 0 0 8px 32px;
    list-style-type: none;
  }

  .editor-listitem-checked,
  .editor-listitem-unchecked {
    position: relative;
    padding-left: 28px;
    cursor: pointer;
    list-style-type: none;
    outline: none;
    display: block;
  }

  .editor-listitem-checked:before,
  .editor-listitem-unchecked:before {
    content: '';
    width: 16px;
    height: 16px;
    top: 4px;
    left: 4px;
    position: absolute;
    display: block;
    border: 1px solid #555;
    border-radius: 2px;
    background: #2d2d2d;
    transition: all 0.2s ease;
  }

  .editor-listitem-checked:before {
    background-color: ${(props: any) => props.theme.colors?.primary || "#007bff"};
    border-color: ${(props: any) => props.theme.colors?.primary || "#007bff"};
  }

  .editor-listitem-checked:after {
    content: '';
    cursor: pointer;
    border-color: #fff;
    border-style: solid;
    border-width: 0 2px 2px 0;
    top: 6px;
    left: 10px;
    width: 4px;
    height: 8px;
    transform: rotate(45deg);
    position: absolute;
    display: block;
  }

  .editor-listitem-checked {
    color: #999;
  }

  /* Collapsible Styles */
  .editor-collapsible {
    border-radius: 6px;
    padding: 0 12px;
    margin: 8px 0;
    transition: all 0.2s ease;
    background: ${(props: any) => props.theme.colors?.surface || '#252526'};
    border: 1px solid ${(props: any) => props.theme.colors?.border || '#333'};
    word-break: break-word;
    overflow-wrap: break-word;

    summary {
      padding: 8px 0;
      cursor: pointer;
      font-weight: 600;
      color: #9cdcfe; /* Soft blue for titles in dark mode */
      outline: none;
      user-select: none;
      font-size: 0.9rem;
      
      &::-webkit-details-marker {
        margin-right: 8px;
        color: #555;
      }
    }

    /* Target the content area */
    & > *:not(summary) {
      margin-bottom: 12px;
    }
  }
`;

const IMAGE_TRANSFORMER: Transformer = {
  dependencies: [ImageNode],
  export: (node: LexicalNode) => {
    if ($isImageNode(node)) {
      return `![${node.__altText}](${node.__src})`;
    }
    return null;
  },
  regExp: /!\[([^\]]*)\]\(([^)]*)\)/,
  replace: (textNode: any, match: any) => {
    const [, altText, src] = match;
    const imageNode = $createImageNode({ src, altText });
    textNode.replace(imageNode);
  },
  type: "text-match",
};

const COLLAPSIBLE_TRANSFORMER: Transformer = {
  dependencies: [CollapsibleNode],
  export: (node: LexicalNode) => {
    if ($isCollapsibleNode(node)) {
      const children = (node as CollapsibleNode).getChildren();
      const content = children.map((n: any) => n.getTextContent()).join('\n');
      return `:::collapse ${(node as CollapsibleNode).getTitle()}\n${content}\n:::`;
    }
    return null;
  },
  // regExp is kept for live-typing shortcuts via MarkdownShortcutPlugin
  regExp: /^:::collapse\s*(.*)$/,
  replace: (textNode: any, match: any) => {
    const title = match[1]?.trim() || "Details";
    const node = $createCollapsibleNode(true, title);
    textNode.replace(node);
  },
  type: "element",
};

const STYLE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [],
  export: (node) => {
    if ($isTextNode(node)) {
      const style = node.getStyle();
      if (style) {
        const textContent = node.getTextContent();
        return `<span style="${style}">${textContent}</span>`;
      }
    }
    return null;
  },
  importRegExp: /<span style="([^"]+)">([^<]+)<\/span>/,
  regExp: /<span style="([^"]+)">([^<]+)<\/span>/,
  replace: (textNode, match) => {
    const style = match[1];
    const content = match[2];
    const node = $createTextNode(content);
    node.setStyle(style);
    textNode.replace(node);
  },
  trigger: "<",
  type: "text-match",
};

const ALL_TRANSFORMERS: Transformer[] = [
  CHECK_LIST,
  IMAGE_TRANSFORMER,
  COLLAPSIBLE_TRANSFORMER,
  STYLE_TRANSFORMER,
  ...TRANSFORMERS,
];
const EXPORT_TRANSFORMERS: Transformer[] = [
  CHECK_LIST,
  IMAGE_TRANSFORMER,
  COLLAPSIBLE_TRANSFORMER,
  STYLE_TRANSFORMER,
  ...TRANSFORMERS,
];

function MarkdownSyncPlugin({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      editor.update(() => {
        // Pre-process: Convert :::collapse fenced blocks into temporary code blocks.
        // Lexical's ElementTransformer is line-based and cannot handle multi-line
        // fenced blocks. Code blocks ARE natively multi-line, so we piggyback on them.
        const collapsibleBlocks: Array<{ title: string, content: string }> = [];
        const preprocessed = value.replace(
          /^:::collapse\s*(.*?)\n([\s\S]*?)\n:::$/gm,
          (_, title, content) => {
            const idx = collapsibleBlocks.length;
            collapsibleBlocks.push({ title: title.trim() || 'Details', content });
            return '```__collapse_' + idx + '\n' + content + '\n```';
          }
        );

        $convertFromMarkdownString(preprocessed, ALL_TRANSFORMERS);

        // Post-process: Convert temporary code blocks and other special nodes
        const codeNodes = $nodesOfType(CodeNode);
        codeNodes.forEach((node: CodeNode) => {
          const lang = node.getLanguage();
          if (lang?.startsWith('__collapse_')) {
            const idx = parseInt(lang.substring('__collapse_'.length));
            const block = collapsibleBlocks[idx];
            if (block) {
              const collapsibleNode = $createCollapsibleNode(true, block.title);
              const textContent = node.getTextContent();
              const lines = textContent.split('\n');
              for (const line of lines) {
                const paragraph = $createParagraphNode();
                if (line) {
                  paragraph.append($createTextNode(line));
                }
                collapsibleNode.append(paragraph);
              }
              node.replace(collapsibleNode);
            }
          } else if (lang === "fabric") {
            const data = node.getTextContent();
            const hwNode = $createHandwritingNode(data);
            node.replace(hwNode);
          } else if (lang === "spreadsheet") {
            const data = node.getTextContent();
            const shNode = $createSpreadsheetNode(data);
            node.replace(shNode);
          }
        });
      });
    }
  }, [editor, value]);

  return (
    <OnChangePlugin
      onChange={(editorState: EditorState) => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(EXPORT_TRANSFORMERS);
          onChange(markdown);
        });
      }}
    />
  );
}

export interface LexicalEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string; // For styled-components extension
  placeholder?: string;
  initialScrollPercentage?: number;
  onToggleSidebar?: () => void;
  spellCheck?: boolean;
  markdownShortcuts?: boolean;
  autoLink?: boolean;
  tabIndentation?: boolean;
  tabSize?: number;
  fontSize?: number;
  onSave?: () => void;
  onExit?: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  exitLabel?: string;
  deleteLabel?: string;
  saveDisabled?: boolean;
}

export const LexicalEditor: React.FC<LexicalEditorProps> = ({
  value,
  onChange,
  className,
  placeholder,
  onToggleSidebar,
  spellCheck = true,
  markdownShortcuts = true,
  autoLink = true,
  tabIndentation = true,
  tabSize = 4,
  fontSize = 11,
  onSave,
  onExit,
  onDelete,
  saveLabel,
  exitLabel,
  deleteLabel,
  saveDisabled
}) => {
  const initialConfig = {
    namespace: "MemoSuiteEditor",
    theme: MemoSuiteTheme,
    onError(error: Error) {
      console.error(error);
    },
    nodes: [
      ParagraphNode,
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      HorizontalRuleNode,
      HandwritingNode,
      SpreadsheetNode,
      ImageNode,
      CollapsibleNode
    ]
  };

  return (
    <EditorContainer className={className}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin
          onToggleSidebar={onToggleSidebar}
          defaultFontSize={fontSize}
          onSave={onSave}
          onExit={onExit}
          onDelete={onDelete}
          saveLabel={saveLabel}
          exitLabel={exitLabel}
          deleteLabel={deleteLabel}
          saveDisabled={saveDisabled}
        />
        <div className="editor-inner" style={{ position: 'relative' }}>
          <RichTextPlugin
            contentEditable={<Content spellCheck={spellCheck} $tabSize={tabSize} $fontSize={fontSize} />}
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          {markdownShortcuts && <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />}
          <ListPlugin />
          <LinkPlugin />
          {autoLink && <AutoLinkPlugin matchers={MATCHERS} />}
          <CheckListPlugin />
          <TablePlugin />
          <TableResizerPlugin />
          {tabIndentation && <TabIndentationPlugin />}
          <HorizontalRulePlugin />
          <ClearEditorPlugin />
          <ListMaxIndentLevelPlugin maxDepth={7} />
          <AutoFocusPlugin />
          <MarkdownSyncPlugin value={value} onChange={onChange} />
        </div>
      </LexicalComposer>
    </EditorContainer>
  );
};
