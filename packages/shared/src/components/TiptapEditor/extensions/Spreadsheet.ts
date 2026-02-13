import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SpreadsheetComponent from './SpreadsheetComponent';

export interface SpreadsheetOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        spreadsheet: {
            setSpreadsheet: (attributes?: { data?: string }) => ReturnType;
        }
    }
}

export const Spreadsheet = Node.create<SpreadsheetOptions>({
    name: 'spreadsheet',

    priority: 1100,

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            data: {
                default: '',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="spreadsheet"]',
                getAttrs: (node: HTMLElement) => ({
                    data: node.getAttribute('data-data') || '',
                }),
                priority: 1100,
            },
            {
                tag: 'pre',
                getAttrs: (node: HTMLElement) => {
                    const code = node.querySelector('code');
                    if (code && code.classList.contains('language-spreadsheet')) {
                        return { data: code.textContent?.trim() };
                    }
                    return false;
                },
                priority: 1100,
            },
        ];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'spreadsheet' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(SpreadsheetComponent as any);
    },

    addStorage() {
        return {
            markdown: {
                serialize: (state: any, node: any) => {
                    state.write('```spreadsheet\n' + (node.attrs.data || '') + '\n```');
                    state.closeBlock(node);
                },
                parse: {
                    setup(markdownit: any) {
                        markdownit.use((md: any) => {
                            const originalFence = md.renderer.rules.fence;
                            md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, slf: any) => {
                                const token = tokens[idx];
                                if (token.info.trim() === 'spreadsheet') {
                                    const encodedData = token.content.trim()
                                        .replace(/&/g, '&amp;')
                                        .replace(/</g, '&lt;')
                                        .replace(/>/g, '&gt;')
                                        .replace(/"/g, '&quot;')
                                        .replace(/'/g, '&#039;');
                                    return `<div data-type="spreadsheet" data-data="${encodedData}"></div>`;
                                }
                                return originalFence ? originalFence(tokens, idx, options, env, slf) : '';
                            };
                        });
                    }
                }
            }
        };
    },

    addCommands() {
        return {
            setSpreadsheet: (attributes?: { data?: string }) => ({ commands }: { commands: any }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: attributes,
                });
            },
        };
    },
});
