import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import {
  TRANSFORMERS,
  CHECK_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH
} from "@lexical/markdown";
import type { Transformer, TextMatchTransformer } from "@lexical/markdown";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { MemoSuiteTheme } from "./themes/MemoSuiteTheme";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import React, { useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import {
  $nodesOfType,
  ParagraphNode,
  $isTextNode,
  $createTextNode,
  $createParagraphNode,
  $setSelection,
  $isElementNode,
  ElementNode,
  $isParagraphNode,
  $getRoot,
  TextNode,
} from "lexical";
import type { LexicalNode, ElementFormatType } from "lexical";
import { HeadingNode, QuoteNode, $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";

import { HandwritingNode, $createHandwritingNode, $isHandwritingNode } from "./nodes/HandwritingNode";
import { SpreadsheetNode, $createSpreadsheetNode, $isSpreadsheetNode } from "./nodes/SpreadsheetNode";
import { ImageNode, $createImageNode, $isImageNode } from "./nodes/ImageNode";
import { CollapsibleNode, $createCollapsibleNode, $isCollapsibleNode } from "./nodes/CollapsibleNode";

import { ToolbarPlugin, ToolbarButton } from "./plugins/ToolbarPlugin";
export { ToolbarButton };
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
  background: ${(props: any) => props.theme.colors?.background || '#1e1e1e'};
  color: ${(props: any) => props.theme.colors?.text || '#d4d4d4'};
  border: 1px solid ${(props: any) => props.theme.colors?.border || '#333'};
  display: block;
  overflow: visible;
  container-type: inline-size;
`;

const Content = styled(ContentEditable) <{ $tabSize?: number; $fontSize?: number }>`
  min-height: 300px;
  outline: none;
  padding: 0.5rem;
  padding-bottom: 5rem; /* Large bottom padding for easy clicking below last node */
  tab-size: ${props => props.$tabSize || 4};
  font-size: ${props => props.$fontSize ? `${props.$fontSize}px` : 'calc(1.85cqi)'};
  line-height: 1.5;

  @container (min-width: 21cm) {
    /* Optional: cap the scaling if desired, or keep it perfectly relative */
  }
  
  /* Theme Styles */
  .editor-placeholder {
    color: ${(props: any) => props.theme.colors?.textSecondary || '#666'};
    overflow: hidden;
    position: absolute;
    text-overflow: ellipsis;
    top: 0px;
    left: 0rem;
    font-size: ${props => props.$fontSize ? `${props.$fontSize}px` : 'calc(1.85cqi)'};
    user-select: none;
    display: inline-block;
    pointer-events: none;
    padding: 0.5rem;
  }

  .editor-paragraph {
    margin: 0;
    margin-bottom: 0px;
    position: relative;
    color: ${(props: any) => props.theme.colors?.text || '#d4d4d4'};
  }
  
  .editor-heading-h1 { font-size: 1.8em; font-weight: 700; margin: 0.5em 0; color: ${(props: any) => props.theme.colors?.text || '#fff'}; }
  .editor-heading-h2 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; color: ${(props: any) => props.theme.colors?.text || '#eee'}; }
  .editor-heading-h3 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0; color: ${(props: any) => props.theme.colors?.text || '#ddd'}; }
  
  .editor-quote {
    margin: 1em 0;
    margin-left: 0;
    padding-left: 1em;
    border-left: 4px solid ${(props: any) => props.theme.colors?.border || '#444'};
    color: ${(props: any) => props.theme.colors?.textSecondary || '#aaa'};
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
    background-color: ${(props: any) => props.theme.colors?.surface || '#2d2d2d'};
    color: ${(props: any) => props.theme.colors?.text || 'inherit'};
    padding: 0.2em 0.4em;
    border-radius: 3px;
    border: 1px solid ${(props: any) => props.theme.colors?.border || '#333'};
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  .editor-code {
    background-color: ${(props: any) => props.theme.colors?.surface || '#252526'};
    color: ${(props: any) => props.theme.colors?.text || '#d4d4d4'};
    font-family: 'Fira Code', Menlo, Consolas, Monaco, monospace;
    display: block;
    padding: 16px;
    line-height: 1.5;
    font-size: 13px;
    margin: 8px 0;
    border-radius: 8px;
    overflow-x: auto;
    position: relative;
    border: 1px solid ${(props: any) => props.theme.colors?.border || '#333'};
  }

  .editor-link {
    color: ${(props: any) => props.theme.colors?.primary || "#007bff"};
    text-decoration: underline;
    cursor: pointer;
  }

  .editor-hr {
    padding: 2px 2px;
    border: none;
    margin: 1em 0;
    cursor: default;
    &:after {
      content: '';
      display: block;
      height: 2px;
      background-color: ${(props: any) => props.theme.colors?.border || '#333'};
      line-height: 2px;
    }
  }

  /* Table Styles */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    border: 1px solid ${(props: any) => props.theme.colors?.border || '#333'};
    /* Remove table-layout: fixed to allow resizer to control widths */
  }
  th, td {
    border: 1px solid ${(props: any) => props.theme.colors?.border || '#333'};
    padding: 8px;
    text-align: left;
    color: ${(props: any) => props.theme.colors?.text || '#d4d4d4'};
    word-break: break-word; /* Enable wrapping within cells */
    overflow-wrap: break-word;
    min-width: 40px;
  }
  th {
    background-color: ${(props: any) => props.theme.colors?.surface || '#2d2d2d'};
    font-weight: 600;
  }
  td {
    background-color: ${(props: any) => props.theme.colors?.background || '#1e1e1e'};
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
    top: 1px;
    left: 4px;
    position: absolute;
    display: block;
    border: 2px solid ${(props: any) => props.theme.colors?.primary || '#007bff'};
    border-radius: 4px;
    background: ${(props: any) => props.theme.colors?.surface || '#2d2d2d'};
    transition: all 0.2s ease;
  }

  .editor-listitem-checked:before {
    background-color: ${(props: any) => props.theme.colors?.primary || "#007bff"};
  }

  .editor-listitem-checked:after {
    content: '';
    cursor: pointer;
    border-color: #fff;
    border-style: solid;
    border-width: 0 2.5px 2.5px 0;
    top: 3px;
    left: 10px;
    width: 4px;
    height: 8px;
    transform: rotate(45deg);
    position: absolute;
    display: block;
  }

  .editor-listitem-checked {
    color: ${(props: any) => props.theme.colors?.textSecondary || '#999'};
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
      color: ${(props: any) => props.theme.colors?.primary || '#9cdcfe'};
      outline: none;
      user-select: none;
      font-size: 0.9rem;
      
      &::-webkit-details-marker {
        margin-right: 8px;
        color: ${(props: any) => props.theme.colors?.textSecondary || '#555'};
      }
    }

    /* Target the content area */
    & > *:not(summary) {
      margin-bottom: 0px;
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

const HTML_COMBINED_TRANSFORMER: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if (!$isTextNode(node)) return null;
    const style = node.getStyle();
    const hasUnderline = node.hasFormat("underline");
    if (!style && !hasUnderline) return null;

    let result = exportFormat ? exportFormat(node, node.getTextContent()) : node.getTextContent();
    if (style) result = `<span style="${style}">${result}</span>`;
    if (hasUnderline) result = `<u>${result}</u>`;
    return result;
  },
  importRegExp: /<(u|span)(?:\s+style="([^"]+)")?>([\s\S]+?)<\/\1>/,
  regExp: /<(u|span)(?:\s+style="([^"]+)")?>([\s\S]+?)<\/\1>/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const [, tag, style, content] = match;
    let currentContent = content;
    let combinedStyle = style || "";
    let isUnderline = tag === 'u';

    const innerRegex = /<(u|span)(?:\s+style="([^"]+)")?>([\s\S]+?)<\/\1>/;
    let innerMatch;
    while ((innerMatch = currentContent.match(innerRegex))) {
      const [, nTag, nStyle, nContent] = innerMatch;
      if (nTag === 'u') isUnderline = true;
      if (nStyle) combinedStyle = combinedStyle ? `${combinedStyle};${nStyle}` : nStyle;
      currentContent = nContent;
    }

    const cleanContent = currentContent.replace(/<\/?(u|span)(?:\s+style="[^"]+")?>/g, '');

    const newNode = $createTextNode(cleanContent);
    newNode.setFormat(textNode.getFormat());
    if (isUnderline) newNode.toggleFormat("underline");

    const existingStyle = textNode.getStyle();
    if (existingStyle && combinedStyle) {
      newNode.setStyle(`${existingStyle};${combinedStyle}`);
    } else {
      newNode.setStyle(combinedStyle || existingStyle);
    }

    textNode.replace(newNode);
  },
  trigger: "<",
  type: "text-match",
};

