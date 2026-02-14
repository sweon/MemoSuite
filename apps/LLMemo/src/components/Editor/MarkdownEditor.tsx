import React from 'react';
import { LexicalEditor } from '@memosuite/shared';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  initialScrollPercentage?: number;
  onToggleSidebar?: () => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  initialScrollPercentage,
  onToggleSidebar
}) => {
  return (
    <LexicalEditor
      value={value}
      onChange={onChange}
      initialScrollPercentage={initialScrollPercentage}
      onToggleSidebar={onToggleSidebar}
    />
  );
};