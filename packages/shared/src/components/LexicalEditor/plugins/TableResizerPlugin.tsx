import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getNearestNodeFromDOMNode,
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_LOW,
    LexicalEditor,
} from "lexical";
import { $isTableCellNode, TableCellNode } from "@lexical/table";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

const ResizerHandle = styled.div`
  position: fixed;
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  z-index: 10;
  
  &:hover {
    background-color: #007bff;
  }
`;

export function TableResizerPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    const [resizerPos, setResizerPos] = useState<{ left: number; top: number; height: number; cellKey: string } | null>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);
    const activeCellKey = useRef<string | null>(null);

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            if (isDragging.current) return;

            const target = event.target as HTMLElement;
            const cell = target.closest('td, th');

            if (cell) {
                const rect = cell.getBoundingClientRect();
                const diff = Math.abs(event.clientX - rect.right);

                if (diff < 5) {
                    editor.update(() => {
                        const node = $getNearestNodeFromDOMNode(cell);
                        if ($isTableCellNode(node)) {
                            setResizerPos({
                                left: rect.right - 2,
                                top: rect.top,
                                height: rect.height,
                                cellKey: node.getKey()
                            });
                        }
                    });
                } else {
                    setResizerPos(null);
                }
            } else {
                setResizerPos(null);
            }
        };

        const rootElement = editor.getRootElement();
        if (rootElement) {
            rootElement.addEventListener('mousemove', onMouseMove);
            window.addEventListener('scroll', () => setResizerPos(null), true);
            return () => {
                rootElement.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('scroll', () => setResizerPos(null), true);
            };
        }
    }, [editor]);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!resizerPos) return;
        e.preventDefault();
        isDragging.current = true;
        startX.current = e.clientX;
        activeCellKey.current = resizerPos.cellKey;

        editor.update(() => {
            const node = editor.getElementByKey(resizerPos.cellKey);
            if (node) {
                startWidth.current = node.getBoundingClientRect().width;
            }
        });

        const onMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener('mousemove', onDragging);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onDragging = (event: MouseEvent) => {
            if (!isDragging.current || !activeCellKey.current) return;

            const delta = event.clientX - startX.current;
            const newWidth = Math.max(40, startWidth.current + delta);

            editor.update(() => {
                const node = editor.getElementByKey(activeCellKey.current!);
                const lexicalNode = $getNearestNodeFromDOMNode(node!);
                if ($isTableCellNode(lexicalNode)) {
                    lexicalNode.setWidth(newWidth);
                }
            });
        };

        document.addEventListener('mousemove', onDragging);
        document.addEventListener('mouseup', onMouseUp);
    };

    if (!resizerPos) return null;

    return ReactDOM.createPortal(
        <ResizerHandle
            style={{
                left: resizerPos.left,
                top: resizerPos.top,
                height: resizerPos.height,
            }}
            onMouseDown={onMouseDown}
        />,
        document.body
    );
}
