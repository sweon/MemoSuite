
import os
import re

APPS = [
    'apps/LLMemo/src/components/Editor/MarkdownView.tsx',
    'apps/WordMemo/src/components/Editor/MarkdownView.tsx',
    'apps/DailyMemo/src/components/Editor/MarkdownView.tsx',
    'apps/BookMemo/src/components/Editor/MarkdownView.tsx',
    'apps/HandMemo/src/components/Editor/MarkdownView.tsx'
]

def fix_markdown_view(path):
    with open(path, 'r') as f:
        content = f.read()

    # 1. Remove duplicate declarations
    # The script previously injected it twice.
    content = re.sub(r"const YT_PLAYERS = new Map<string, any>\(\);\s+let ACTIVE_YT_VIDEO_ID: string \| null = null;", "", content)
    
    # Re-inject it once before YouTubePlayer
    if "const YT_PLAYERS = new Map" not in content:
        yt_pos = content.find("const YouTubePlayer")
        if yt_pos != -1:
            content = content[:yt_pos] + "const YT_PLAYERS = new Map<string, any>();\nlet ACTIVE_YT_VIDEO_ID: string | null = null;\n\n" + content[yt_pos:]

    # 2. Fix YouTubePlayer unused variables
    content = content.replace("const [isStarted, setIsStarted] = React.useState(false);", "")
    
    # 3. Fix MarkdownViewProps and destructuring
    if "interface MarkdownViewProps {" in content:
        if "isComment?: boolean;" not in content:
            content = content.replace("isReadOnly?: boolean;", "isReadOnly?: boolean;\n  isComment?: boolean;")
    
    if "export const MarkdownView: React.FC<MarkdownViewProps> = ({" in content:
        if "isComment = false" not in content:
            content = content.replace("isReadOnly = false,", "isReadOnly = false,\n  isComment = false,")

    # 4. Fix unused catch variables
    content = content.replace("} catch (err) { return <a href={href} {...props}>{children}</a>; }", "} catch (e) { return <a href={href} {...props}>{children}</a>; }")
    content = content.replace("} catch (err) { return <img src={src} alt={alt} style={{ maxWidth: '100%' }} />; }", "} catch (e) { return <img src={src} alt={alt} style={{ maxWidth: '100%' }} />; }")
    content = content.replace("} catch (err) { return <pre {...props}>{children}</pre>; }", "} catch (e) { return <pre {...props}>{children}</pre>; }")
    content = content.replace("} catch (err) { return <code className={className} {...props}>{children}</code>; }", "} catch (e) { return <code className={className} {...props}>{children}</code>; }")

    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed {path}")

def fix_toolbar_plugin():
    path = 'packages/shared/src/components/LexicalEditor/plugins/ToolbarPlugin.tsx'
    if os.path.exists(path):
        with open(path, 'r') as f:
            content = f.read()
        content = content.replace(", isYouTubeUrl", "")
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed {path}")

for app in APPS:
    fix_markdown_view(app)

fix_toolbar_plugin()
