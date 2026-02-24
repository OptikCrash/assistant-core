import { execSync } from "child_process";
import { listDirectoryTool } from "../tools/listDirectoryTool";
import { normalizePath, resolveSafePathAsync } from "../tools/pathUtils";
import { shouldIndexFile } from "./indexing/filterRules";
import { detectWorkspaceRuntime } from "./runtimeDetector";
import { getWorkspace } from "./workspaceRegistry";

const MAX_FILE_SIZE = 500_000; // 500 KB

interface IndexedFile {
    path: string;
    size: number;
    type: "file" | "directory";
}

export interface WorkspaceIndex {
    workspaceId: string;
    indexedAt: string;
    files: IndexedFile[];
    lastIndexedCommit: string;
    depth: number;
    totalSize: number;
}

const indexCache = new Map<string, WorkspaceIndex>();
export async function refreshWorkspaceIndex(
    workspaceId: string,
    depth = 5
): Promise<WorkspaceIndex> {

    const workspace = await getWorkspace(workspaceId);

    // Get runtime state for dirty detection
    const runtime = detectWorkspaceRuntime(workspace.rootPath);
    const currentCommit = runtime.lastCommitHash || getCurrentCommit(workspace.rootPath);
    const dirtyFiles = runtime.dirty ? getDirtyFiles(workspace.rootPath) : [];

    const existingIndex = indexCache.get(workspaceId);

    // Invalidate if depth changed
    const depthChanged = existingIndex && existingIndex.depth !== depth;

    // Skip full reindex if commit unchanged and no dirty state and same depth
    if (
        existingIndex &&
        existingIndex.lastIndexedCommit === currentCommit &&
        !runtime.dirty &&
        !depthChanged
    ) {
        console.log("No changes detected. Skipping re-index.");
        return existingIndex;
    }

    // Incremental reindex if we have a previous index and same depth
    if (existingIndex && existingIndex.lastIndexedCommit && !depthChanged) {
        // Get committed changes + dirty (uncommitted/staged) files
        const committedChanges = getChangedFiles(
            workspace.rootPath,
            existingIndex.lastIndexedCommit
        );
        const allChangedFiles = [...new Set([...committedChanges, ...dirtyFiles])];

        if (allChangedFiles.length > 0) {
            console.log(`Incremental reindex: ${allChangedFiles.length} changed files (${dirtyFiles.length} dirty)`);

            // Remove changed paths from existing index
            const changedSet = new Set(allChangedFiles.map(normalizePath));
            const unchangedFiles = existingIndex.files.filter(
                f => !changedSet.has(normalizePath(f.path))
            );

            // Re-index only changed paths (with directory recursion)
            const reindexedFiles = await indexSpecificPaths(
                workspace.rootPath,
                allChangedFiles,
                depth
            );

            // Merge into existing index
            const mergedFiles = [...unchangedFiles, ...reindexedFiles];
            const totalSize = mergedFiles.reduce((sum, f) => sum + f.size, 0);

            const index: WorkspaceIndex = {
                workspaceId,
                indexedAt: new Date().toISOString(),
                files: mergedFiles,
                lastIndexedCommit: currentCommit,
                depth,
                totalSize
            };

            indexCache.set(workspaceId, index);
            return index;
        }
    }

    // Full reindex using git ls-files (or fallback to tree scan)
    const indexed = await getIndexedFilesFromGit(workspace.rootPath, depth);
    const totalSize = indexed.reduce((sum, f) => sum + f.size, 0);

    const index: WorkspaceIndex = {
        workspaceId,
        indexedAt: new Date().toISOString(),
        files: indexed,
        lastIndexedCommit: currentCommit,
        depth,
        totalSize
    };

    indexCache.set(workspaceId, index);

    return index;
}

export function getWorkspaceIndex(
    workspaceId: string
): WorkspaceIndex | null {
    return indexCache.get(workspaceId) ?? null;
}

function getCurrentCommit(rootPath: string): string {
    return execSync("git rev-parse HEAD", {
        cwd: rootPath,
    }).toString().trim();
}

function getChangedFiles(rootPath: string, fromCommit: string): string[] {
    try {
        const output = execSync(`git diff --name-only ${fromCommit} HEAD`, {
            cwd: rootPath,
        }).toString().trim();

        if (!output) {
            return [];
        }

        return output.split("\n").filter(Boolean).map(normalizePath);
    } catch {
        // If diff fails (e.g., commit no longer exists), return empty to trigger full reindex
        return [];
    }
}

