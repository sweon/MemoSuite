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
    $insertNodes,
    INDENT_CONTENT_COMMAND,
    OUTDENT_CONTENT_COMMAND,
} from "lexical";
import type { EditorState } from "lexical";
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
} from "@lexical/rich-text";
import type { HeadingTagType } from "@lexical/rich-text";
import { $setBlocksType, $patchStyleText, $getSelectionStyleValueForProperty } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister, $insertNodeToNearestRoot } from "@lexical/utils";
import { TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import {
    FaBold, FaItalic, FaStrikethrough, FaCode,
    FaUndo, FaRedo, FaUnderline, FaLink, FaAlignCenter, FaAlignLeft, FaAlignRight, FaAlignJustify,
    FaTable, FaMinus, FaEraser, FaPalette, FaPlus, FaImage, FaCaretDown, FaChevronUp, FaChevronDown
} from "react-icons/fa";
import { FiPenTool, FiSidebar, FiSave, FiX, FiTrash2 } from "react-icons/fi";
import { RiTable2, RiLineHeight, RiIndentIncrease, RiIndentDecrease } from "react-icons/ri";
import { $createHandwritingNode } from "../nodes/HandwritingNode";
import { $createSpreadsheetNode } from "../nodes/SpreadsheetNode";
import { $createImageNode } from "../nodes/ImageNode";
import { $createCollapsibleNode } from "../nodes/CollapsibleNode";
import { Tooltip } from "../../Tooltip";
import { useLanguage } from "../../../i18n";

const ToolbarContainer = styled.div<{ $isPortaled?: boolean; $top?: number }>`
  display: flex;
  gap: 1.5px;
  padding: ${props => props.$isPortaled ? '0' : '4px 6px'};
  border-bottom: ${props => props.$isPortaled ? 'none' : `1px solid ${props.theme.colors?.border || "#eee"}`};
  background: ${props => props.$isPortaled ? 'transparent' : (props.theme.colors?.surface || "#fff")};
  flex-wrap: wrap;
  align-items: center;
  
  ${props => !props.$isPortaled && `
    position: sticky;
    top: ${props.$top || 0}px;
    z-index: 10;
  `}
`;

const ToolbarButton = styled.button`
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: ${(props: any) => props.theme.colors?.text || "#555"};
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
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


const SelectWrapper = styled.div`
position: relative;
display: flex;
align-items: center;
margin: 0;
`;

const BlockSelect = styled.select`
appearance: none;
padding: 4px 28px 4px 10px;
border-radius: 6px;
border: 1px solid #eee;
outline: none;
font-size: 13px;
background: #f8f9fa;
color: #444;
cursor: pointer;
font-weight: 500;
min-width: 90px;
transition: all 0.2s ease;

  &:hover {
    background: #f0f2f5;
    border-color: #ddd;
}
`;

const SelectArrow = styled.div`
position: absolute;
right: 10px;
pointer-events: none;
border-left: 4px solid transparent;
border-right: 4px solid transparent;
border-top: 5px solid #666;
`;

const ColorPickerWrapper = styled.div`
position: relative;
display: flex;
align-items: center;
`;

const ColorMenu = styled.div<{ $rightAlign?: boolean }>`
position: absolute;
top: 100%;
  ${props => props.$rightAlign ? 'right: 0;' : 'left: 0;'}
background: white;
border: 1px solid #ddd;
border-radius: 8px;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
padding: 10px;
z-index: 101; /* Slightly higher than others */
display: flex;
max-width: 90vw; /* Safety on mobile */
flex-direction: column;
gap: 10px;
min-width: 160px;
margin-top: 4px;
`;


const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
`;

const ColorRow = styled.div`
display: grid;
grid-template-columns: repeat(6, 1fr);
gap: 4px;
`;

const FormatMenu = styled.div<{ $rightAlign?: boolean }>`
  position: absolute;
  top: 100%;
  ${props => props.$rightAlign ? 'right: 0;' : 'left: 0;'}
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 0;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 80px;
  max-width: 90vw;
  margin-top: 4px;
`;

const FormatOption = styled.div`
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #444;
  transition: background 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: #f0f2f5;
    color: #000;
  }
`;

const FontSizeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 4px;
`;

const FontSizeDisplay = styled.div`
  display: flex;
  align-items: center;
  background: ${(props: any) => props.theme.colors?.surface || "#fff"};
  border: 1px solid ${(props: any) => props.theme.colors?.border || "#eee"};
  border-radius: 4px;
  height: 28px;
  padding: 0 4px;
  cursor: text;

  &:focus-within {
    border-color: ${(props: any) => props.theme.colors?.primary || "#007bff"};
  }
`;

const FontSizeInput = styled.input`
  width: 20px;
  border: none;
  background: transparent;
  text-align: right;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  padding: 0;
  color: ${(props: any) => props.theme.colors?.text || "#444"};

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const FontSizeUnit = styled.span`
  font-size: 11px;
  color: #888;
  margin-left: 2px;
  user-select: none;
`;

const FontSizeControls = styled.div`
  display: flex;
  flex-direction: column;
  background: #eee;
  border-radius: 6px;
  overflow: hidden;
  width: 18px;
  height: 28px;
`;

const SpinButton = styled.button`
  border: none;
  background: transparent;
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  font-size: 8px;
  transition: background 0.1s ease;

  &:first-child {
    border-bottom: 0.5px solid #ccc;
  }

  &:hover {
    background: #e0e0e0;
    color: #333;
  }
  
  &:active {
    background: #d0d0d0;
  }
`;

const LINE_H_OPTIONS = ["1.0", "1.2", "1.5", "1.8", "2.0"];

const ColorOption = styled.div<{ color: string }>`
  width: 18px;
  height: 18px;
  background-color: ${props => props.color};
  border: 1px solid #eee;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.1s ease;

  &:hover {
    transform: scale(1.15);
    border-color: #666;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const CustomColorBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid #eee;
  border-radius: 4px;
  background: #f8f9fa;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  color: #555;
  
  &:hover {
    background: #f0f2f5;
    color: #333;
  }
`;

const HiddenColorInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
`;

const COLOR_PALETTE = [
    ["#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff"], // Greyscale
    ["#b71c1c", "#f44336", "#e57373", "#ef9a9a", "#ffcdd2", "#ffebee"], // Red
    ["#880e4f", "#e91e63", "#f06292", "#f48fb1", "#f8bbd0", "#fce4ec"], // Pink
    ["#4a148c", "#9c27b0", "#ba68c8", "#ce93d8", "#e1bee7", "#f3e5f5"], // Purple
    ["#1a237e", "#3f51b5", "#7986cb", "#9fa8da", "#c5cae9", "#e8eaf6"], // Indigo
    ["#0d47a1", "#2196f3", "#64b5f6", "#90caf9", "#bbdefb", "#e3f2fd"], // Blue
    ["#004d40", "#009688", "#4db6ac", "#80cbc4", "#b2dfdb", "#e0f2f1"], // Teal/Cyan
    ["#1b5e20", "#4caf50", "#81c784", "#a5d6a7", "#c8e6c9", "#e8f5e9"], // Green
    ["#f57f17", "#ffeb3b", "#fff176", "#fff59d", "#fff9c4", "#fffde7"], // Yellow
    ["#e65100", "#ff9800", "#ffb74d", "#ffcc80", "#ffe0b2", "#fff3e0"]  // Orange
];

const TableInsertMenu = styled.div<{ $rightAlign?: boolean }>`
  position: absolute;
  top: 100%;
  ${props => props.$rightAlign ? 'right: 0;' : 'left: 0;'}
  z-index: 100;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 180px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MenuTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
`;

const InputGroup = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  label {
    font-size: 13px;
    color: #666;
  }

  input {
    width: 60px;
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
  }
`;

const CheckboxGroup = styled.div`
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #666;
    cursor: pointer;
  }

  input {
    cursor: pointer;
  }
`;

const CreateButton = styled.button`
  background: ${(props: any) => props.theme.colors?.primary || "#007bff"};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2;

  &:hover {
    opacity: 0.9;
  }
`;

export function ToolbarPlugin(props: {
    onToggleSidebar?: () => void,
    defaultFontSize?: number,
    onSave?: () => void,
    onExit?: () => void,
    onDelete?: () => void,
    saveLabel?: string,
    exitLabel?: string,
    deleteLabel?: string,
    saveDisabled?: boolean
}) {
    const { onToggleSidebar, defaultFontSize = 11 } = props;
    const { t } = useLanguage();
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
    const [fontColor, setFontColor] = useState("#000000");
    const [fontSize, setFontSize] = useState(`${defaultFontSize}pt`);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showTableMenu, setShowTableMenu] = useState(false);
    const tableMenuRef = useRef<HTMLDivElement>(null);
    const [tableConfig, setTableConfig] = useState({ rows: "3", columns: "3", headerRow: true, headerColumn: false });

    // Destructure new props
    const { onSave, onExit, onDelete, saveLabel, exitLabel, deleteLabel } = props;

    const fontSizeIntervalRef = useRef<any>(null);
    const fsTimeoutRef = useRef<any>(null);
    const latestFontSize = useRef(fontSize);

    useEffect(() => {
        latestFontSize.current = fontSize;
    }, [fontSize]);
    const [showLineHeightMenu, setShowLineHeightMenu] = useState(false);
    const [showAlignMenu, setShowAlignMenu] = useState(false);
    const [showIndentMenu, setShowIndentMenu] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const target = document.getElementById("lexical-toolbar-portal");
        if (target) setPortalTarget(target);
    }, []);

    const colorInputRef = useRef<HTMLInputElement>(null);
    const colorMenuRef = useRef<HTMLDivElement>(null);
    const lineHeightMenuRef = useRef<HTMLDivElement>(null);
    const alignMenuRef = useRef<HTMLDivElement>(null);
    const indentMenuRef = useRef<HTMLDivElement>(null);
    // tableMenuRef will now point to the wrapper div

    // Menu alignment state
    const [menuAlignments, setMenuAlignments] = useState({
        color: false,
        align: true,
        lineHeight: true,
        indent: true,
        table: true
    });

    const updateMenuAlignment = (key: keyof typeof menuAlignments, ref: React.RefObject<any>) => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            // If the element is past the horizontal center of the screen, align right
            const shouldAlignRight = rect.left > (window.innerWidth / 2);
            setMenuAlignments(prev => ({ ...prev, [key]: shouldAlignRight }));
        }
    };


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (colorMenuRef.current && !colorMenuRef.current.contains(target)) setShowColorMenu(false);
            if (lineHeightMenuRef.current && !lineHeightMenuRef.current.contains(target)) setShowLineHeightMenu(false);
            if (alignMenuRef.current && !alignMenuRef.current.contains(target)) setShowAlignMenu(false);
            if (indentMenuRef.current && !indentMenuRef.current.contains(target)) setShowIndentMenu(false);
            if (tableMenuRef.current && !tableMenuRef.current.contains(target)) setShowTableMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

            // Update Font Color
            const color = $getSelectionStyleValueForProperty(selection, "color", "#000000");
            setFontColor(color);

            // Update Font Size
            const fs = $getSelectionStyleValueForProperty(selection, "font-size", `${defaultFontSize}pt`);
            setFontSize(fs);
        }
    }, [editor, defaultFontSize]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }: { editorState: EditorState }) => {
                editorState.read(() => {
                    updateToolbar();
                });
            }),
            editor.registerCommand(
                CAN_UNDO_COMMAND,
                (payload: boolean) => {
                    setCanUndo(payload);
                    return false;
                },
                1
            ),
            editor.registerCommand(
                CAN_REDO_COMMAND,
                (payload: boolean) => {
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
        const { rows, columns, headerRow, headerColumn } = tableConfig;
        if (parseInt(rows) > 0 && parseInt(columns) > 0) {
            editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                columns,
                rows,
                includeHeaders: { rows: headerRow, columns: headerColumn }
            });
            setShowTableMenu(false);
        }
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

    const insertImage = () => {
        const url = window.prompt(t.toolbar.image_prompt);
        if (url) {
            editor.update(() => {
                const node = $createImageNode({ src: url, altText: "Image" });
                $insertNodeToNearestRoot(node);
            });
        }
    };

    const insertCollapsible = () => {
        const title = window.prompt(t.toolbar.collapsible_prompt, t.toolbar.collapsible_default_title);
        if (title !== null) {
            editor.update(() => {
                const node = $createCollapsibleNode(true, title || t.toolbar.collapsible_default_title);
                const paragraph = $createParagraphNode();
                node.append(paragraph);

                const nextParagraph = $createParagraphNode();
                $insertNodes([node, nextParagraph]);

                paragraph.select();
            });
        }
    };


    const applyStyleText = useCallback(
        (styles: Record<string, string>) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $patchStyleText(selection, styles);
                }
            });
            editor.focus();
            setShowColorMenu(false);
        },
        [editor]
    );

    const updateFontSize = useCallback(
        (increment: boolean) => {
            const currentSize = parseInt(latestFontSize.current) || defaultFontSize;
            const newSize = increment ? Math.min(99, currentSize + 1) : Math.max(1, currentSize - 1);
            applyStyleText({ "font-size": `${newSize}pt` });
        },
        [applyStyleText]
    );

    const startFontSizeInterval = (increment: boolean) => {
        if (fontSizeIntervalRef.current || fsTimeoutRef.current) return;

        updateFontSize(increment);

        fsTimeoutRef.current = setTimeout(() => {
            fontSizeIntervalRef.current = setInterval(() => {
                updateFontSize(increment);
            }, 80);
        }, 500);
    };

    const stopFontSizeInterval = () => {
        if (fontSizeIntervalRef.current) {
            clearInterval(fontSizeIntervalRef.current);
            fontSizeIntervalRef.current = null;
        }
        if (fsTimeoutRef.current) {
            clearTimeout(fsTimeoutRef.current);
            fsTimeoutRef.current = null;
        }
    };

    const onFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === "") {
            setFontSize("");
            return;
        }
        const num = parseInt(val);
        if (!isNaN(num)) {
            const clamped = Math.max(1, Math.min(99, num));
            editor.focus();
            applyStyleText({ "font-size": `${clamped}pt` });
        }
    };

    const onFontColorSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            applyStyleText({ color: e.target.value });
        },
        [applyStyleText]
    );

    const toolbarContent = (
        <ToolbarContainer $isPortaled={!!portalTarget}>
            {/* Sidebar Toggle */}
            {onToggleSidebar && (
                <Tooltip content={t.toolbar.toggle_sidebar}>
                    <ToolbarButton onClick={onToggleSidebar} title={t.toolbar.toggle_sidebar}>
                        <FiSidebar />
                    </ToolbarButton>
                </Tooltip>
            )}

            {/* Custom Buttons */}
            <Tooltip content={t.toolbar.handwriting}>
                <ToolbarButton onClick={insertHandwriting} title={t.toolbar.handwriting} style={{ color: "#D55E00" }}>
                    <FiPenTool size={18} />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.spreadsheet}>
                <ToolbarButton onClick={insertSpreadsheet} title={t.toolbar.spreadsheet} style={{ color: "#009E73" }}>
                    <RiTable2 size={18} />
                </ToolbarButton>
            </Tooltip>

            {/* History */}
            <Tooltip content={t.toolbar.undo}>
                <ToolbarButton
                    disabled={!canUndo}
                    onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                    title={t.toolbar.undo}
                >
                    <FaUndo />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.redo}>
                <ToolbarButton
                    disabled={!canRedo}
                    onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                    title={t.toolbar.redo}
                >
                    <FaRedo />
                </ToolbarButton>
            </Tooltip>

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
                    <option value="paragraph">{t.toolbar.normal}</option>
                    <option value="h1">{t.toolbar.h1}</option>
                    <option value="h2">{t.toolbar.h2}</option>
                    <option value="h3">{t.toolbar.h3}</option>
                    <option value="bullet">{t.toolbar.bullet_list}</option>
                    <option value="number">{t.toolbar.numbered_list}</option>
                    <option value="check">{t.toolbar.check_list}</option>
                    <option value="quote">{t.toolbar.quote}</option>
                </BlockSelect>
                <SelectArrow />
            </SelectWrapper>

            {/* Inline Formatting */}
            <Tooltip content={t.toolbar.bold}>
                <ToolbarButton
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
                    onMouseDown={(e) => e.preventDefault()}
                    className={isBold ? "is-active" : ""}
                    title={t.toolbar.bold}
                >
                    <FaBold />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.italic}>
                <ToolbarButton
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
                    onMouseDown={(e) => e.preventDefault()}
                    className={isItalic ? "is-active" : ""}
                    title={t.toolbar.italic}
                >
                    <FaItalic />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.underline}>
                <ToolbarButton
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
                    onMouseDown={(e) => e.preventDefault()}
                    className={isUnderline ? "is-active" : ""}
                    title={t.toolbar.underline}
                >
                    <FaUnderline />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.strikethrough}>
                <ToolbarButton
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
                    onMouseDown={(e) => e.preventDefault()}
                    className={isStrikethrough ? "is-active" : ""}
                    title={t.toolbar.strikethrough}
                >
                    <FaStrikethrough />
                </ToolbarButton>
            </Tooltip>

            {/* Font Size Control */}
            <FontSizeContainer>
                <Tooltip content={t.toolbar.font_size}>
                    <FontSizeDisplay>
                        <FontSizeInput
                            type="text"
                            value={fontSize.replace("pt", "")}
                            onChange={onFontSizeChange}
                        />
                        <FontSizeUnit>pt</FontSizeUnit>
                    </FontSizeDisplay>
                </Tooltip>
                <FontSizeControls>
                    <SpinButton
                        onMouseDown={(e) => {
                            e.preventDefault();
                            startFontSizeInterval(true);
                        }}
                        onMouseUp={stopFontSizeInterval}
                        onMouseLeave={stopFontSizeInterval}
                        onPointerUp={stopFontSizeInterval}
                    >
                        <FaChevronUp />
                    </SpinButton>
                    <SpinButton
                        onMouseDown={(e) => {
                            e.preventDefault();
                            startFontSizeInterval(false);
                        }}
                        onMouseUp={stopFontSizeInterval}
                        onMouseLeave={stopFontSizeInterval}
                        onPointerUp={stopFontSizeInterval}
                    >
                        <FaChevronDown />
                    </SpinButton>
                </FontSizeControls>
            </FontSizeContainer>

            {/* Color Picker Dropdown with Expanded Palette */}
            <ColorPickerWrapper ref={colorMenuRef}>
                <Tooltip content={t.toolbar.font_color}>
                    <ToolbarButton
                        onClick={() => {
                            updateMenuAlignment('color', colorMenuRef);
                            setShowColorMenu(!showColorMenu);
                        }}
                        className={showColorMenu ? "is-active" : ""}
                        title={t.toolbar.font_color}
                        style={{ color: fontColor !== "#000000" ? fontColor : undefined }}
                    >
                        <FaPalette />
                    </ToolbarButton>
                </Tooltip>

                {showColorMenu && (
                    <ColorMenu $rightAlign={menuAlignments.color}>
                        <ColorGrid>
                            {COLOR_PALETTE.map((row, rowIndex) => (
                                <ColorRow key={`row - ${rowIndex} `}>
                                    {row.map(color => (
                                        <ColorOption
                                            key={color}
                                            color={color}
                                            onClick={() => applyStyleText({ color })}
                                            title={color}
                                        />
                                    ))}
                                </ColorRow>
                            ))}
                        </ColorGrid>
                        <CustomColorBtn onClick={() => colorInputRef.current?.click()}>
                            <FaPlus size={10} /> {t.toolbar.custom_color}
                        </CustomColorBtn>
                    </ColorMenu>
                )}

                <HiddenColorInput
                    type="color"
                    ref={colorInputRef}
                    value={fontColor}
                    onChange={onFontColorSelect}
                />
            </ColorPickerWrapper>
            <Tooltip content={t.toolbar.inline_code}>
                <ToolbarButton
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
                    className={isCode ? "is-active" : ""}
                    title={t.toolbar.inline_code}
                >
                    <FaCode />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.link}>
                <ToolbarButton
                    onClick={insertLink}
                    className={isLink ? "is-active" : ""}
                    title={t.toolbar.link}
                >
                    <FaLink />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.image}>
                <ToolbarButton
                    onClick={insertImage}
                    title={t.toolbar.image}
                >
                    <FaImage />
                </ToolbarButton>
            </Tooltip>
            <Tooltip content={t.toolbar.collapsible}>
                <ToolbarButton
                    onClick={insertCollapsible}
                    title={t.toolbar.collapsible}
                >
                    <FaCaretDown />
                </ToolbarButton>
            </Tooltip>


            {/* Alignments Dropdown */}
            <ColorPickerWrapper ref={alignMenuRef}>
                <Tooltip content={t.toolbar.alignment}>
                    <ToolbarButton onClick={() => { updateMenuAlignment('align', alignMenuRef); setShowAlignMenu(!showAlignMenu); }} title={t.toolbar.alignment}>
                        <FaAlignLeft />
                    </ToolbarButton>
                </Tooltip>
                {showAlignMenu && (
                    <FormatMenu $rightAlign={menuAlignments.align} style={{ minWidth: '120px' }}>
                        <FormatOption onClick={() => { editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left"); setShowAlignMenu(false); }}>
                            <FaAlignLeft style={{ marginRight: '8px' }} /> {t.toolbar.align.left}
                        </FormatOption>
                        <FormatOption onClick={() => { editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center"); setShowAlignMenu(false); }}>
                            <FaAlignCenter style={{ marginRight: '8px' }} /> {t.toolbar.align.center}
                        </FormatOption>
                        <FormatOption onClick={() => { editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right"); setShowAlignMenu(false); }}>
                            <FaAlignRight style={{ marginRight: '8px' }} /> {t.toolbar.align.right}
                        </FormatOption>
                        <FormatOption onClick={() => { editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify"); setShowAlignMenu(false); }}>
                            <FaAlignJustify style={{ marginRight: '8px' }} /> {t.toolbar.align.justify}
                        </FormatOption>
                    </FormatMenu>
                )}
            </ColorPickerWrapper>


            <ColorPickerWrapper ref={lineHeightMenuRef}>
                <Tooltip content={t.toolbar.line_spacing}>
                    <ToolbarButton onClick={() => { updateMenuAlignment('lineHeight', lineHeightMenuRef); setShowLineHeightMenu(!showLineHeightMenu); }} title={t.toolbar.line_spacing}>
                        <RiLineHeight />
                    </ToolbarButton>
                </Tooltip>
                {showLineHeightMenu && (
                    <FormatMenu $rightAlign={menuAlignments.lineHeight}>
                        {LINE_H_OPTIONS.map(height => (
                            <FormatOption key={height} onClick={() => {
                                applyStyleText({ 'line-height': height });
                                setShowLineHeightMenu(false);
                            }}>
                                {height}
                            </FormatOption>
                        ))}
                    </FormatMenu>
                )}
            </ColorPickerWrapper>

            <ColorPickerWrapper ref={indentMenuRef}>
                <Tooltip content={t.toolbar.indent}>
                    <ToolbarButton onClick={() => { updateMenuAlignment('indent', indentMenuRef); setShowIndentMenu(!showIndentMenu); }} title={t.toolbar.indent}>
                        <RiIndentIncrease />
                    </ToolbarButton>
                </Tooltip>
                {showIndentMenu && (
                    <FormatMenu $rightAlign={menuAlignments.indent} style={{ minWidth: '140px' }}>
                        <FormatOption onClick={() => { editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined); setShowIndentMenu(false); }}>
                            <RiIndentIncrease style={{ marginRight: '8px' }} /> {t.toolbar.indent_options.indent}
                        </FormatOption>
                        <FormatOption onClick={() => { editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined); setShowIndentMenu(false); }}>
                            <RiIndentDecrease style={{ marginRight: '8px' }} /> {t.toolbar.indent_options.outdent}
                        </FormatOption>
                    </FormatMenu>
                )}
            </ColorPickerWrapper>

            {/* Insert Nodes */}
            {/* Table */}
            <div style={{ position: 'relative' }} ref={tableMenuRef}>
                <Tooltip content={t.toolbar.table}>
                    <ToolbarButton
                        onClick={() => { updateMenuAlignment('table', tableMenuRef); setShowTableMenu(!showTableMenu); }}
                        className={showTableMenu ? "is-active" : ""}
                    >
                        <FaTable />
                    </ToolbarButton>
                </Tooltip>

                {showTableMenu && (
                    <TableInsertMenu $rightAlign={menuAlignments.table}>
                        <MenuTitle>{t.toolbar.table_menu.title}</MenuTitle>
                        <InputGroup>
                            <label>{t.toolbar.table_menu.rows}</label>
                            <input
                                type="number"
                                value={tableConfig.rows}
                                onChange={(e) => setTableConfig({ ...tableConfig, rows: e.target.value })}
                                min="1"
                            />
                        </InputGroup>
                        <InputGroup>
                            <label>{t.toolbar.table_menu.columns}</label>
                            <input
                                type="number"
                                value={tableConfig.columns}
                                onChange={(e) => setTableConfig({ ...tableConfig, columns: e.target.value })}
                                min="1"
                            />
                        </InputGroup>
                        <CheckboxGroup>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={tableConfig.headerRow}
                                    onChange={(e) => setTableConfig({ ...tableConfig, headerRow: e.target.checked })}
                                />
                                {t.toolbar.table_menu.header_row}
                            </label>
                        </CheckboxGroup>
                        <CheckboxGroup>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={tableConfig.headerColumn}
                                    onChange={(e) => setTableConfig({ ...tableConfig, headerColumn: e.target.checked })}
                                />
                                {t.toolbar.table_menu.header_column}
                            </label>
                        </CheckboxGroup>
                        <CreateButton onClick={insertTable}>{t.toolbar.table_menu.create}</CreateButton>
                    </TableInsertMenu>
                )}
            </div>
            <Tooltip content={t.toolbar.horizontal_rule}>
                <ToolbarButton
                    onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
                    title={t.toolbar.horizontal_rule}
                >
                    <FaMinus />
                </ToolbarButton>
            </Tooltip>

            {/* Utility */}
            <Tooltip content={t.toolbar.clear}>
                <ToolbarButton
                    onClick={() => editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)}
                    title={t.toolbar.clear}
                >
                    <FaEraser />
                </ToolbarButton>
            </Tooltip>

            {/* App Actions */}
            {props.onSave && (
                <Tooltip content={props.saveLabel || "Save"}>
                    <ToolbarButton
                        onClick={props.onSave}
                        title={props.saveLabel || "Save"}
                        disabled={props.saveDisabled}
                        style={{ opacity: props.saveDisabled ? 0.5 : 1, cursor: props.saveDisabled ? 'not-allowed' : 'pointer' }}
                    >
                        <FiSave size={16} />
                    </ToolbarButton>
                </Tooltip>
            )}
            {props.onExit && (
                <Tooltip content={props.exitLabel || "Exit"}>
                    <ToolbarButton onClick={props.onExit} title={props.exitLabel || "Exit"}>
                        <FiX size={16} />
                    </ToolbarButton>
                </Tooltip>
            )}
            {props.onDelete && (
                <Tooltip content={props.deleteLabel || "Delete"}>
                    <ToolbarButton onClick={props.onDelete} title={props.deleteLabel || "Delete"} style={{ color: '#d32f2f' }}>
                        <FiTrash2 size={16} />
                    </ToolbarButton>
                </Tooltip>
            )}
        </ToolbarContainer>
    );

    if (portalTarget) {
        return createPortal(toolbarContent, portalTarget);
    }

    return toolbarContent;
}
