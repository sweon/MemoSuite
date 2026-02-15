
import os
import re

APPS = [
    'apps/LLMemo/src/components/Editor/MarkdownView.tsx',
    'apps/WordMemo/src/components/Editor/MarkdownView.tsx',
    'apps/DailyMemo/src/components/Editor/MarkdownView.tsx',
    'apps/BookMemo/src/components/Editor/MarkdownView.tsx',
    'apps/HandMemo/src/components/Editor/MarkdownView.tsx'
]

def fix_all(path):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()

    if "const REMARK_PLUGINS =" not in content:
        imports = list(re.finditer(r'^import .*?$', content, re.MULTILINE))
        if imports:
            pos = imports[-1].end()
            content = content[:pos] + "\n\nconst REMARK_PLUGINS = [remarkMath, remarkGfm, remarkBreaks];\nconst REHYPE_PLUGINS = [rehypeRaw, rehypeKatex];" + content[pos:]

    def wrap_comp(text, comp_name, next_marker):
        if "const " + comp_name + " = React.memo(" in text:
            return text
        
        # Simpler search for the start line
        search_str = "const " + comp_name + " = ("
        start = text.find(search_str)
        if start != -1:
            end_search = text.find(next_marker, start)
            if end_search != -1:
                block = text[start:end_search]
                last_brace = block.rstrip().rfind("};")
                if last_brace != -1:
                    original_block = block[:last_brace+2]
                    wrapped_block = original_block.replace("const " + comp_name + " = (", "const " + comp_name + " = React.memo((")
                    wrapped_block = wrapped_block[:-2] + "});"
                    text = text[:start] + wrapped_block + text[start+len(original_block):]
        return text

    content = wrap_comp(content, "YouTubePlayer", "\n\nconst YoutubePlaylistView")
    content = wrap_comp(content, "YoutubePlaylistView", "\n\ninterface MarkdownViewProps")
    content = wrap_comp(content, "WebPreview", "\n\nconst YouTubePlayer")
    content = wrap_comp(content, "SpreadsheetPreview", "\n\nconst WebPreview")

    if "export const MarkdownView: React.FC<MarkdownViewProps> = React.memo" not in content:
        start_str = "export const MarkdownView: React.FC<MarkdownViewProps> = ("
        start = content.find(start_str)
        if start != -1:
            block = content[start:]
            last_brace = block.rstrip().rfind("};")
            if last_brace != -1:
                original_block = block[:last_brace+2]
                wrapped_block = original_block.replace(start_str, "export const MarkdownView: React.FC<MarkdownViewProps> = React.memo((")
                wrapped_block = wrapped_block[:-2] + "});"
                content = content[:start] + wrapped_block + block[last_brace+2:]

    content = content.replace("remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}", "remarkPlugins={REMARK_PLUGINS}")
    content = content.replace("rehypePlugins={[rehypeRaw, rehypeKatex]}", "rehypePlugins={REHYPE_PLUGINS}")

    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed {path}")

for app in APPS:
    fix_all(app)
