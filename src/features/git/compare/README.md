# Git Compare

This feature compares your branch against a combined version of someone else's work, where one or more dependency branches are merged into a base branch inside a temporary local worktree.

## What It Returns

- Files changed on your branch vs the shared base ref
- Files changed on their combined branch vs the shared base ref
- Overlapping files
- Files only changed by you
- Files only changed by them
- Diff stats for both sides
- Optional raw patches for line-level follow-up

## Safety Model

- The primary workspace checkout is not modified
- Temporary merge work happens in a `git worktree`
- Temporary local branches are deleted after the comparison completes
- Merge conflicts return a structured `409` response instead of leaving partial state behind
