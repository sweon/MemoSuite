import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, PASTE_COMMAND, DROP_COMMAND, $getSelection, $isRangeSelection, $createParagraphNode, $insertNodes, } from "lexical";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { $createYouTubeNode, isYouTubeUrl, extractYouTubeVideoId } from "../nodes/YouTubeNode";
/**
 * Extracts a URL from DataTransfer (paste/drop events).
 */
function extractUrlFromDataTransfer(dt) {
    // Try text/uri-list
    const uriList = dt.getData("text/uri-list");
    if (uriList) {
        const lines = uriList.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
        if (lines.length > 0)
            return lines[0];
    }
    // Try text/plain
    const plain = dt.getData("text/plain");
    if (plain && (plain.startsWith("http://") || plain.startsWith("https://"))) {
        return plain.trim();
    }
    // Try text/html — extract href from first anchor
    const html = dt.getData("text/html");
    if (html) {
        const match = /href="([^"]+)"/.exec(html);
        if (match && match[1])
            return match[1];
    }
    return null;
}
/**
 * Plugin: auto-detects YouTube URLs on paste/drop and inserts a YouTubeNode.
 */
export function YouTubePastePlugin() {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        // Handle PASTE
        const removePaste = editor.registerCommand(PASTE_COMMAND, (event) => {
            if (!event.clipboardData)
                return false;
            const url = extractUrlFromDataTransfer(event.clipboardData);
            if (!url || !isYouTubeUrl(url))
                return false;
            const info = extractYouTubeVideoId(url);
            if (!info)
                return false;
            event.preventDefault();
            editor.update(() => {
                const youtubeNode = $createYouTubeNode(info.videoId, info.startTimestamp, info.isShort, url);
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const after = $createParagraphNode();
                    $insertNodes([youtubeNode, after]);
                    after.select();
                }
                else {
                    $insertNodeToNearestRoot(youtubeNode);
                }
            });
            return true;
        }, COMMAND_PRIORITY_HIGH);
        // Handle DROP
        const removeDrop = editor.registerCommand(DROP_COMMAND, (event) => {
            if (!event.dataTransfer)
                return false;
            const url = extractUrlFromDataTransfer(event.dataTransfer);
            if (!url || !isYouTubeUrl(url))
                return false;
            const info = extractYouTubeVideoId(url);
            if (!info)
                return false;
            event.preventDefault();
            event.stopPropagation();
            editor.update(() => {
                const youtubeNode = $createYouTubeNode(info.videoId, info.startTimestamp, info.isShort, url);
                const after = $createParagraphNode();
                $insertNodeToNearestRoot(youtubeNode);
                youtubeNode.insertAfter(after);
                after.select();
            });
            return true;
        }, COMMAND_PRIORITY_HIGH);
        return () => {
            removePaste();
            removeDrop();
        };
    }, [editor]);
    return null;
}