function getDirtyFiles(rootPath: string): string[] {
    try {
        // git status --porcelain returns lines like "M  file.ts" or "?? newfile.ts"
        const output = execSync("git status --porcelain", {
            cwd: rootPath,
        }).toString().trim();

        if (!output) {
            return [];
        }

        return output
            .split("\n")
            .filter(Boolean)
            .map(line => normalizePath(line.substring(3))); // Skip status prefix (e.g., "M  ")
    } catch {
        return [];
    }
}

async function getIndexedFilesFromGit(
    rootPath: string,
    depth: number
): Promise<IndexedFile[]> {
    const fsPromises = await import("fs/promises");

    try {
        // Get all tracked files from git
        const output = execSync("git ls-files", {
            cwd: rootPath,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large repos
        }).toString().trim();

        if (!output) {
            return fallbackTreeScan(rootPath, depth);
        }

        const files = output.split("\n").filter(Boolean);
        const result: IndexedFile[] = [];
        const seenDirs = new Set<string>();

        for (const filePath of files) {
            const normalized = normalizePath(filePath);
            const parts = normalized.split("/");

            // Check depth limit
            if (parts.length > depth + 1) {
                continue;
            }

            if (!shouldIndexFile(normalized, "file", rootPath)) {
                continue;
            }

            // Add parent directories
            for (let i = 1; i < parts.length; i++) {
                const dirPath = parts.slice(0, i).join("/");
                if (!seenDirs.has(dirPath) && shouldIndexFile(dirPath, "directory", rootPath)) {
                    seenDirs.add(dirPath);
                    result.push({ path: dirPath, size: 0, type: "directory" });
                }
            }

            // Get file size with symlink protection
            try {
                const fullPath = await resolveSafePathAsync(rootPath, normalized);
                const stat = await fsPromises.stat(fullPath);
                if (stat.size <= MAX_FILE_SIZE) {
                    result.push({ path: normalized, size: stat.size, type: "file" });
                }
            } catch {
                // File may have been deleted or path escape - skip
            }
        }

        return result;
    } catch {
        // Not a git repo or git command failed - fallback to tree scan
        return fallbackTreeScan(rootPath, depth);
    }
}

async function fallbackTreeScan(rootPath: string, depth: number): Promise<IndexedFile[]> {
    const result = await listDirectoryTool.execute({
        rootPath,
        directory: "",
        maxDepth: depth
    });
    return flattenTree(result.tree, rootPath);
}

async function indexSpecificPaths(
    rootPath: string,
    paths: string[],
    depth: number
): Promise<IndexedFile[]> {
    const fsPromises = await import("fs/promises");
    const result: IndexedFile[] = [];

    for (const filePath of paths) {
        const normalized = normalizePath(filePath);
        try {
            // Use safe path resolution with symlink protection
            const fullPath = await resolveSafePathAsync(rootPath, normalized);
            const stat = await fsPromises.stat(fullPath);
            const type = stat.isDirectory() ? "directory" : "file";

            if (!shouldIndexFile(normalized, type, rootPath)) {
                continue;
            }

            if (stat.isDirectory()) {
                // Recurse into directory using listDirectoryTool
                const subResult = await listDirectoryTool.execute({
                    rootPath,
                    directory: normalized,
                    maxDepth: depth
                });
                result.push(...flattenTree(subResult.tree, rootPath));
            } else if (stat.isFile() && stat.size <= MAX_FILE_SIZE) {
                result.push({
                    path: normalized,
                    size: stat.size,
                    type: "file"
                });
            }
        } catch {
            // File was deleted, inaccessible, or path escape - skip it
            continue;
        }
    }

    return result;
}

function flattenTree(
    nodes: any[],
    rootPath?: string
): IndexedFile[] {

    const result: IndexedFile[] = [];

    for (const node of nodes) {

        const fullPath = normalizePath(node.path);

        if (!shouldIndexFile(fullPath, node.type, rootPath)) {
            continue;
        }

        // Include directory itself
        if (node.type === "directory") {
            result.push({
                path: fullPath,
                size: 0,
                type: "directory"
            });

            if (node.children) {
                result.push(
                    ...flattenTree(node.children, rootPath)
                );
            }

            continue;
        }

        if (node.type === "file" && node.size > MAX_FILE_SIZE) {
            continue;
        }

        // Include files
        if (node.type === "file") {
            result.push({
                path: fullPath,
                size: node.size ?? 0,
                type: "file"
            });
        }
    }

    return result;
}