const SPREADSHEET_TRANSFORMER: Transformer = {
  dependencies: [SpreadsheetNode],
  export: (node: LexicalNode) => {
    if ($isSpreadsheetNode(node)) {
      return "```spreadsheet\n" + node.getData() + "\n```";
    }
    return null;
  },
  regExp: /^```spreadsheet$/,
  replace: () => { },
  type: "element",
};

const HANDWRITING_TRANSFORMER: Transformer = {
  dependencies: [HandwritingNode],
  export: (node: LexicalNode) => {
    if ($isHandwritingNode(node)) {
      return "```fabric\n" + (node as HandwritingNode).getData() + "\n```";
    }
    return null;
  },
  regExp: /^```fabric$/,
  replace: () => { },
  type: "element",
};

const HR_TRANSFORMER: Transformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '---' : null;
  },
  regExp: /^(---|\*\*\*|___)\s*$/,
  replace: (parentNode, _1, _2, isFirstLine) => {
    const line = $createHorizontalRuleNode();

    if (isFirstLine) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  type: "element",
};

const BOLD_ITALIC_STAR_REGEX = /(^|[^\*])\*\*\*([^\* \n][^\*\n]*[^\* \n]|\S)\*\*\*$/;
const BOLD_STAR_REGEX = /(^|[^\*])\*\*([^\* \n][^\*\n]*[^\* \n]|\S)\*\*$/;
const ITALIC_STAR_REGEX = /(^|[^\*])\*([^\* \n][^\*\n]*[^\* \n]|\S)\*$/;

