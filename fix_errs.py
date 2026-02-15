
import os
import re

APPS = [
    'apps/LLMemo/src/components/Editor/MarkdownView.tsx',
    'apps/WordMemo/src/components/Editor/MarkdownView.tsx',
    'apps/DailyMemo/src/components/Editor/MarkdownView.tsx',
    'apps/BookMemo/src/components/Editor/MarkdownView.tsx',
    'apps/HandMemo/src/components/Editor/MarkdownView.tsx'
]

def fix_err_usage(path):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()

    # Replace catch (err) { } where err is not used
    # Also replace .catch(err => { }) where err is not used
    
    # regex for empty catch blocks using err
    content = re.sub(r'\} catch \(err\) \{ \}', r'} catch (e) { }', content)
    
    # regex for .catch(err => { })
    content = re.sub(r'\.catch\(err => \{ \}\)', r'.catch(() => { })', content)
    
    # Just in case there are variations
    content = re.sub(r'\} catch\(err\)\{ \}', r'} catch (e) { }', content)
    content = re.sub(r'\.catch\(err=>\{\}\)', r'.catch(() => { })', content)

    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed err usage in {path}")

for app in APPS:
    fix_err_usage(app)
