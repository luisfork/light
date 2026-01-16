# Git and GitHub Guide

A comprehensive guide to using Git and resolving common issues.

## Table of Contents

- [Basic Git Workflow](#basic-git-workflow)
- [Common Commands](#common-commands)
- [Resolving Common Issues](#resolving-common-issues)
- [GitHub Operations](#github-operations)
- [Best Practices](#best-practices)

## Basic Git Workflow

### Initialize a Repository

```bash
# Create a new repository
git init

# Clone an existing repository
git clone https://github.com/username/repository.git
```

### Making Changes

```bash
# Check status of your working directory
git status

# Stage specific files
git add file1.txt file2.js

# Stage all changes
git add .

# Commit with a message
git commit -m "Your descriptive commit message"
```

### Syncing with Remote

```bash
# Pull latest changes
git pull origin main

# Push your commits
git push origin main
```

## Common Commands

### Viewing History

```bash
# View commit history
git log

# View concise history
git log --oneline

# View changes in a file
git log -p filename.txt

# View who changed what
git blame filename.txt
```

### Branching

```bash
# List branches
git branch

# Create a new branch
git branch feature-name

# Switch to a branch
git checkout feature-name

# Create and switch in one command
git checkout -b feature-name

# Delete a branch
git branch -d feature-name
```

### Viewing Changes

```bash
# See unstaged changes
git diff

# See staged changes
git diff --cached

# See changes between branches
git diff main..feature-branch
```

## Resolving Common Issues

### Issue 1: Divergent Branches

**Problem:** Local and remote branches have different commits.

```text
hint: You have divergent branches and need to specify how to reconcile them.
```

**Solutions:**

```bash
# Option 1: Rebase (recommended for cleaner history)
git pull --rebase origin main

# Option 2: Merge (preserves all history)
git pull --no-rebase origin main

# Option 3: Fast-forward only (fails if not possible)
git pull --ff-only origin main

# Set default behavior
git config pull.rebase true  # Use rebase by default
```

### Issue 2: Rejected Push

**Problem:** Remote has changes you don't have locally.

```text
! [rejected] main -> main (non-fast-forward)
error: failed to push some refs
```

**Solution:**

```bash
# Pull remote changes first
git pull --rebase origin main

# Then push
git push origin main
```

### Issue 3: Merge Conflicts

**Problem:** Git can't automatically merge changes.

```text
CONFLICT (content): Merge conflict in filename.txt
```

**Solution:**

```bash
# 1. Open the conflicted file and look for conflict markers:
#    <<<<<<< HEAD
#    Your changes
#    =======
#    Their changes
#    >>>>>>> branch-name

# 2. Edit the file to resolve conflicts

# 3. Stage the resolved file
git add filename.txt

# 4. Continue the merge/rebase
git rebase --continue  # if rebasing
git commit             # if merging

# Or abort if you want to start over
git rebase --abort
git merge --abort
```

### Issue 4: Accidentally Committed Wrong Files

**Solutions:**

```bash
# Undo last commit but keep changes
git reset --soft HEAD~1

# Undo last commit and discard changes (careful!)
git reset --hard HEAD~1

# Remove file from staging area
git restore --staged filename.txt

# Discard changes in working directory
git restore filename.txt
```

### Issue 5: Need to Change Last Commit Message

```bash
# Change the most recent commit message
git commit --amend -m "New commit message"

# If already pushed (use with caution)
git push --force-with-lease origin main
```

### Issue 6: Accidentally Committed to Wrong Branch

```bash
# 1. Note the commit hash
git log -1

# 2. Switch to correct branch
git checkout correct-branch

# 3. Cherry-pick the commit
git cherry-pick <commit-hash>

# 4. Switch back and remove from wrong branch
git checkout wrong-branch
git reset --hard HEAD~1
```

### Issue 7: Lost Commits

```bash
# View all actions (even deleted commits)
git reflog

# Recover a lost commit
git checkout <commit-hash>
git cherry-pick <commit-hash>
```

### Issue 8: Detached HEAD State

**Problem:** You're not on any branch.

**Solution:**

```bash
# Create a new branch from current position
git checkout -b new-branch-name

# Or discard and go back to a branch
git checkout main
```

## GitHub Operations

### Setting Up Remote

```bash
# Add remote repository
git remote add origin https://github.com/username/repo.git

# View remotes
git remote -v

# Change remote URL
git remote set-url origin https://github.com/username/new-repo.git
```

### Working with Pull Requests

```bash
# Create a feature branch
git checkout -b feature/new-feature

# Push to GitHub
git push -u origin feature/new-feature

# After PR is merged, update local main
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/new-feature

# Delete remote feature branch
git push origin --delete feature/new-feature
```

### Keeping Fork Updated

```bash
# Add upstream remote (original repository)
git remote add upstream https://github.com/original/repo.git

# Fetch upstream changes
git fetch upstream

# Merge upstream changes into your main
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

## Best Practices

### Commit Messages

```bash
# Good commit messages:
git commit -m "Add user authentication feature"
git commit -m "Fix null pointer exception in calculator"
git commit -m "Update dependencies to latest versions"

# Use conventional commits format:
# feat: A new feature
# fix: A bug fix
# docs: Documentation changes
# style: Code style changes (formatting, etc.)
# refactor: Code refactoring
# test: Adding or updating tests
# chore: Maintenance tasks
```

### Branch Naming

```bash
# Use descriptive names:
feature/user-authentication
bugfix/calculation-error
hotfix/security-vulnerability
docs/api-documentation
```

### Workflow Tips

1. **Commit frequently**: Small, logical commits are easier to review and revert
2. **Pull before push**: Always pull latest changes before pushing
3. **Review before commit**: Use `git diff` to review changes before staging
4. **Don't commit sensitive data**: Use `.gitignore` for secrets, credentials, etc.
5. **Write descriptive messages**: Future you will thank present you
6. **Use branches**: Keep main/master stable, develop features in branches
7. **Test before committing**: Ensure code works before committing

### .gitignore

```bash
# Create a .gitignore file to exclude files:
# Environment variables
.env
.env.local

# Dependencies
node_modules/
__pycache__/
*.pyc

# Build outputs
dist/
build/
*.log

# IDE files
.vscode/
.idea/
*.swp

# OS files
.DS_Store
Thumbs.db
```

## Quick Reference

```bash
# Status and info
git status              # Check working directory status
git log                 # View commit history
git diff                # View changes

# Staging and committing
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git commit --amend      # Modify last commit

# Syncing
git pull                # Fetch and merge from remote
git push                # Push to remote
git fetch               # Download remote changes without merging

# Branches
git branch              # List branches
git checkout -b name    # Create and switch to branch
git merge branch-name   # Merge branch into current

# Undoing
git restore file        # Discard working directory changes
git restore --staged    # Unstage file
git reset --soft HEAD~1 # Undo last commit, keep changes
git reset --hard HEAD~1 # Undo last commit, discard changes

# Remote
git remote -v           # List remotes
git clone url           # Clone repository
git push -u origin main # Push and set upstream
```

## Getting Help

```bash
# Get help for any command
git help <command>
git <command> --help

# Examples:
git help commit
git push --help
```

## Resources

- [Official Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Oh Shit, Git!?!](https://ohshitgit.com/) - Fixing common mistakes
