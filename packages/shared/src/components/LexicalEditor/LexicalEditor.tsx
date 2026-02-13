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
import type { Transformer } from "@lexical/markdown";
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
import { $nodesOfType } from "lexical";
import type { LexicalNode } from "lexical";

import { HandwritingNode, $createHandwritingNode, $isHandwritingNode } from "./nodes/HandwritingNode";
import { SpreadsheetNode, $createSpreadsheetNode, $isSpreadsheetNode } from "./nodes/SpreadsheetNode";

import { ToolbarPlugin } from "./plugins/ToolbarPlugin";
import { ListMaxIndentLevelPlugin } from "./plugins/ListMaxIndentLevelPlugin";

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
  line-height: 1.6;
  font-weight: 400;
  text-align: left;
  border-radius: 8px;
  background: ${(props: any) => props.theme.colors?.surface || "#fff"};
  color: ${(props: any) => props.theme.colors?.text || "#333"};
  border: 1px solid ${(props: any) => props.theme.colors?.border || "#eee"};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Content = styled(ContentEditable)`
  min-height: 150px;
  max-height: 600px;
  outline: none;
  padding: 1rem;
  tab-size: 2;
  overflow-y: auto;
  
  /* Theme Styles */
  .editor-placeholder {
    color: #999;
    overflow: hidden;
    position: absolute;
    text-overflow: ellipsis;
    top: 50px;
    left: 1rem;
    font-size: 15px;
    user-select: none;
    display: inline-block;
    pointer-events: none;
    padding: 1rem;
  }

  .editor-paragraph {
    margin: 0;
    margin-bottom: 8px;
    position: relative;
  }
  
  .editor-heading-h1 { font-size: 1.8em; font-weight: 700; margin: 0.5em 0; }
  .editor-heading-h2 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; }
  .editor-heading-h3 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0; }
  
  .editor-quote {
    margin: 1em 0;
    margin-left: 0;
    font-size: 15px;
    color: #666;
    border-left: 4px solid #ddd;
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
    background-color: #f0f2f5;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: 'Fira Code', Menlo, Consolas, Monaco, monospace;
    font-size: 90%;
  }
  
  .editor-code {
    background-color: #f8f9fa;
    font-family: 'Fira Code', Menlo, Consolas, Monaco, monospace;
    display: block;
    padding: 16px;
    line-height: 1.5;
    font-size: 13px;
    margin: 8px 0;
    border-radius: 8px;
    overflow-x: auto;
    position: relative;
    border: 1px solid #eee;
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
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f2f2f2;
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
    border: 1px solid #999;
    border-radius: 2px;
    background: #fff;
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
`;

const ALL_TRANSFORMERS = [CHECK_LIST, ...TRANSFORMERS];

const EXPORT_TRANSFORMERS: Transformer[] = [
  {
    dependencies: [HandwritingNode],
    export: (node: LexicalNode) => {
      if ($isHandwritingNode(node)) {
        return "```fabric\n" + node.getData() + "\n```";
      }
      return null;
    },
    regExp: /dummy/,
    replace: () => { },
    type: "element",
  },
  {
    dependencies: [SpreadsheetNode],
    export: (node: LexicalNode) => {
      if ($isSpreadsheetNode(node)) {
        return "```spreadsheet\n" + node.getData() + "\n```";
      }
      return null;
    },
    regExp: /dummy/,
    replace: () => { },
    type: "element",
  },
  ...ALL_TRANSFORMERS,
];

function MarkdownSyncPlugin({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      editor.update(() => {
        $convertFromMarkdownString(value, ALL_TRANSFORMERS);

        const codeNodes = $nodesOfType(CodeNode);
        codeNodes.forEach(node => {
          const lang = node.getLanguage();
          if (lang === "fabric") {
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
      onChange={(editorState) => {
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
}

export const LexicalEditor: React.FC<LexicalEditorProps> = ({ value, onChange, className, placeholder }) => {
  const initialConfig = {
    namespace: "MemoSuiteEditor",
    theme: MemoSuiteTheme,
    onError(error: Error) {
      console.error(error);
    },
    nodes: [
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
      SpreadsheetNode
    ]
  };

  return (
    <EditorContainer className={className}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="editor-inner" style={{ position: 'relative' }}>
          <RichTextPlugin
            contentEditable={<Content />}
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />
          <ListPlugin />
          <LinkPlugin />
          <AutoLinkPlugin matchers={MATCHERS} />
          <CheckListPlugin />
          <TablePlugin />
          <TabIndentationPlugin />
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
