import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { COMMAND_PRIORITY_EDITOR, $getSelection, $isRangeSelection } from "lexical";
import { useEffect } from "react";
import { $createPageBreakNode, INSERT_PAGE_BREAK_COMMAND } from "../nodes/PageBreakNode";

export function PageBreakPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            INSERT_PAGE_BREAK_COMMAND,
            () => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) {
                    return false;
                }
                const focusNode = selection.focus.getNode();
                if (focusNode !== null) {
                    const pbNode = $createPageBreakNode();
                    $insertNodeToNearestRoot(pbNode);
                    // Force an update to trigger sync
                    editor.update(() => { });
                }
                return true;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor]);

    return null;
}
