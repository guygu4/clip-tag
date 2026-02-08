# Push this project to a new GitHub repo

Follow these steps to create a new repo on GitHub and push this project.

## 0. Initialize Git (if not already)

In a terminal, from the project root (`c:\Projects\clip-tag`):

```powershell
git init
git add .
git commit -m "Initial commit: clip-tag event tagging app"
```

If you already have a `.git` folder and commits, skip to step 1.

## 1. Create the repo on GitHub

- Go to **[github.com/new](https://github.com/new)** (log in if needed).
- **Repository name:** e.g. `clip-tag`.
- **Description (optional):** e.g. "Event tagging on video clips".
- Choose **Public** (or Private).
- **Do not** add a README, .gitignore, or license (this project already has them).
- Click **Create repository**.

## 2. Connect this folder and push

In a terminal, from the project root (`c:\Projects\clip-tag`):

```powershell
# Add GitHub as the remote (replace YOUR_USERNAME and clip-tag with your repo)
git remote add origin https://github.com/YOUR_USERNAME/clip-tag.git

# Push the main branch
git push -u origin main
```

If your default branch is `master` instead of `main`:

```powershell
git push -u origin master
```

Use your GitHub username and the repo name you chose in step 1. When prompted, sign in with your GitHub credentials or a personal access token.

## 3. (Optional) Use GitHub CLI instead

If you have [GitHub CLI](https://cli.github.com/) installed and logged in (`gh auth login`):

```powershell
gh repo create clip-tag --public --source=. --remote=origin --push
```

This creates the repo on GitHub and pushes in one step.