const BOLD_ITALIC_UNDERSCORE_REGEX = /(^|[^_])___([^_ \n][^_\n]*[^_ \n]|[^_ \s])___$/;
const BOLD_UNDERSCORE_REGEX = /(^|[^_])__([^_ \n][^_\n]*[^_ \n]|[^_ \s])__$/;
const ITALIC_UNDERSCORE_REGEX = /(^|[^_])_([^_ \n][^_\n]*[^_ \n]|[^_ \s])_$/;

const STRIKETHROUGH_REGEX = /(^|[^~])~~([^~ \n][^~\n]*[^~ \n]|[^~ \s])~~$/;

function MarkdownImmediatePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      if (!node.isSimpleText() || !node.isAttached()) return;

      const text = node.getTextContent();
      const matchers = [
        { regex: BOLD_ITALIC_STAR_REGEX, format: 'bold-italic' },
        { regex: BOLD_ITALIC_UNDERSCORE_REGEX, format: 'bold-italic' },
        { regex: BOLD_STAR_REGEX, format: 'bold' },
        { regex: BOLD_UNDERSCORE_REGEX, format: 'bold' },
        { regex: ITALIC_STAR_REGEX, format: 'italic' },
        { regex: ITALIC_UNDERSCORE_REGEX, format: 'italic' },
        { regex: STRIKETHROUGH_REGEX, format: 'strikethrough' },
      ];

      for (const { regex, format } of matchers) {
        const match = text.match(regex);
        if (match) {
          const fullMatch = match[0];
          const prefix = match[1];
          const content = match[2];

          const matchStart = match.index! + prefix.length;
          const matchLength = fullMatch.length - prefix.length;

          let targetNode = node;
          if (matchStart > 0) {
            const splitNodes = node.splitText(matchStart);
            targetNode = splitNodes[1];
          }

          if (matchLength < targetNode.getTextContentSize()) {
            targetNode.splitText(matchLength);
          }

          const newNode = $createTextNode(content);
          newNode.setFormat(targetNode.getFormat());
          newNode.setStyle(targetNode.getStyle());

          if (format === 'bold-italic') {
            newNode.toggleFormat('bold');
            newNode.toggleFormat('italic');
          } else {
            newNode.toggleFormat(format as any);
          }

          targetNode.replace(newNode);
          newNode.select(content.length, content.length);
          break;
        }
      }
    });
  }, [editor]);

  return null;
}

