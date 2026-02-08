# Remove the video file from Git history

GitHub rejects pushes that contain files over 100 MB (or sometimes 50 MB). If the video was ever committed, it stays in history until you rewrite history.

Run these in **PowerShell** from the project root (`c:\Projects\clip-tag`).

## Step 1: Remove the file from all commits

This rewrites history so the video is gone from every commit:

```powershell
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch frontend/public/bang.mp4" --prune-empty HEAD
```

If you had other video filenames committed (e.g. `sample.mp4`), run again with that path:

```powershell
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch frontend/public/sample.mp4" --prune-empty HEAD
```

## Step 2: Clean up and force push

```powershell
# Remove backup refs left by filter-branch
rm -r -Force .git/refs/original -ErrorAction SilentlyContinue
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push the rewritten history (replace main with your branch name if different)
git push --force origin main
```

## If you get "refs/original" errors

If Step 2 fails, run:

```powershell
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force origin main
```

## After this

- The video file will still exist on your disk in `frontend/public/` (and is ignored by `.gitignore`).
- GitHub will no longer have the file in any commit, so push will succeed.
- If anyone else has cloned the repo, they should re-clone or run `git fetch origin` and `git reset --hard origin/main` so their history matches.
