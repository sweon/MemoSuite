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
  ...props
}) => {
  // initialScrollPercentage is not yet supported in TiptapEditor
  const { initialScrollPercentage: _ } = props as any;

  return (
    <TiptapEditor value={value} onChange={onChange} />
  );
};