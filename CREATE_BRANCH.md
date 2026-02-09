# Create improvements branch

Run these commands in PowerShell from the project root (`c:\Projects\clip-tag`):

## 1. Fix git ownership (if needed)

If you get "dubious ownership" error:

```powershell
git config --global --add safe.directory C:/Projects/clip-tag
```

Or use local config:

```powershell
git config --local --add safe.directory C:/Projects/clip-tag
```

## 2. Check current status

```powershell
git status
```

If you have uncommitted changes, commit them first:

```powershell
git add .
git commit -m "Working version: video proxy with Bunny.net support"
```

## 3. Create and switch to improvements branch

```powershell
git checkout -b improvements
```

Or if you want a more descriptive name:

```powershell
git checkout -b feature/improvements
```

## 4. Verify you're on the new branch

```powershell
git branch
```

You should see `* improvements` (or `* feature/improvements`) indicating you're on the new branch.

## 5. Push the branch to GitHub (optional)

```powershell
git push -u origin improvements
```

---

**To switch back to main/master:**

```powershell
git checkout main
```

**To switch back to improvements:**

```powershell
git checkout improvements
```

**To see all branches:**

```powershell
git branch -a
```