const ELEMENT_FORMAT_EXPORT_TRANSFORMER: Transformer = {
  dependencies: [ParagraphNode, HeadingNode, QuoteNode],
  export: (node: LexicalNode, traverseChildren: (node: ElementNode) => string) => {
    if ($isElementNode(node)) {
      const format = node.getFormatType();
      if (format && format !== "left" && (format as string) !== "") {
        const tag = $isParagraphNode(node)
          ? "p"
          : $isHeadingNode(node)
            ? (node as HeadingNode).getTag()
            : $isQuoteNode(node)
              ? "blockquote"
              : null;
        if (tag) {
          return `<${tag} align="${format}">${traverseChildren(
            node
          )}</${tag}>`;
        }
      }
    }
    return null;
  },
  regExp: /^<(p|h[1-6]|blockquote) align="(\w+)">(.*)<\/\1>$/,
  replace: (parentNode: ElementNode, children: LexicalNode[], match: string[]) => {
    const align = match[2];
    parentNode.setFormat(align as ElementFormatType);
    return false;
  },
  type: "element",
};



const SAFE_BOLD_ITALIC_STAR: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if ($isTextNode(node) && node.hasFormat("bold") && node.hasFormat("italic")) {
      const textContent = node.getTextContent();
      return `***${exportFormat ? exportFormat(node, textContent) : textContent}***`;
    }
    return null;
  },
  importRegExp: /\*\*\*([^\*]+?)\*\*\*/,
  regExp: /\*\*\*([^\*]+?)\*\*\*/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const content = match[1];
    const newNode = $createTextNode(content);
    newNode.setFormat(textNode.getFormat());
    newNode.setStyle(textNode.getStyle());
    newNode.toggleFormat("bold");
    newNode.toggleFormat("italic");
    textNode.replace(newNode);
  },
  trigger: "*",
  type: "text-match",
};

const SAFE_BOLD_STAR: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if ($isTextNode(node) && node.hasFormat("bold")) {
      const textContent = node.getTextContent();
      return `**${exportFormat ? exportFormat(node, textContent) : textContent}**`;
    }
    return null;
  },
  importRegExp: /\*\*([^\*]+?)\*\*/,
  regExp: /\*\*([^\*]+?)\*\*/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const content = match[1];
    const newNode = $createTextNode(content);
    newNode.setFormat(textNode.getFormat());
    newNode.setStyle(textNode.getStyle());
    newNode.toggleFormat("bold");
    textNode.replace(newNode);
  },
  trigger: "*",
  type: "text-match",
};

const SAFE_ITALIC_STAR: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if ($isTextNode(node) && node.hasFormat("italic")) {
      const textContent = node.getTextContent();
      return `*${exportFormat ? exportFormat(node, textContent) : textContent}*`;
    }
    return null;
  },
  importRegExp: /\*([^\*]+?)\*/,
  regExp: /\*([^\*]+?)\*/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const content = match[1];
    const newNode = $createTextNode(content);
    newNode.setFormat(textNode.getFormat());
    newNode.setStyle(textNode.getStyle());
    newNode.toggleFormat("italic");
    textNode.replace(newNode);
  },
  trigger: "*",
  type: "text-match",
};

const SAFE_BOLD_ITALIC_UNDERSCORE: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if ($isTextNode(node) && node.hasFormat("bold") && node.hasFormat("italic")) {
      const textContent = node.getTextContent();
      return `___${exportFormat ? exportFormat(node, textContent) : textContent}___`;
    }
    return null;
  },
  importRegExp: /___([^_]+?)___/,
  regExp: /___([^_]+?)___/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const content = match[1];
    const newNode = $createTextNode(content);
    newNode.setFormat(textNode.getFormat());
    newNode.setStyle(textNode.getStyle());
    newNode.toggleFormat("bold");
    newNode.toggleFormat("italic");
    textNode.replace(newNode);
  },
  trigger: "_",
  type: "text-match",
};

const SAFE_BOLD_UNDERSCORE: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if ($isTextNode(node) && node.hasFormat("bold")) {
      const textContent = node.getTextContent();
      return `__${exportFormat ? exportFormat(node, textContent) : textContent}__`;
    }
    return null;
  },
  importRegExp: /__([^_]+?)__/,
  regExp: /__([^_]+?)__/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const content = match[1];
    const newNode = $createTextNode(content);
    newNode.setFormat(textNode.getFormat());
    newNode.setStyle(textNode.getStyle());
    newNode.toggleFormat("bold");
    textNode.replace(newNode);
  },
  trigger: "_",
  type: "text-match",
};

