
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_CRITICAL,
    SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
    TableCellNode,
    TableNode,
    $insertTableRowAtSelection,
    $insertTableColumnAtSelection,
    $deleteTableRowAtSelection,
    $deleteTableColumnAtSelection,
} from "@lexical/table";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { FiTrash2 } from "react-icons/fi";
import {
    RiInsertRowTop,
    RiInsertRowBottom,
    RiInsertColumnLeft,
    RiInsertColumnRight,
    RiDeleteBin6Line,
    RiTable2
} from "react-icons/ri";

const MenuWrapper = styled.div`
  position: fixed;
  z-index: 10001;
  background: ${props => props.theme.colors?.surface || "#fff"};
  border: 1px solid ${props => props.theme.colors?.border || "#eee"};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  gap: 2px;
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
  text-align: left;
  border-radius: 4px;
  font-size: 13px;
  color: ${props => props.theme.colors?.text || "#333"};
  transition: background 0.1s ease;

  &:hover {
    background: #f4f4f4;
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${props => props.theme.colors?.textSecondary || "#666"};
  }

  &.danger {
    color: #e53e3e;
    svg {
      color: #e53e3e;
    }
    &:hover {
      background: #fff5f5;
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${props => props.theme.colors?.border || "#eee"};
  margin: 4px 0;
`;

const TriggerButton = styled.button`
  position: fixed;
  z-index: 10000;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: #666;

  &:hover {
    background: #f0f2f5;
    color: #000;
  }
`;

export function TableActionMenuPlugin(): React.ReactNode {
    const [editor] = useLexicalComposerContext();
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [triggerPos, setTriggerPos] = useState<{ top: number; left: number; cellKey: string } | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const updateTrigger = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const node = selection.anchor.getNode();
                const cell = $getNearestNodeOfType(node, TableCellNode);

                if (cell) {
                    const domElement = editor.getElementByKey(cell.getKey());
                    if (domElement) {
                        const rect = domElement.getBoundingClientRect();
                        setTriggerPos({
                            top: rect.top + 4,
                            left: rect.right - 24,
                            cellKey: cell.getKey()
                        });
                        return;
                    }
                }
            }
            setTriggerPos(null);
            setShowMenu(false);
        });
    }, [editor]);

    useEffect(() => {
        const handleScroll = () => {
            setTriggerPos(null);
            setShowMenu(false);
        };

        window.addEventListener('scroll', handleScroll, true);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(() => {
                updateTrigger();
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateTrigger();
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL
            )
        );
    }, [editor, updateTrigger]);

    const onTriggerClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (triggerPos) {
            setMenuPos({
                top: triggerPos.top + 24,
                left: triggerPos.left - 136
            });
            setShowMenu(true);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const insertRowAbove = () => {
        editor.update(() => {
            $insertTableRowAtSelection(false);
        });
        setShowMenu(false);
    };

    const insertRowBelow = () => {
        editor.update(() => {
            $insertTableRowAtSelection(true);
        });
        setShowMenu(false);
    };

    const insertColumnLeft = () => {
        editor.update(() => {
            $insertTableColumnAtSelection(false);
        });
        setShowMenu(false);
    };

    const insertColumnRight = () => {
        editor.update(() => {
            $insertTableColumnAtSelection(true);
        });
        setShowMenu(false);
    };

    const deleteRow = () => {
        editor.update(() => {
            $deleteTableRowAtSelection();
        });
        setShowMenu(false);
    };

    const deleteColumn = () => {
        editor.update(() => {
            $deleteTableColumnAtSelection();
        });
        setShowMenu(false);
    };

    const deleteTable = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const node = selection.anchor.getNode();
                const table = $getNearestNodeOfType(node, TableNode);
                if (table) {
                    table.remove();
                }
            }
        });
        setShowMenu(false);
    };

    return (
        <>
            {triggerPos && (
                <TriggerButton
                    style={{ top: triggerPos.top, left: triggerPos.left }}
                    onClick={onTriggerClick}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <RiTable2 size={14} />
                </TriggerButton>
            )}
            {showMenu && menuPos && createPortal(
                <MenuWrapper
                    ref={menuRef}
                    style={{ top: menuPos.top, left: menuPos.left }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <MenuItem onClick={insertRowAbove}>
                        <RiInsertRowTop /> Insert Row Above
                    </MenuItem>
                    <MenuItem onClick={insertRowBelow}>
                        <RiInsertRowBottom /> Insert Row Below
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={insertColumnLeft}>
                        <RiInsertColumnLeft /> Insert Column Left
                    </MenuItem>
                    <MenuItem onClick={insertColumnRight}>
                        <RiInsertColumnRight /> Insert Column Right
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={deleteRow} className="danger">
                        <RiDeleteBin6Line /> Delete Row
                    </MenuItem>
                    <MenuItem onClick={deleteColumn} className="danger">
                        <RiDeleteBin6Line /> Delete Column
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={deleteTable} className="danger">
                        <FiTrash2 /> Delete Table
                    </MenuItem>
                </MenuWrapper>,
                document.body
            )}
        </>
    );
}
