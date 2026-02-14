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
  fontSize
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
    />
  );
};