const SAFE_ITALIC_UNDERSCORE: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if ($isTextNode(node) && node.hasFormat("italic")) {
      const textContent = node.getTextContent();
      return `_${exportFormat ? exportFormat(node, textContent) : textContent}_`;
    }
    return null;
  },
  importRegExp: /_([^_]+?)_/,
  regExp: /_([^_]+?)_/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const content = match[1];
    const newNode = $createTextNode(content);
    newNode.setFormat(textNode.getFormat());
    newNode.setStyle(textNode.getStyle());
    newNode.toggleFormat("italic");
    textNode.replace(newNode);
  },
  trigger: "_",
  type: "text-match",
};

const SAFE_STRIKETHROUGH: TextMatchTransformer = {
  dependencies: [],
  export: (node: LexicalNode, _traverseChildren: any, exportFormat: any) => {
    if ($isTextNode(node) && node.hasFormat("strikethrough")) {
      const textContent = node.getTextContent();
      return `~~${exportFormat ? exportFormat(node, textContent) : textContent}~~`;
    }
    return null;
  },
  importRegExp: /~~([^~]+?)~~/,
  regExp: /~~([^~]+?)~~/,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const content = match[1];
    const newNode = $createTextNode(content);
    newNode.setFormat(textNode.getFormat());
    newNode.setStyle(textNode.getStyle());
    newNode.toggleFormat("strikethrough");
    textNode.replace(newNode);
  },
  trigger: "~",
  type: "text-match",
};

const ALL_TRANSFORMERS: Transformer[] = [
  SAFE_BOLD_ITALIC_STAR,
  SAFE_BOLD_ITALIC_UNDERSCORE,
  SAFE_BOLD_STAR,
  SAFE_BOLD_UNDERSCORE,
  SAFE_ITALIC_STAR,
  SAFE_ITALIC_UNDERSCORE,
  SAFE_STRIKETHROUGH,
  HTML_COMBINED_TRANSFORMER,
  CHECK_LIST,
  IMAGE_TRANSFORMER,
  COLLAPSIBLE_TRANSFORMER,
  HR_TRANSFORMER,
  ...TRANSFORMERS.filter(t =>
    t !== BOLD_ITALIC_STAR &&
    t !== BOLD_ITALIC_UNDERSCORE &&
    t !== BOLD_STAR &&
    t !== BOLD_UNDERSCORE &&
    t !== ITALIC_STAR &&
    t !== ITALIC_UNDERSCORE &&
    t !== STRIKETHROUGH &&
    (t as any).regExp?.toString() !== /^(---|\*\*\*|___)\s*$/.toString()
  ),
];

const EXPORT_TRANSFORMERS: Transformer[] = [
  ELEMENT_FORMAT_EXPORT_TRANSFORMER,
  SAFE_BOLD_ITALIC_STAR,
  SAFE_BOLD_ITALIC_UNDERSCORE,
  SAFE_BOLD_STAR,
  SAFE_BOLD_UNDERSCORE,
  SAFE_ITALIC_STAR,
  SAFE_ITALIC_UNDERSCORE,
  SAFE_STRIKETHROUGH,
  HTML_COMBINED_TRANSFORMER,
  CHECK_LIST,
  IMAGE_TRANSFORMER,
  COLLAPSIBLE_TRANSFORMER,
  SPREADSHEET_TRANSFORMER,
  HANDWRITING_TRANSFORMER,
  HR_TRANSFORMER,
  ...TRANSFORMERS.filter(t =>
    t !== BOLD_ITALIC_STAR &&
    t !== BOLD_ITALIC_UNDERSCORE &&
    t !== BOLD_STAR &&
    t !== BOLD_UNDERSCORE &&
    t !== ITALIC_STAR &&
    t !== ITALIC_UNDERSCORE &&
    t !== STRIKETHROUGH &&
    (t as any).regExp?.toString() !== /^(---|\*\*\*|___)\s*$/.toString()
  )
];

