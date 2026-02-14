import React from 'react';
import { LexicalEditor } from '@memosuite/shared';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  initialScrollPercentage?: number;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  initialScrollPercentage
}) => {
  return (
    <LexicalEditor
      value={value}
      onChange={onChange}
      initialScrollPercentage={initialScrollPercentage}
    />
  );
};