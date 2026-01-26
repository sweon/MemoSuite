---
description: Automatically push to GitHub when mobile or Android issues are addressed.
---

1. When the user mentions "Android" or "mobile" in their request, specifically regarding UI/UX fixes or adjustments.
2. After implementing the requested code changes.
3. Automatically run the git push sequence without asking for further confirmation.

// turbo-all
4. Run `git status` to check for changes.
5. Run `git add .` (or specific files)
6. Run `git commit -m "Fix mobile/Android issue: [Brief description of change]"`
7. Run `git push`
