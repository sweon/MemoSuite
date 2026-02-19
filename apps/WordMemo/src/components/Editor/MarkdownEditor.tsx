import React from 'react';
import { LexicalEditor, ToolbarButton } from '@memosuite/shared';
export { ToolbarButton };

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    initialScrollPercentage?: number;
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
    onToggleSidebar?: () => void;
    customButtons?: React.ReactNode;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    initialScrollPercentage,
    spellCheck,
    markdownShortcuts,
    autoLink,
    tabIndentation,
    tabSize,
    fontSize,
    onSave,
    onExit,
    onDelete,
    saveLabel,
    exitLabel,
    deleteLabel,
    saveDisabled,
    stickyOffset,
    onToggleSidebar,
    customButtons
}) => {
    return (
        <LexicalEditor
            value={value}
            onChange={onChange}
            initialScrollPercentage={initialScrollPercentage}
            spellCheck={spellCheck}
            markdownShortcuts={markdownShortcuts}
            autoLink={autoLink}
            tabIndentation={tabIndentation}
            tabSize={tabSize}
            fontSize={fontSize}
            onSave={onSave}
            onExit={onExit}
            onDelete={onDelete}
            saveLabel={saveLabel}
            exitLabel={exitLabel}
            deleteLabel={deleteLabel}
            saveDisabled={saveDisabled}
            stickyOffset={stickyOffset}
            onToggleSidebar={onToggleSidebar}
            customButtons={customButtons}
        />
    );
};
