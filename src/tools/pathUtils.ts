import fs from "fs";
import path from "path";
import { getWorkspace } from "../workspace/workspaceRegistry";

/**
 * Resolves a workspace ID to its root path with validation
 */
export async function resolveWorkspacePath(workspaceId: string): Promise<string> {
    const workspace = await getWorkspace(workspaceId);
    return workspace.rootPath;
}

/**
 * Normalizes a path for consistent storage and comparison
 */
export function normalizePath(p: string): string {
    return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}

/**
 * Resolves a relative path within a workspace and validates it doesn't escape
 * the workspace root (prevents symlink attacks and path traversal)
 */
export function resolveSafePath(rootPath: string, relativePath: string): string {
    const normalized = normalizePath(relativePath);
    const resolved = path.resolve(rootPath, normalized);
    const realRoot = fs.realpathSync(rootPath);

    // Check if resolved path escapes workspace (handles ../ traversal)
    const rootResolved = path.resolve(rootPath);
    if (!(resolved === rootResolved || resolved.startsWith(rootResolved + path.sep))) {
        throw new Error(`Path escape detected: ${relativePath}`);
    }

    // Check symlink resolution for actual path escape
    try {
        const realPath = fs.realpathSync(resolved);
        if (!realPath.startsWith(realRoot)) {
            throw new Error(`Symlink escape detected: ${relativePath} -> ${realPath}`);
        }
        return realPath;
    } catch (err: any) {
        // File doesn't exist yet - that's ok, just return resolved path
        if (err.code === "ENOENT") {
            return resolved;
        }
        throw err;
    }
}

/**
 * Async version of resolveSafePath for use with fs/promises
 */
export async function resolveSafePathAsync(
    rootPath: string,
    relativePath: string
): Promise<string> {
    const fsPromises = await import("fs/promises");
    const normalized = normalizePath(relativePath);
    const resolved = path.resolve(rootPath, normalized);

    let realRoot: string;
    try {
        realRoot = await fsPromises.realpath(rootPath);
    } catch {
        realRoot = path.resolve(rootPath);
    }

    // Check if resolved path escapes workspace (handles ../ traversal)
    const rootResolved = path.resolve(rootPath);
    if (!(resolved === rootResolved || resolved.startsWith(rootResolved + path.sep))) {
        throw new Error(`Path escape detected: ${relativePath}`);
    }

    // Check symlink resolution for actual path escape
    try {
        const realPath = await fsPromises.realpath(resolved);
        if (!realPath.startsWith(realRoot)) {
            throw new Error(`Symlink escape detected: ${relativePath} -> ${realPath}`);
        }
        return realPath;
    } catch (err: any) {
        // File doesn't exist yet - that's ok, just return resolved path
        if (err.code === "ENOENT") {
            return resolved;
        }
        throw err;
    }
}
