# Workspace

This module manages workspace registration, metadata detection, and runtime git status for repositories that the Assistant Core interacts with.

## Overview

The workspace system provides:

- **Registration** of repositories by ID and root path
- **Static metadata detection** (languages, frameworks, ORM, DBs, package manager)
- **Runtime git status** (branch, staged/unstaged changes, ahead/behind)
- **Persistent storage** of workspace registry

This allows tools like smart review and file readers to operate safely within a known repository root.

## Directory Layout

```text
src/workspace/
├── workspaceRegistry.ts        # Register, list, get, and remove workspaces
├── workspaceStore.ts           # Store interface (register/get/list/remove)
├── fileWorkspaceStore.ts       # File-backed store (.workspace-store.json)
├── inMemoryWorkspaceStore.ts   # In-memory store (alternative)
├── metadataDetector.ts         # Static metadata detection
├── runtimeDetector.ts          # Lightweight git runtime status
├── workspaceRuntimeDetector.ts # Extended runtime status (ahead/behind)
├── workspaceDetector.ts        # Stack detection helper
└── types.ts                    # Workspace types
```

## Core Types

### WorkspaceContext

```typescript
interface WorkspaceContext {
  id: string;
  rootPath: string;
  metadata: WorkspaceStaticMetadata;
}
```

### WorkspaceStaticMetadata

```typescript
interface WorkspaceStaticMetadata {
  languages: string[];
  frameworks: string[];
  databases: string[];
  orm: string[];
  testFrameworks: string[];
  packageManager?: string;
  hasDocker: boolean;
  defaultBranch?: string;
}
```

### WorkspaceRuntimeState

```typescript
interface WorkspaceRuntimeState {
  currentBranch?: string;
  defaultBranch?: string;
  hasUncommittedChanges: boolean;
  hasStagedChanges: boolean;
  aheadBy?: number;
  behindBy?: number;
}
```

## Workspace Registry

### [workspaceRegistry.ts](workspaceRegistry.ts)

Primary entry point for managing workspaces.

**Functions:**

- `registerWorkspace(id, rootPath)`
  - Verifies path exists and is a git repo
  - Detects static metadata
  - Stores the workspace in the configured store

- `getWorkspace(id)`
  - Retrieves a workspace or throws if not found

- `listWorkspaces()`
  - Returns all registered workspaces

- `unregisterWorkspace(id)`
  - Removes a workspace from the store

**Example:**

```typescript
const workspace = await registerWorkspace("BOSS", "/path/to/repo");
const list = await listWorkspaces();
```

## Storage

### [fileWorkspaceStore.ts](fileWorkspaceStore.ts)

Persists workspace registry to `.workspace-store.json` in the server root.

**Behavior:**

- Reads/writes JSON on each operation
- Replaces existing entries with the same ID

### [inMemoryWorkspaceStore.ts](inMemoryWorkspaceStore.ts)

In-memory store alternative (not currently used by default).

## Metadata Detection

### [metadataDetector.ts](metadataDetector.ts)

Detects static project metadata by inspecting `package.json`, lockfiles, and repo files.

**Checks:**

- Languages and frameworks (TypeScript, Express, Angular, React)
- Databases and ORMs (PostgreSQL, Sequelize, TypeORM)
- Test frameworks (Jest, Vitest)
- Package manager (npm/yarn/pnpm)
- Dockerfile presence
- Default git branch (origin/HEAD)

## Runtime Detection

### [runtimeDetector.ts](runtimeDetector.ts)

Lightweight git status for branch name and staged/unstaged changes.

### [workspaceRuntimeDetector.ts](workspaceRuntimeDetector.ts)

Extended runtime status including ahead/behind counts vs the default branch.

## Stack Detection Helper

### [workspaceDetector.ts](workspaceDetector.ts)

Simpler, coarse-grained stack detection used for quick checks (Node, Angular, Sequelize, Postgres).

## API Integration

Workspace endpoints are exposed in [src/routes/workspace.ts](../routes/workspace.ts) and used by:

- `read_file` tool for safe file access
- `get_git_diff` tool for repo-scoped diffs
- Smart review engine for context and runtime metadata

## Security Notes

- File reads are scoped to the workspace root to prevent path traversal
- Workspace registration requires a valid git repository
- Runtime detection failures are handled gracefully to avoid crashes

## Future Improvements

- Add authentication and authorization per workspace
- Implement per-workspace access control
- Add workspace expiration/cleanup policies
- Cache metadata to reduce repeated filesystem work
- Support non-git workspaces with limited tooling
