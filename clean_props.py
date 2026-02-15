
import os
import re

APPS = [
    'apps/LLMemo/src/components/Editor/MarkdownView.tsx',
    'apps/WordMemo/src/components/Editor/MarkdownView.tsx',
    'apps/DailyMemo/src/components/Editor/MarkdownView.tsx',
    'apps/BookMemo/src/components/Editor/MarkdownView.tsx',
    'apps/HandMemo/src/components/Editor/MarkdownView.tsx'
]

def remove_unused_props(path):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()

    # Remove wordTitle, studyMode, from destructuring but keep in interface
    # Pattern: wordTitle,\s+studyMode,
    
    # Check if destructuring has them
    if "wordTitle," in content:
        content = content.replace("wordTitle,", "")
    if "studyMode," in content:
        content = content.replace("studyMode,", "")
    
    # Clean up potential double commas or formatting
    content = content.replace(", ,", ",")
    content = content.replace("{\n  content,", "{ content,") # Optional: tighten up
    
    with open(path, 'w') as f:
        f.write(content)
    print(f"Removed unused prop destructuring from {path}")

for app in APPS:
    remove_unused_props(app)
