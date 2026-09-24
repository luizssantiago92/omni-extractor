# Git & GitHub reference

## Recovery (nothing is lost until gc)

| Lost what | Recover |
| --- | --- |
| Commits after bad reset/rebase | `git reflog` → `git branch rescue <sha>` |
| Deleted branch | `git reflog` (find tip) → `git branch <name> <sha>` |
| Dropped stash | `git fsck --no-reflogs \| Select-String commit` → `git show <sha>` → `git stash apply <sha>` |
| Bad merge (not pushed) | `git reset --hard ORIG_HEAD` (confirm with user) |
| Bad merge (pushed) | `git revert -m 1 <merge-sha>` |
| Pushed a bad commit on shared branch | `git revert <sha>` (never rewrite shared history) |

Before any `reset --hard`, `clean -fd`, or force-push: state what will be discarded and get user consent.

## History inspection

```powershell
git log --graph --oneline --decorate -20
git log origin/master..HEAD --oneline      # commits not yet in base
git log HEAD..origin/master --oneline      # commits you are missing
git diff origin/master...HEAD --stat       # PR-style diff (three dots = from merge-base)
git show <sha> --stat
git branch -vv                             # tracking + ahead/behind
```

## Branch hygiene

```powershell
git fetch --prune
git branch --merged origin/master          # safe to delete locally
git branch -d <branch>
git push origin --delete <branch>          # remote (confirm with user)
```

## Stash

```powershell
git stash push -m "wip: label" -- path/a path/b
git stash list
git stash pop            # or apply stash@{n}
```

## Selective staging

```powershell
git add -p <file>         # interactive hunks (needs TTY; avoid in agent shell)
git diff --cached         # verify exactly what will be committed
```

For partial staging without a TTY: write a patch (`git diff <file> > p.patch`), edit it, then `git apply --cached p.patch`.

## gh CLI cheatsheet

```powershell
gh auth status
gh repo view --json name,defaultBranchRef,url
gh pr list --state open
gh pr view <n> --json state,isDraft,mergeable,headRefName,baseRefName,url
gh pr checks <n>
gh pr diff <n> --name-only
gh pr ready <n>                               # draft → ready
gh pr edit <n> --title "…" --body @'…'@
gh pr merge <n> --squash --delete-branch      # only when the user asks
gh pr comment <n> --body "…"
gh api repos/{owner}/{repo}/pulls/<n>/comments   # review comments
gh run list --limit 5 ; gh run view <id> --log-failed
gh issue create --title "…" --body "…"
gh release create v1.2.0 --generate-notes
```

Merge strategy: prefer **squash** for feature branches with noisy history (also hides bad commit messages); **merge commit** when individual commits matter.

## Tags & releases

```powershell
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin v1.2.0
```

Bump `extension/manifest.json` `version` in the same PR as user-visible changes.

## Line endings (Windows)

`LF will be replaced by CRLF` warnings are informational. To avoid churn, prefer a `.gitattributes` (`* text=auto`) over changing `core.autocrlf` (never change user git config unasked).

## Large / binary files

Images (wallpapers, PNGs) bloat history. Before committing many binaries, confirm they are needed; remove unused candidates rather than committing them. Consider Git LFS only if the user agrees.

## Secrets

Never commit `.pem`, `.crx`, `.env`, tokens. If one was committed: remove it, add to `.gitignore`, tell the user to **rotate** the secret (history rewrite alone is not enough once pushed).
