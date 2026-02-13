import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import HandwritingComponent from './HandwritingComponent';

export interface HandwritingOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        handwriting: {
            setHandwriting: (attributes?: { data?: string }) => ReturnType;
        }
    }
}

export const Handwriting = Node.create<HandwritingOptions>({
    name: 'handwriting',

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
                tag: 'div[data-type="handwriting"]',
                getAttrs: (node: HTMLElement) => ({
                    data: node.getAttribute('data-data') || '',
                }),
                priority: 1100,
            },
            {
                tag: 'pre',
                getAttrs: (node: HTMLElement) => {
                    const code = node.querySelector('code');
                    if (code && code.classList.contains('language-fabric')) {
                        return { data: code.textContent?.trim() };
                    }
                    return false;
                },
                priority: 1100,
            },
        ];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'handwriting' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(HandwritingComponent as any);
    },

    addStorage() {
        return {
            markdown: {
                serialize: (state: any, node: any) => {
                    state.write('```fabric\n' + (node.attrs.data || '') + '\n```');
                    state.closeBlock(node);
                },
                parse: {
                    // Intercept 'fabric' code blocks during markdown parsing
                    setup(markdownit: any) {
                        markdownit.use((md: any) => {
                            const originalFence = md.renderer.rules.fence;
                            md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, slf: any) => {
                                const token = tokens[idx];
                                if (token.info.trim() === 'fabric') {
                                    // Transform to HTML that Tiptap's parseHTML will pick up
                                    const encodedData = token.content.trim()
                                        .replace(/&/g, '&amp;')
                                        .replace(/</g, '&lt;')
                                        .replace(/>/g, '&gt;')
                                        .replace(/"/g, '&quot;')
                                        .replace(/'/g, '&#039;');
                                    return `<div data-type="handwriting" data-data="${encodedData}"></div>`;
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
            setHandwriting: (attributes?: { data?: string }) => ({ commands }: { commands: any }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: attributes,
                });
            },
        };
    },
});
