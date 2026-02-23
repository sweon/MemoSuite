import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { TRANSFORMERS, CHECK_LIST, BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE, BOLD_STAR, BOLD_UNDERSCORE, ITALIC_STAR, ITALIC_UNDERSCORE, STRIKETHROUGH } from "@lexical/markdown";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { MemoSuiteTheme } from "./themes/MemoSuiteTheme";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import { $nodesOfType, ParagraphNode, $isTextNode, $createTextNode, $createParagraphNode, $setSelection, $isElementNode, $isParagraphNode, TextNode, } from "lexical";
import { HeadingNode, QuoteNode, $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { HandwritingNode, $createHandwritingNode, $isHandwritingNode } from "./nodes/HandwritingNode";
import { SpreadsheetNode, $createSpreadsheetNode, $isSpreadsheetNode } from "./nodes/SpreadsheetNode";
import { ImageNode, $createImageNode, $isImageNode } from "./nodes/ImageNode";
import { CollapsibleNode, $createCollapsibleNode, $isCollapsibleNode } from "./nodes/CollapsibleNode";
import { PageBreakNode, $createPageBreakNode, $isPageBreakNode } from "./nodes/PageBreakNode";
import { ToolbarPlugin, ToolbarButton } from "./plugins/ToolbarPlugin";
export { ToolbarButton };
import { ListMaxIndentLevelPlugin } from "./plugins/ListMaxIndentLevelPlugin";
import { TableResizerPlugin } from "./plugins/TableResizerPlugin";
import { PageBreakPlugin } from "./plugins/PageBreakPlugin";
const URL_REGEX = /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
const EMAIL_REGEX = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
const MATCHERS = [
    (text) => {
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
    (text) => {
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
  background: ${(props) => props.theme.colors?.background || '#1e1e1e'};
  color: ${(props) => props.theme.colors?.text || '#d4d4d4'};
  border: 1px solid ${(props) => props.theme.colors?.border || '#333'};
  display: block;
  overflow: visible;
  container-type: inline-size;
`;
const Content = styled(ContentEditable)`
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
    color: ${(props) => props.theme.colors?.textSecondary || '#666'};
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
    color: ${(props) => props.theme.colors?.text || '#d4d4d4'};
  }
  
  .editor-heading-h1 { font-size: 1.8em; font-weight: 700; margin: 0.5em 0; color: ${(props) => props.theme.colors?.text || '#fff'}; }
  .editor-heading-h2 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; color: ${(props) => props.theme.colors?.text || '#eee'}; }
  .editor-heading-h3 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0; color: ${(props) => props.theme.colors?.text || '#ddd'}; }
  
  .editor-quote {
    margin: 1em 0;
    margin-left: 0;
    padding-left: 1em;
    border-left: 4px solid ${(props) => props.theme.colors?.border || '#444'};
    color: ${(props) => props.theme.colors?.textSecondary || '#aaa'};
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
    background-color: ${(props) => props.theme.colors?.surface || '#2d2d2d'};
    color: ${(props) => props.theme.colors?.text || 'inherit'};
    padding: 0.2em 0.4em;
    border-radius: 3px;
    border: 1px solid ${(props) => props.theme.colors?.border || '#333'};
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  .editor-code {
    background-color: ${(props) => props.theme.colors?.surface || '#252526'};
    color: ${(props) => props.theme.colors?.text || '#d4d4d4'};
    font-family: 'Fira Code', Menlo, Consolas, Monaco, monospace;
    display: block;
    padding: 16px;
    line-height: 1.5;
    font-size: 13px;
    margin: 8px 0;
    border-radius: 8px;
    overflow-x: auto;
    position: relative;
    border: 1px solid ${(props) => props.theme.colors?.border || '#333'};
  }

  .editor-link {
    color: ${(props) => props.theme.colors?.primary || "#007bff"};
    text-decoration: underline;
    cursor: pointer;
  }

  .editor-hr {
    border: none;
    margin: 1em 0;
    cursor: default;
    border-top: 2px solid ${(props) => props.theme.colors?.textSecondary || '#888'} !important;
  }

  /* Table Styles */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    border: 1px solid ${(props) => props.theme.colors?.border || '#333'};
    /* Remove table-layout: fixed to allow resizer to control widths */
  }
  th, td {
    border: 1px solid ${(props) => props.theme.colors?.border || '#333'};
    padding: 8px;
    text-align: left;
    color: ${(props) => props.theme.colors?.text || '#d4d4d4'};
    word-break: break-word; /* Enable wrapping within cells */
    overflow-wrap: break-word;
    min-width: 40px;
  }
  th {
    background-color: ${(props) => props.theme.colors?.surface || '#2d2d2d'};
    font-weight: 600;
  }
  td {
    background-color: ${(props) => props.theme.colors?.background || '#1e1e1e'};
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
    border: 2px solid ${(props) => props.theme.colors?.primary || '#007bff'};
    border-radius: 4px;
    background: ${(props) => props.theme.colors?.surface || '#2d2d2d'};
    transition: all 0.2s ease;
  }

  .editor-listitem-checked:before {
    background-color: ${(props) => props.theme.colors?.primary || "#007bff"};
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
    color: ${(props) => props.theme.colors?.textSecondary || '#999'};
  }

  /* Collapsible Styles */
  .editor-collapsible {
    border-radius: 6px;
    padding: 0 12px;
    margin: 8px 0;
    transition: all 0.2s ease;
    background: ${(props) => props.theme.colors?.surface || '#252526'};
    border: 1px solid ${(props) => props.theme.colors?.border || '#333'};
    word-break: break-word;
    overflow-wrap: break-word;

    summary {
      padding: 8px 0;
      cursor: pointer;
      font-weight: 600;
      color: ${(props) => props.theme.colors?.primary || '#9cdcfe'};
      outline: none;
      user-select: none;
      font-size: 0.9rem;
      
      &::-webkit-details-marker {
        margin-right: 8px;
        color: ${(props) => props.theme.colors?.textSecondary || '#555'};
      }
    }

    /* Target the content area */
    & > *:not(summary) {
      margin-bottom: 0px;
    }
  }
`;
const IMAGE_TRANSFORMER = {
    dependencies: [ImageNode],
    export: (node) => {
        if ($isImageNode(node)) {
            return `![${node.__altText}](${node.__src})`;
        }
        return null;
    },
    regExp: /!\[([^\]]*)\]\(([^)]*)\)/,
    replace: (textNode, match) => {
        const [, altText, src] = match;
        const imageNode = $createImageNode({ src, altText });
        textNode.replace(imageNode);
    },
    type: "text-match",
};
const COLLAPSIBLE_TRANSFORMER = {
    dependencies: [CollapsibleNode],
    export: (node) => {
        if ($isCollapsibleNode(node)) {
            const children = node.getChildren();
            const content = children.map((n) => n.getTextContent()).join('\n');
            return `:::collapse ${node.getTitle()}\n${content}\n:::`;
        }
        return null;
    },
    // regExp is kept for live-typing shortcuts via MarkdownShortcutPlugin
    regExp: /^:::collapse\s*(.*)$/,
    replace: (textNode, match) => {
        const title = match[1]?.trim() || "Details";
        const node = $createCollapsibleNode(true, title);
        textNode.replace(node);
    },
    type: "element",
};
const HTML_COMBINED_TRANSFORMER = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if (!$isTextNode(node))
            return null;
        const style = node.getStyle();
        const hasUnderline = node.hasFormat("underline");
        if (!style && !hasUnderline)
            return null;
        let result = exportFormat ? exportFormat(node, node.getTextContent()) : node.getTextContent();
        if (style)
            result = `<span style="${style}">${result}</span>`;
        if (hasUnderline)
            result = `<u>${result}</u>`;
        return result;
    },
    importRegExp: /<(u|span)(?:\s+style="([^"]+)")?>([\s\S]+?)<\/\1>/,
    regExp: /<(u|span)(?:\s+style="([^"]+)")?>([\s\S]+?)<\/\1>/,
    replace: (textNode, match) => {
        const [, tag, style, content] = match;
        let currentContent = content;
        let combinedStyle = style || "";
        let isUnderline = tag === 'u';
        const innerRegex = /<(u|span)(?:\s+style="([^"]+)")?>([\s\S]+?)<\/\1>/;
        let innerMatch;
        while ((innerMatch = currentContent.match(innerRegex))) {
            const [, nTag, nStyle, nContent] = innerMatch;
            if (nTag === 'u')
                isUnderline = true;
            if (nStyle)
                combinedStyle = combinedStyle ? `${combinedStyle};${nStyle}` : nStyle;
            currentContent = nContent;
        }
        const cleanContent = currentContent.replace(/<\/?(u|span)(?:\s+style="[^"]+")?>/g, '');
        const newNode = $createTextNode(cleanContent);
        newNode.setFormat(textNode.getFormat());
        if (isUnderline)
            newNode.toggleFormat("underline");
        const existingStyle = textNode.getStyle();
        if (existingStyle && combinedStyle) {
            newNode.setStyle(`${existingStyle};${combinedStyle}`);
        }
        else {
            newNode.setStyle(combinedStyle || existingStyle);
        }
        textNode.replace(newNode);
    },
    trigger: "<",
    type: "text-match",
};
const EMPTY_PARAGRAPH_TRANSFORMER = {
    dependencies: [ParagraphNode],
    export: (node) => {
        if ($isParagraphNode(node) && node.getTextContentSize() === 0 && node.getChildrenSize() === 0) {
            return "\n\u200B\n";
        }
        return null;
    },
    regExp: /^THIS_SHOULD_NEVER_MATCH$/,
    replace: () => false,
    type: "element",
};
const SPREADSHEET_TRANSFORMER = {
    dependencies: [SpreadsheetNode],
    export: (node) => {
        if ($isSpreadsheetNode(node)) {
            return "```spreadsheet\n" + node.getData() + "\n```";
        }
        return null;
    },
    regExp: /^```spreadsheet$/,
    replace: () => { },
    type: "element",
};
const HANDWRITING_TRANSFORMER = {
    dependencies: [HandwritingNode],
    export: (node) => {
        if ($isHandwritingNode(node)) {
            return "```fabric\n" + node.getData() + "\n```";
        }
        return null;
    },
    regExp: /^```fabric$/,
    replace: () => { },
    type: "element",
};
const HR_TRANSFORMER = {
    dependencies: [HorizontalRuleNode],
    export: (node) => {
        return $isHorizontalRuleNode(node) ? '---' : null;
    },
    regExp: /^(---|\*\*\*|___)\s*$/,
    replace: (parentNode, _1, _2, isFirstLine) => {
        const line = $createHorizontalRuleNode();
        if (isFirstLine) {
            parentNode.replace(line);
        }
        else {
            parentNode.insertBefore(line);
        }
        line.selectNext();
    },
    type: "element",
};
const PAGE_BREAK_TRANSFORMER = {
    dependencies: [PageBreakNode],
    export: (node) => {
        return $isPageBreakNode(node) ? '\n\\newpage\n' : null;
    },
    regExp: /^\\newpage\s*$/,
    replace: (parentNode, _1, _2, isFirstLine) => {
        const pbNode = $createPageBreakNode();
        if (isFirstLine) {
            parentNode.replace(pbNode);
        }
        else {
            parentNode.insertBefore(pbNode);
        }
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
function MarkdownImmediatePlugin() {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerNodeTransform(TextNode, (node) => {
            if (!node.isSimpleText() || !node.isAttached())
                return;
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
                    const matchStart = match.index + prefix.length;
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
                    }
                    else {
                        newNode.toggleFormat(format);
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
const ELEMENT_FORMAT_EXPORT_TRANSFORMER = {
    dependencies: [ParagraphNode, HeadingNode, QuoteNode],
    export: (node, traverseChildren) => {
        if ($isElementNode(node)) {
            const format = node.getFormatType();
            if (format && format !== "left" && format !== "") {
                const tag = $isParagraphNode(node)
                    ? "p"
                    : $isHeadingNode(node)
                        ? node.getTag()
                        : $isQuoteNode(node)
                            ? "blockquote"
                            : null;
                if (tag) {
                    const childrenContent = traverseChildren(node);
                    const finalContent = (childrenContent === "" || childrenContent === "\u200B") ? "\u200B" : childrenContent;
                    return `<${tag} align="${format}">${finalContent}</${tag}>`;
                }
            }
        }
        return null;
    },
    regExp: /^<(p|h[1-6]|blockquote) align="(\w+)">/,
    replace: (parentNode, _children, match) => {
        const align = match[2];
        parentNode.setFormat(align);
        return false;
    },
    type: "element",
};
const SAFE_BOLD_ITALIC_STAR = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if ($isTextNode(node) && node.hasFormat("bold") && node.hasFormat("italic")) {
            const textContent = node.getTextContent();
            return `***${exportFormat ? exportFormat(node, textContent) : textContent}***`;
        }
        return null;
    },
    importRegExp: /(?<!\*)\*\*\*([^\*]+?)\*\*\*(?!\*)/,
    regExp: /(?<!\*)\*\*\*([^\*]+?)\*\*\*(?!\*)/,
    replace: (textNode, match) => {
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
const SAFE_BOLD_STAR = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if ($isTextNode(node) && node.hasFormat("bold")) {
            const textContent = node.getTextContent();
            return `**${exportFormat ? exportFormat(node, textContent) : textContent}**`;
        }
        return null;
    },
    importRegExp: /(?<!\*)\*\*([^\*]+?)\*\*(?!\*)/,
    regExp: /(?<!\*)\*\*([^\*]+?)\*\*(?!\*)/,
    replace: (textNode, match) => {
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
const SAFE_ITALIC_STAR = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if ($isTextNode(node) && node.hasFormat("italic")) {
            const textContent = node.getTextContent();
            return `*${exportFormat ? exportFormat(node, textContent) : textContent}*`;
        }
        return null;
    },
    importRegExp: /(?<!\*)\*([^\*]+?)\*(?!\*)/,
    regExp: /(?<!\*)\*([^\*]+?)\*(?!\*)/,
    replace: (textNode, match) => {
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
const SAFE_BOLD_ITALIC_UNDERSCORE = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if ($isTextNode(node) && node.hasFormat("bold") && node.hasFormat("italic")) {
            const textContent = node.getTextContent();
            return `___${exportFormat ? exportFormat(node, textContent) : textContent}___`;
        }
        return null;
    },
    importRegExp: /(?<!_)___([^_]+?)___(?!_)/,
    regExp: /(?<!_)___([^_]+?)___(?!_)/,
    replace: (textNode, match) => {
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
const SAFE_BOLD_UNDERSCORE = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if ($isTextNode(node) && node.hasFormat("bold")) {
            const textContent = node.getTextContent();
            return `__${exportFormat ? exportFormat(node, textContent) : textContent}__`;
        }
        return null;
    },
    importRegExp: /(?<!_)__([^_]+?)__(?!_)/,
    regExp: /(?<!_)__([^_]+?)__(?!_)/,
    replace: (textNode, match) => {
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
const SAFE_ITALIC_UNDERSCORE = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if ($isTextNode(node) && node.hasFormat("italic")) {
            const textContent = node.getTextContent();
            return `_${exportFormat ? exportFormat(node, textContent) : textContent}_`;
        }
        return null;
    },
    importRegExp: /(?<!_)_([^_]+?)_(?!_)/,
    regExp: /(?<!_)_([^_]+?)_(?!_)/,
    replace: (textNode, match) => {
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
const SAFE_STRIKETHROUGH = {
    dependencies: [],
    export: (node, _traverseChildren, exportFormat) => {
        if ($isTextNode(node) && node.hasFormat("strikethrough")) {
            const textContent = node.getTextContent();
            return `~~${exportFormat ? exportFormat(node, textContent) : textContent}~~`;
        }
        return null;
    },
    importRegExp: /~~([^~]+?)~~/,
    regExp: /~~([^~]+?)~~/,
    replace: (textNode, match) => {
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
const ALL_TRANSFORMERS = [
    ELEMENT_FORMAT_EXPORT_TRANSFORMER,
    HTML_COMBINED_TRANSFORMER,
    EMPTY_PARAGRAPH_TRANSFORMER,
    SAFE_BOLD_ITALIC_STAR,
    SAFE_BOLD_ITALIC_UNDERSCORE,
    SAFE_BOLD_STAR,
    SAFE_BOLD_UNDERSCORE,
    SAFE_ITALIC_STAR,
    SAFE_ITALIC_UNDERSCORE,
    SAFE_STRIKETHROUGH,
    CHECK_LIST,
    IMAGE_TRANSFORMER,
    COLLAPSIBLE_TRANSFORMER,
    PAGE_BREAK_TRANSFORMER,
    HR_TRANSFORMER,
    ...TRANSFORMERS.filter(t => t !== BOLD_ITALIC_STAR &&
        t !== BOLD_ITALIC_UNDERSCORE &&
        t !== BOLD_STAR &&
        t !== BOLD_UNDERSCORE &&
        t !== ITALIC_STAR &&
        t !== ITALIC_UNDERSCORE &&
        t !== STRIKETHROUGH &&
        t.regExp?.toString() !== /^(---|\*\*\*|___)\s*$/.toString()),
];
const EXPORT_TRANSFORMERS = [
    ELEMENT_FORMAT_EXPORT_TRANSFORMER,
    EMPTY_PARAGRAPH_TRANSFORMER,
    HTML_COMBINED_TRANSFORMER,
    SAFE_BOLD_ITALIC_STAR,
    SAFE_BOLD_ITALIC_UNDERSCORE,
    SAFE_BOLD_STAR,
    SAFE_BOLD_UNDERSCORE,
    SAFE_ITALIC_STAR,
    SAFE_ITALIC_UNDERSCORE,
    SAFE_STRIKETHROUGH,
    CHECK_LIST,
    IMAGE_TRANSFORMER,
    COLLAPSIBLE_TRANSFORMER,
    SPREADSHEET_TRANSFORMER,
    HANDWRITING_TRANSFORMER,
    PAGE_BREAK_TRANSFORMER,
    HR_TRANSFORMER,
    ...TRANSFORMERS.filter(t => t !== BOLD_ITALIC_STAR &&
        t !== BOLD_ITALIC_UNDERSCORE &&
        t !== BOLD_STAR &&
        t !== BOLD_UNDERSCORE &&
        t !== ITALIC_STAR &&
        t !== ITALIC_UNDERSCORE &&
        t !== STRIKETHROUGH &&
        t.regExp?.toString() !== /^(---|\*\*\*|___)\s*$/.toString())
];
function MarkdownSyncPlugin({ value, onChange }) {
    const [editor] = useLexicalComposerContext();
    const lastNormalizedValueRef = useRef(value);
    // Helper to apply markdown to editor with post-processing
    const applyMarkdown = (markdown) => {
        editor.update(() => {
            // CRITICAL: Clear selection to avoid "selection lost" errors during bulk replacement
            $setSelection(null);
            // 1. Normalize line endings and alignment tags
            const normalized = markdown.replace(/\r\n/g, '\n');
            // 1B. Pre-process page breaks
            const withPageBreaks = normalized
                .replace(/<div(?: class="page-break")? style="page-break-after: always;"><\/div>/g, '\\newpage')
                .replace(/\\newpage/g, '\n\n\\newpage\n\n')
                .replace(/\n\n\n+/g, '\n\n');
            const alignmentCleaned = withPageBreaks.replace(/<(p|h[1-6]|blockquote) align="(\w+)">([\s\S]*?)<\/\1>/gi, '<$1 align="$2">$3');
            // 2. Pre-process collapsible blocks
            const collapsibleBlocks = [];
            const withCollapses = alignmentCleaned.replace(/^:::collapse\s*(.*?)\n([\s\S]*?)\n:::$/gm, (_, title, content) => {
                const idx = collapsibleBlocks.length;
                collapsibleBlocks.push({ title: title.trim() || 'Details', content });
                return '```__collapse_' + idx + '\n' + content + '\n```';
            });
            // 3. Initial Markdown Import
            $convertFromMarkdownString(withCollapses, ALL_TRANSFORMERS);
            // 3A. Post-process: Remove ZWSP markers to restore truly empty paragraphs
            const textNodes = $nodesOfType(TextNode);
            textNodes.forEach((node) => {
                const text = node.getTextContent();
                if (text === '\u200B') {
                    node.remove();
                }
                else if (text.includes('\u200B')) {
                    node.setTextContent(text.replace(/\u200B/g, ''));
                }
            });
            // 3B. Post-process: Convert temporary code blocks to custom nodes
            const codeNodes = $nodesOfType(CodeNode);
            codeNodes.forEach((node) => {
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
                            if (line)
                                paragraph.append($createTextNode(line));
                            collapsibleNode.append(paragraph);
                        }
                        node.replace(collapsibleNode);
                    }
                }
                else if (lang === "fabric") {
                    const data = node.getTextContent();
                    node.replace($createHandwritingNode(data));
                }
                else if (lang === "spreadsheet") {
                    const data = node.getTextContent();
                    node.replace($createSpreadsheetNode(data));
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
            if (tags.has('import'))
                return;
            editorState.read(() => {
                let markdown = $convertToMarkdownString(EXPORT_TRANSFORMERS);
                // Safety: Prevent accidental wipe on empty initialization before import
                if (markdown === "" && lastNormalizedValueRef.current !== "" && !tags.has('import')) {
                    if (lastNormalizedValueRef.current.length > 10)
                        return;
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
                }
                else {
                    firstUpdateRef.current = false;
                }
            });
        });
    }, [editor, onChange, value]);
    return null;
}
export const LexicalEditor = ({ value, onChange, className, placeholder, onToggleSidebar, spellCheck = true, markdownShortcuts = true, autoLink = true, tabIndentation = true, tabSize = 4, fontSize = 16, onSave, onExit, onDelete, saveLabel, exitLabel, deleteLabel, saveDisabled, stickyOffset, customButtons }) => {
    const initialConfig = useMemo(() => ({
        namespace: "MemoSuiteEditor",
        theme: MemoSuiteTheme,
        onError(error) {
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
            PageBreakNode,
            HandwritingNode,
            SpreadsheetNode,
            ImageNode,
            CollapsibleNode
        ]
    }), []);
    return (_jsx(EditorContainer, { className: className, children: _jsxs(LexicalComposer, { initialConfig: initialConfig, children: [_jsx(ToolbarPlugin, { onToggleSidebar: onToggleSidebar, defaultFontSize: fontSize, onSave: onSave, onExit: onExit, onDelete: onDelete, saveLabel: saveLabel, exitLabel: exitLabel, deleteLabel: deleteLabel, saveDisabled: saveDisabled, stickyOffset: stickyOffset, customButtons: customButtons }), _jsxs("div", { className: "editor-inner", style: { position: 'relative' }, children: [_jsx(RichTextPlugin, { contentEditable: _jsx(Content, { spellCheck: spellCheck, "$tabSize": tabSize, "$fontSize": fontSize }), placeholder: _jsx("div", { className: "editor-placeholder", children: placeholder }), ErrorBoundary: LexicalErrorBoundary }), _jsx(HistoryPlugin, {}), markdownShortcuts && _jsx(MarkdownShortcutPlugin, { transformers: ALL_TRANSFORMERS }), _jsx(PageBreakPlugin, {}), _jsx(ListPlugin, {}), _jsx(LinkPlugin, {}), autoLink && _jsx(AutoLinkPlugin, { matchers: MATCHERS }), _jsx(CheckListPlugin, {}), _jsx(TablePlugin, {}), _jsx(TableResizerPlugin, {}), tabIndentation && _jsx(TabIndentationPlugin, {}), _jsx(HorizontalRulePlugin, {}), _jsx(ClearEditorPlugin, {}), _jsx(ListMaxIndentLevelPlugin, { maxDepth: 7 }), _jsx(AutoFocusPlugin, {}), _jsx(MarkdownImmediatePlugin, {}), _jsx(MarkdownSyncPlugin, { value: value, onChange: onChange })] })] }) }));
};
