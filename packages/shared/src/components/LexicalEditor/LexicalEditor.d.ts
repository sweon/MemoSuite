import React from "react";
import { ToolbarButton } from "./plugins/ToolbarPlugin";
export { ToolbarButton };
export interface LexicalEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
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
export declare const LexicalEditor: React.FC<LexicalEditorProps>;
