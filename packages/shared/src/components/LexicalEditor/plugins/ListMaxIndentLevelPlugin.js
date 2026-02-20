import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $getSelection, $isRangeSelection, INDENT_CONTENT_COMMAND, COMMAND_PRIORITY_LOW, } from "lexical";
import { $isListItemNode, $isListNode } from "@lexical/list";
export function ListMaxIndentLevelPlugin({ maxDepth }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerCommand(INDENT_CONTENT_COMMAND, () => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return false;
            }
            const nodes = selection.getNodes();
            for (const node of nodes) {
                const listItem = $getNearestListItemNode(node);
                if (listItem !== null) {
                    const depth = getElementDepth(listItem);
                    if (depth >= maxDepth) {
                        return true;
                    }
                }
            }
            return false;
        }, COMMAND_PRIORITY_LOW);
    }, [editor, maxDepth]);
    return null;
}
function $getNearestListItemNode(node) {
    let parent = node;
    while (parent !== null) {
        if ($isListItemNode(parent)) {
            return parent;
        }
        parent = parent.getParent();
    }
    return null;
}
function getElementDepth(node) {
    let depth = 0;
    let parent = node.getParent();
    while (parent !== null) {
        if ($isListNode(parent)) {
            depth++;
        }
        parent = parent.getParent();
    }
    return depth;
}
