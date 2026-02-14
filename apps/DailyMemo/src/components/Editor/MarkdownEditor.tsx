import React from 'react';
import { LexicalEditor } from '@memosuite/shared';

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
  fontSize
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
    />
  );
};