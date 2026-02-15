
import os
import re

APPS = [
    'apps/LLMemo/src/components/Editor/MarkdownView.tsx',
    'apps/WordMemo/src/components/Editor/MarkdownView.tsx',
    'apps/DailyMemo/src/components/Editor/MarkdownView.tsx',
    'apps/BookMemo/src/components/Editor/MarkdownView.tsx',
    'apps/HandMemo/src/components/Editor/MarkdownView.tsx'
]

def fix_wordmemo_props(path):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()

    # Add wordTitle and studyMode to props
    if "interface MarkdownViewProps {" in content:
        if "wordTitle?: string;" not in content:
            content = content.replace("memoId?: number;", "memoId?: number;\n  wordTitle?: string;\n  studyMode?: string;")
    
    if "export const MarkdownView: React.FC<MarkdownViewProps> = ({" in content:
        if "wordTitle," not in content:
            content = content.replace("memoId,", "memoId,\n  wordTitle,\n  studyMode,")

    # For WordMemo specifically, we might need more but let's see if this passes build first.
    # The build error was: Property 'wordTitle' does not exist on type 'IntrinsicAttributes & MarkdownViewProps'.
    
    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed props in {path}")

for app in APPS:
    fix_wordmemo_props(app)
