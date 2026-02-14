import React from 'react';
import { LexicalEditor } from '@memosuite/shared';

interface MarkdownEditorProps {
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
  saveDisabled?: boolean; // Add saveDisabled prop
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  className,
  placeholder,
  initialScrollPercentage,
  onToggleSidebar,
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
  saveDisabled // Destructure saveDisabled
}) => {
  return (
    <LexicalEditor
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      initialScrollPercentage={initialScrollPercentage}
      onToggleSidebar={onToggleSidebar}
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
      saveDisabled={saveDisabled} // Pass saveDisabled
    />
  );
};