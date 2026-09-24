---
name: git-github-expert
description: Expert Git and GitHub (gh CLI) workflows — branching, staging, commits, history rewrites, recovery, pull requests, reviews, and releases, with Windows PowerShell pitfalls. Use whenever running git or gh commands, committing, pushing, opening/merging PRs, fixing commit messages, resolving conflicts, recovering lost work, or when the user mentions git, GitHub, branch, commit, push, PR, merge, rebase, or cherry-pick.
---

# Git & GitHub expert

## Golden rules

1. **Never commit or push to the default branch.** Create `cursor/<short-kebab-topic>` first. Check the default with `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` (this repo: `master`; a stray `main` exists on the remote — never target it).
2. **Inspect before acting:** `git status -sb` and `git log -5 --oneline` before every commit, push, or rewrite.
3. **Commit only what belongs.** Stage explicit paths (`git add path/a path/b`), never `git add -A` when unrelated changes exist. If told "commit only staged", run `git commit` without adding anything.
4. **Check PR state before pushing more commits** to a PR branch: `gh pr view --json state,isDraft,headRefOid`. If it is `MERGED`, new commits on that branch will **not** reach the base — start a fresh branch (see "PR merged early").
5. **Rewriting pushed history** → only on your own feature branch, always `git push --force-with-lease`, never plain `--force`, never on the default branch.
6. **Never** change git config, skip hooks (`--no-verify`), or amend commits you didn't create, unless the user asks.

## Commit messages

- One concise line in the imperative/past summary style used by the repo (`git log --oneline` to match). Add a body only when the "why" isn't obvious.
- Messages are English (project artifacts rule).

### PowerShell (Windows) — safe message passing

Bash heredocs (`<<EOF`) do not exist in PowerShell; mixing them leaves literal `EOF` in the message.

```powershell
# Simple: one -m per paragraph
git commit -m "Add contextual mascot tips." -m "Longer body paragraph."

# Multi-line: PowerShell here-string — closing '@ must start the line
git commit -m @'
Subject line

Body line.
'@
```

Also for `gh pr create --body`: use a here-string `@' ... '@` (single-quoted, so `$` and backticks are literal).

## Everyday workflow

```text
- [ ] git status -sb / git log -5 --oneline
- [ ] On default branch? → git checkout -b cursor/<topic>
- [ ] Stage explicit paths → git diff --cached --stat (review)
- [ ] git commit -m "…"
- [ ] git push -u origin HEAD
- [ ] gh pr create --base <default> [--draft] --title "…" --body @'…'@
- [ ] Report PR URL as a markdown link
```

PR body template:

```markdown
## Summary
- What changed and why (1–3 bullets)

## Test plan
- [ ] Concrete manual/automated checks
```

## Common fixes

| Situation | Command |
| --- | --- |
| Fix last commit message (not pushed) | `git commit --amend -m "…"` |
| Add forgotten file to last commit (not pushed) | `git add f; git commit --amend --no-edit` |
| Unstage | `git restore --staged <path>` |
| Discard local edits to a file | `git restore <path>` (confirm with user first) |
| Undo last commit, keep changes | `git reset --soft HEAD~1` |
| Sync feature branch with base | `git fetch origin; git rebase origin/<base>` (or merge if branch is shared) |
| Who changed a line | `git blame -L 10,20 <file>` |
| Find commit introducing a string | `git log -S "text" --oneline` |

### Reword an older commit (non-interactive, Windows-safe)

`git rebase -i` needs an editor; prefer rebuilding the tail:

```powershell
$tail = git rev-list --reverse <old-sha>..HEAD      # commits after the bad one
git checkout --detach <old-sha>
git commit --amend -m "Correct subject"
git cherry-pick $tail
git branch -f <branch> HEAD; git checkout <branch>
git push --force-with-lease
```

### PR merged early (later commits stranded)

```powershell
git fetch origin
git diff --stat origin/<base> HEAD                  # what is missing
git checkout -b cursor/<new-topic> origin/<base>
git cherry-pick <sha1> <sha2>
git branch -u origin/cursor/<new-topic>             # after first push; avoid tracking <base>
git push -u origin HEAD
gh pr create --base <base> …                        # mention the earlier PR
```

## Conflicts

1. `git status` → list conflicted files.
2. Read both sides; keep intent of both. Remove all `<<<<<<<` / `=======` / `>>>>>>>` markers.
3. `git add <file>` then `git rebase --continue` / `git cherry-pick --continue` / `git commit`.
4. Stuck → `--abort` and report to the user instead of guessing.

## Performance notes (this machine)

- git/gh commands can take 20–90 s here; long-running calls go to background. Wait with the shell-await tool rather than re-running (duplicate runs can hit `index.lock`).
- If `.git/index.lock` exists and no git process is running, it is safe to delete it.

## Additional resources

- Recovery, gh CLI cheatsheet, and advanced recipes: [reference.md](reference.md)
