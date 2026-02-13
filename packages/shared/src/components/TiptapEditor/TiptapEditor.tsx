import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import styled from 'styled-components';
import { useLanguage } from '../../i18n';
import { FaBold, FaItalic, FaStrikethrough, FaCode, FaListUl, FaListOl, FaQuoteRight } from 'react-icons/fa';

const EditorWrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.colors?.border || '#ccc'};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors?.surface || '#fff'};
  min-height: 300px;
  display: flex;
  flex-direction: column;

  .ProseMirror {
    flex: 1;
    outline: none;
    padding: 1rem;
    font-family: inherit;
    line-height: 1.6;
    color: ${({ theme }) => theme.colors?.text || '#333'};

    p {
      margin-bottom: 1em;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.25;
    }

    h1 { font-size: 2em; border-bottom: 1px solid ${({ theme }) => theme.colors?.border || '#eee'}; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid ${({ theme }) => theme.colors?.border || '#eee'}; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }

    ul, ol {
      padding-left: 2em;
      margin-bottom: 1em;
    }

    blockquote {
      border-left: 4px solid ${({ theme }) => theme.colors?.border || '#dfe2e5'};
      padding-left: 1em;
      color: ${({ theme }) => theme.colors?.textSecondary || '#6a737d'};
      margin-left: 0;
      margin-right: 0;
    }

    pre {
      background: ${({ theme }) => theme.colors?.background || '#f6f8fa'};
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    code {
      background: ${({ theme }) => theme.colors?.background || 'rgba(175, 184, 193, 0.2)'};
      padding: 0.2em 0.4em;
      border-radius: 6px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }

    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: ${({ theme }) => theme.colors?.border || '#e1e4e8'};
      border: 0;
    }
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors?.border || '#ccc'};
  background: ${({ theme }) => theme.colors?.background || '#f9f9f9'};
  flex-wrap: wrap;
  align-items: center;
`;

const ToolbarButton = styled.button`
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.colors?.text || '#333'};
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;

  &:hover {
    background: ${({ theme }) => theme.colors?.border || '#eee'};
  }

  &.is-active {
    background: ${({ theme }) => theme.colors?.primary || '#007bff'}20;
    color: ${({ theme }) => theme.colors?.primary || '#007bff'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ToolbarGroup = styled.div`
  display: flex;
  gap: 2px;
  padding-right: 8px;
  margin-right: 8px;
  border-right: 1px solid ${({ theme }) => theme.colors?.border || '#eee'};
  
  &:last-child {
    border-right: none;
    padding-right: 0;
    margin-right: 0;
  }
`;

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string; // 스타일 확장을 위해
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({ value, onChange, className }) => {
  const { t } = useLanguage(); // 다국어 지원 (선택사항)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: value, // 초기값 설정
    onUpdate: ({ editor }) => {
      // 마크다운으로 변환하여 부모에게 전달
      const markdown = (editor.storage as any).markdown.getMarkdown();
      onChange(markdown);
    },
    onCreate: ({ editor }) => {
      // 초기 로딩 시 마크다운 설정 (필요한 경우)
      // content prop이 잘 동작하면 생략 가능
    }
  });

  // 외부에서 value가 변경되었을 때 (초기 로딩 이후) 에디터 내용 업데이트
  // 단, 타이핑 중 커서 튐 방지를 위해 신중하게 처리해야 함
  useEffect(() => {
    if (editor && value && !editor.getText().trim()) {
      // 에디터가 비어있고 value가 있으면 (초기 로딩 시 버그 방지)
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <EditorWrapper className={className}>
      <Toolbar>
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold"
          >
            <FaBold />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic"
          >
            <FaItalic />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            title="Strike"
          >
            <FaStrikethrough />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            title="Heading 3"
          >
            H3
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Bullet List"
          >
            <FaListUl />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Ordered List"
          >
            <FaListOl />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'is-active' : ''}
            title="Code"
          >
            <FaCode />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Quote"
          >
            <FaQuoteRight />
          </ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
      <EditorContent editor={editor} />
    </EditorWrapper>
  );
};
