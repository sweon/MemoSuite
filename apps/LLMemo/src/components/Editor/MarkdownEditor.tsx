import React from 'react';
import { TiptapEditor } from '@memosuite/shared';

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
  // initialScrollPercentage is not yet supported in TiptapEditor

  return (
    <TiptapEditor value={value} onChange={onChange} />
  );
};