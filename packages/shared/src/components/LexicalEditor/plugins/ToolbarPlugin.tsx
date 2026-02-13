import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    UNDO_COMMAND,
    REDO_COMMAND,
    CAN_UNDO_COMMAND,
    CAN_REDO_COMMAND,
    $createParagraphNode,
    CLEAR_EDITOR_COMMAND,
} from "lexical";
import {
    $isListNode,
    ListNode,
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    INSERT_CHECK_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
} from "@lexical/list";
import {
    $createHeadingNode,
    $createQuoteNode,
    $isHeadingNode,
    HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister, $insertNodeToNearestRoot } from "@lexical/utils";
import { TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import {
    FaBold, FaItalic, FaStrikethrough, FaCode,
    FaUndo, FaRedo, FaUnderline, FaLink, FaAlignCenter, FaAlignLeft, FaAlignRight, FaAlignJustify,
    FaTable, FaMinus, FaEraser
} from "react-icons/fa";
import { FiPenTool } from "react-icons/fi";
import { RiTable2 } from "react-icons/ri";
import { $createHandwritingNode } from "../nodes/HandwritingNode";
import { $createSpreadsheetNode } from "../nodes/SpreadsheetNode";

const ToolbarContainer = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  border-bottom: 1px solid ${(props: any) => props.theme.colors?.border || "#eee"};
  background: ${(props: any) => props.theme.colors?.surface || "#fff"};
  flex-wrap: wrap;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const ToolbarButton = styled.button`
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: ${(props: any) => props.theme.colors?.text || "#555"};
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  min-height: 30px;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #f0f2f5;
    color: #000;
  }

  &.is-active {
    background: ${(props: any) => props.theme.colors?.primary || "#007bff"}15;
    color: ${(props: any) => props.theme.colors?.primary || "#007bff"};
  }

  &:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 18px;
  background: #e0e0e0;
  margin: 0 4px;
`;

const SelectWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 2px;
`;

const BlockSelect = styled.select`
  appearance: none;
  padding: 4px 24px 4px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  outline: none;
  font-size: 13px;
  background: #f8f9fa;
  color: #444;
  cursor: pointer;
  font-weight: 500;
  min-width: 100px;

  &:hover {
    background: #f0f2f5;
  }
`;

const SelectArrow = styled.div`
  position: absolute;
  right: 8px;
  pointer-events: none;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #666;
`;

export function ToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [blockType, setBlockType] = useState("paragraph");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [isLink, setIsLink] = useState(false);

    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            const element =
                anchorNode.getKey() === "root"
                    ? anchorNode
                    : anchorNode.getTopLevelElementOrThrow();
            const elementKey = element.getKey();
            const elementDOM = editor.getElementByKey(elementKey);

            if (elementDOM !== null) {
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                    const type = parentList ? parentList.getListType() : element.getListType();
                    setBlockType(type);
                } else {
                    const type = $isHeadingNode(element)
                        ? element.getTag()
                        : element.getType();
                    setBlockType(type);
                }
            }

            // Update Text Format
            setIsBold(selection.hasFormat("bold"));
            setIsItalic(selection.hasFormat("italic"));
            setIsUnderline(selection.hasFormat("underline"));
            setIsStrikethrough(selection.hasFormat("strikethrough"));
            setIsCode(selection.hasFormat("code"));

            // Update Link
            const node = selection.anchor.getNode();
            const parent = node.getParent();
            if ($isLinkNode(parent) || $isLinkNode(node)) {
                setIsLink(true);
            } else {
                setIsLink(false);
            }
        }
    }, [editor]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateToolbar();
                });
            }),
            editor.registerCommand(
                CAN_UNDO_COMMAND,
                (payload) => {
                    setCanUndo(payload);
                    return false;
                },
                1
            ),
            editor.registerCommand(
                CAN_REDO_COMMAND,
                (payload) => {
                    setCanRedo(payload);
                    return false;
                },
                1
            )
        );
    }, [editor, updateToolbar]);

    const formatParagraph = () => {
        if (blockType !== "paragraph") {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createParagraphNode());
                }
            });
        }
    };

    const formatHeading = (headingSize: HeadingTagType) => {
        if (blockType !== headingSize) {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createHeadingNode(headingSize));
                }
            });
        }
    };

    const formatBulletList = () => {
        if (blockType !== "bullet") {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        } else {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        }
    };

    const formatNumberedList = () => {
        if (blockType !== "number") {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        } else {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        }
    };

    const formatCheckList = () => {
        if (blockType !== "check") {
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        } else {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        }
    };

    const formatQuote = () => {
        if (blockType !== "quote") {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            });
        }
    };

    const insertLink = useCallback(() => {
        if (!isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
        } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    }, [editor, isLink]);

    const insertTable = () => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: "3", rows: "3" });
    };

    const insertHandwriting = () => {
        editor.update(() => {
            const node = $createHandwritingNode("");
            $insertNodeToNearestRoot(node);
        });
    };

    const insertSpreadsheet = () => {
        editor.update(() => {
            const node = $createSpreadsheetNode("");
            $insertNodeToNearestRoot(node);
        });
    };

    return (
        <ToolbarContainer>
            {/* Custom Buttons */}
            <ToolbarButton onClick={insertHandwriting} title="Handwriting" style={{ color: "#D55E00" }}>
                <FiPenTool size={18} />
            </ToolbarButton>
            <ToolbarButton onClick={insertSpreadsheet} title="Spreadsheet" style={{ color: "#009E73" }}>
                <RiTable2 size={18} />
            </ToolbarButton>

            <Divider />

            {/* History */}
            <ToolbarButton
                disabled={!canUndo}
                onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                title="Undo (Ctrl+Z)"
            >
                <FaUndo />
            </ToolbarButton>
            <ToolbarButton
                disabled={!canRedo}
                onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                title="Redo (Ctrl+Y)"
            >
                <FaRedo />
            </ToolbarButton>

            <Divider />

            {/* Block Type */}
            <SelectWrapper>
                <BlockSelect
                    value={blockType}
                    onChange={(e) => {
                        const type = e.target.value;
                        if (type === "paragraph") formatParagraph();
                        else if (type.startsWith("h")) formatHeading(type as HeadingTagType);
                        else if (type === "bullet") formatBulletList();
                        else if (type === "number") formatNumberedList();
                        else if (type === "check") formatCheckList();
                        else if (type === "quote") formatQuote();
                    }}
                >
                    <option value="paragraph">Normal</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="bullet">Bullet List</option>
                    <option value="number">Numbered List</option>
                    <option value="check">Check List</option>
                    <option value="quote">Quote</option>
                </BlockSelect>
                <SelectArrow />
            </SelectWrapper>

            <Divider />

            {/* Inline Formatting */}
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
                className={isBold ? "is-active" : ""}
                title="Bold (Ctrl+B)"
            >
                <FaBold />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
                className={isItalic ? "is-active" : ""}
                title="Italic (Ctrl+I)"
            >
                <FaItalic />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
                className={isUnderline ? "is-active" : ""}
                title="Underline (Ctrl+U)"
            >
                <FaUnderline />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
                className={isStrikethrough ? "is-active" : ""}
                title="Strikethrough"
            >
                <FaStrikethrough />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
                className={isCode ? "is-active" : ""}
                title="Inline Code"
            >
                <FaCode />
            </ToolbarButton>
            <ToolbarButton
                onClick={insertLink}
                className={isLink ? "is-active" : ""}
                title="Link"
            >
                <FaLink />
            </ToolbarButton>

            <Divider />

            {/* Alignments */}
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}
                title="Left Align"
            >
                <FaAlignLeft />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}
                title="Center Align"
            >
                <FaAlignCenter />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}
                title="Right Align"
            >
                <FaAlignRight />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}
                title="Justify Align"
            >
                <FaAlignJustify />
            </ToolbarButton>

            <Divider />

            {/* Insert Nodes */}
            <ToolbarButton
                onClick={insertTable}
                title="Insert Table"
            >
                <FaTable />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
                title="Horizontal Rule"
            >
                <FaMinus />
            </ToolbarButton>

            <Divider />

            {/* Utility */}
            <ToolbarButton
                onClick={() => editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)}
                title="Clear All Content"
            >
                <FaEraser />
            </ToolbarButton>
        </ToolbarContainer>
    );
}