function MarkdownSyncPlugin({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const lastNormalizedValueRef = useRef<string>(value);

  // Helper to apply markdown to editor with post-processing
  const applyMarkdown = (markdown: string) => {
    editor.update(() => {
      // CRITICAL: Clear selection to avoid "selection lost" errors during bulk replacement
      $setSelection(null);

      // 0. Pre-process empty lines: In standard markdown, \n\n is a paragraph separator.
      //    Only blank lines BEYOND the first one in a group represent actual empty paragraphs.
      //    We insert zero-width-space markers for these extra blank lines so
      //    $convertFromMarkdownString creates actual empty paragraph nodes for them.
      const EMPTY_LINE_MARKER = '\u200B';
      let processed = markdown;
      const lines = processed.split('\n');
      const markedLines: string[] = [];
      let i = 0;
      while (i < lines.length) {
        if (lines[i].trim() === '' && i > 0 && i < lines.length - 1) {
          // Keep the first blank line as-is (paragraph separator)
          markedLines.push(lines[i]);
          i++;
          // Any additional consecutive blank lines are actual empty paragraphs
          while (i < lines.length && lines[i].trim() === '') {
            markedLines.push(EMPTY_LINE_MARKER);
            i++;
          }
        } else {
          markedLines.push(lines[i]);
          i++;
        }
      }
      processed = markedLines.join('\n');


      // 1. Pre-process collapsible blocks
      const collapsibleBlocks: Array<{ title: string, content: string }> = [];
      const preprocessed = processed.replace(
        /^:::collapse\s*(.*?)\n([\s\S]*?)\n:::$/gm,
        (_, title, content) => {
          const idx = collapsibleBlocks.length;
          collapsibleBlocks.push({ title: title.trim() || 'Details', content });
          return '```__collapse_' + idx + '\n' + content + '\n```';
        }
      );

      // 2. Initial Markdown Import
      $convertFromMarkdownString(preprocessed, ALL_TRANSFORMERS);

      // 3. Post-process: Convert temporary code blocks to custom nodes
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
              if (line) paragraph.append($createTextNode(line));
              collapsibleNode.append(paragraph);
            }
            node.replace(collapsibleNode);
          }
        } else if (lang === "fabric") {
          const data = node.getTextContent();
          node.replace($createHandwritingNode(data));
        } else if (lang === "spreadsheet") {
          const data = node.getTextContent();
          node.replace($createSpreadsheetNode(data));
        }
      });

      // 4. Post-process: Remove zero-width-space markers from empty-line placeholders
      //    These paragraphs should become truly empty paragraphs.
      const allParagraphs = $nodesOfType(ParagraphNode);
      allParagraphs.forEach((node) => {
        const firstChild = node.getFirstChild();
        if ($isTextNode(firstChild) && firstChild.getTextContent() === EMPTY_LINE_MARKER) {
          firstChild.remove();
        }
      });

      // 5. Post-process: Restore alignment from HTML tags gracefully
      const elements = [
        ...$nodesOfType(ParagraphNode),
        ...$nodesOfType(HeadingNode),
        ...$nodesOfType(QuoteNode),
      ];
      elements.forEach((node) => {
        const firstChild = node.getFirstChild();

        if ($isTextNode(firstChild)) {
          const text = firstChild.getTextContent();
          const match = text.match(/^<(p|h[1-6]|blockquote) align="(left|center|right|justify|start|end)">/i);
          if (match) {
            node.setFormat(match[2] as ElementFormatType);
            const remainder = text.substring(match[0].length);
            if (remainder) {
              firstChild.setTextContent(remainder);
            } else {
              firstChild.remove();
            }
          }
        }

        if (node.isAttached()) {
          const lastChild = node.getLastChild();
          if ($isTextNode(lastChild)) {
            const text = lastChild.getTextContent();
            const match = text.match(/<\/(p|h[1-6]|blockquote)>[\s]*$/i);
            if (match) {
              const remainder = text.substring(0, match.index);
              if (remainder) {
                lastChild.setTextContent(remainder);
              } else {
                lastChild.remove();
              }
            }
          }
        }
      });
    }, { tag: 'import' });
  };

  // Initial load
  useEffect(() => {
    applyMarkdown(value);
  }, [editor]); // Only once on mount

  // Sync from outside
  useEffect(() => {
    if (value !== lastNormalizedValueRef.current) {
      lastNormalizedValueRef.current = value;
      applyMarkdown(value);
    }
  }, [editor, value]);

  const firstUpdateRef = useRef(true);

  // Export to outside
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (tags.has('import')) return;

      editorState.read(() => {
        // Build markdown by walking through root children to preserve empty paragraphs.
        // $convertToMarkdownString collapses consecutive empty paragraphs, so we
        // reconstruct the output ourselves, using $convertToMarkdownString only for
        // the actual content conversion, then inserting extra \n for each empty paragraph.
        let markdown = $convertToMarkdownString(EXPORT_TRANSFORMERS);

        // Preserve empty paragraphs: $convertToMarkdownString collapses them.
        // Walk all root children and count the exact positions of empty paragraphs,
        // then reconstruct the markdown with proper empty lines.
        const rootNode = $getRoot();
        const children = rootNode.getChildren();

        // Build a structural map: true = empty paragraph, false = non-empty node
        const nodeMap: boolean[] = [];
        let hasEmptyParagraphs = false;
        for (const child of children) {
          if ($isParagraphNode(child) && child.getTextContentSize() === 0 && child.getChildrenSize() === 0) {
            nodeMap.push(true);
            hasEmptyParagraphs = true;
          } else {
            nodeMap.push(false);
          }
        }

        if (hasEmptyParagraphs) {
          // Split markdown into chunks for each non-empty node.
          // Nodes are separated by \n\n (double newline = paragraph break).
          // Code blocks may contain internal \n\n, so we track them.
          const nonEmptyChunks: string[] = [];
          const stripped = markdown.replace(/^\n+/, '').replace(/\n+$/, '');

          if (stripped === '') {
            // All content is empty
          } else {
            const allLines = stripped.split('\n');
            let currentChunk: string[] = [];
            let inCodeBlock = false;

            for (let li = 0; li < allLines.length; li++) {
              const line = allLines[li];

              if (line.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
              }

              if (line === '' && !inCodeBlock) {
                if (currentChunk.length > 0) {
                  nonEmptyChunks.push(currentChunk.join('\n'));
                  currentChunk = [];
                }
              } else {
                currentChunk.push(line);
              }
            }
            if (currentChunk.length > 0) {
              nonEmptyChunks.push(currentChunk.join('\n'));
            }
          }

          // Reassemble: non-empty chunks need \n\n between them (standard paragraph separator).
          // Empty paragraphs add an extra \n to represent the blank line.
          // Strategy: build the output by walking nodeMap. Between consecutive non-empty
          // nodes, we need \n\n. Each empty paragraph between them adds another \n.
          let chunkIdx = 0;
          let resultStr = '';
          let lastWasNonEmpty = false;

          for (let i = 0; i < nodeMap.length; i++) {
            if (nodeMap[i]) {
              // Empty paragraph
              if (lastWasNonEmpty) {
                // After non-empty content, add \n for this empty line
                // (the \n\n separator will be added when the next non-empty node comes)
                resultStr += '\n';
              } else if (resultStr === '') {
                // Leading empty paragraph
                resultStr += '\n';
              } else {
                // Consecutive empty paragraphs
                resultStr += '\n';
              }
            } else {
              // Non-empty node
              if (chunkIdx < nonEmptyChunks.length) {
                if (resultStr !== '') {
                  // Add paragraph separator before this chunk
                  resultStr += '\n\n';
                }
                resultStr += nonEmptyChunks[chunkIdx];
                chunkIdx++;
                lastWasNonEmpty = true;
              }
            }
          }

          markdown = resultStr;
        }

        // Safety: Prevent accidental wipe on empty initialization before import
        if (markdown === "" && lastNormalizedValueRef.current !== "" && !tags.has('import')) {
          if (lastNormalizedValueRef.current.length > 10) return;
        }

        if (markdown !== lastNormalizedValueRef.current) {
          // If this is the very first update after mount (and not an 'import' tag update),
          // it might be Lexical's internal normalization.
          // We skip it ONLY if the content is truly identical (not using trim).
          if (firstUpdateRef.current) {
            firstUpdateRef.current = false;
            // Use exact comparison - don't use trim() since whitespace/empty lines matter
            if (markdown === value) {
              lastNormalizedValueRef.current = markdown;
              return;
            }
          }

          lastNormalizedValueRef.current = markdown;
          onChange(markdown);
        } else {
          firstUpdateRef.current = false;
        }
      });
    });
  }, [editor, onChange, value]);

  return null;
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
  stickyOffset?: number;
  customButtons?: React.ReactNode;
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
  fontSize = 16,
  onSave,
  onExit,
  onDelete,
  saveLabel,
  exitLabel,
  deleteLabel,
  saveDisabled,
  stickyOffset,
  customButtons
}) => {
  const initialConfig = useMemo(() => ({
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
  }), []);

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
          stickyOffset={stickyOffset}
          customButtons={customButtons}
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
          <MarkdownImmediatePlugin />
          <MarkdownSyncPlugin value={value} onChange={onChange} />
        </div>
      </LexicalComposer>
    </EditorContainer>
  );
};
