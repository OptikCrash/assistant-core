"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshWorkspaceIndex = refreshWorkspaceIndex;
exports.getWorkspaceIndex = getWorkspaceIndex;
const child_process_1 = require("child_process");
const listDirectoryTool_1 = require("../tools/listDirectoryTool");
const pathUtils_1 = require("../tools/pathUtils");
const filterRules_1 = require("./indexing/filterRules");
const runtimeDetector_1 = require("./runtimeDetector");
const workspaceRegistry_1 = require("./workspaceRegistry");
const MAX_FILE_SIZE = 500000; // 500 KB
const indexCache = new Map();
async function refreshWorkspaceIndex(workspaceId, depth = 5) {
    const workspace = await (0, workspaceRegistry_1.getWorkspace)(workspaceId);
    // Get runtime state for dirty detection
    const runtime = (0, runtimeDetector_1.detectWorkspaceRuntime)(workspace.rootPath);
    const currentCommit = runtime.lastCommitHash || getCurrentCommit(workspace.rootPath);
    const dirtyFiles = runtime.dirty ? getDirtyFiles(workspace.rootPath) : [];
    const existingIndex = indexCache.get(workspaceId);
    // Invalidate if depth changed
    const depthChanged = existingIndex && existingIndex.depth !== depth;
    // Skip full reindex if commit unchanged and no dirty state and same depth
    if (existingIndex &&
        existingIndex.lastIndexedCommit === currentCommit &&
        !runtime.dirty &&
        !depthChanged) {
        console.log("No changes detected. Skipping re-index.");
        return existingIndex;
    }
    // Incremental reindex if we have a previous index and same depth
    if (existingIndex && existingIndex.lastIndexedCommit && !depthChanged) {
        // Get committed changes + dirty (uncommitted/staged) files
        const committedChanges = getChangedFiles(workspace.rootPath, existingIndex.lastIndexedCommit);
        const allChangedFiles = [...new Set([...committedChanges, ...dirtyFiles])];
        if (allChangedFiles.length > 0) {
            console.log(`Incremental reindex: ${allChangedFiles.length} changed files (${dirtyFiles.length} dirty)`);
            // Remove changed paths AND any files inside changed directories from existing index
            const changedSet = new Set(allChangedFiles.map(pathUtils_1.normalizePath));
            const unchangedFiles = existingIndex.files.filter(f => {
                const filePath = (0, pathUtils_1.normalizePath)(f.path);
                // Remove exact matches
                if (changedSet.has(filePath)) {
                    return false;
                }
                // Remove files that are inside a changed directory
                for (const changedPath of changedSet) {
                    if (filePath.startsWith(changedPath + "/")) {
                        return false;
                    }
                }
                return true;
            });
            // Re-index only changed paths (with directory recursion)
            const reindexedFiles = await indexSpecificPaths(workspace.rootPath, allChangedFiles, depth);
            // Merge and dedupe by path
            const seenPaths = new Set();
            const mergedFiles = [];
            for (const file of [...unchangedFiles, ...reindexedFiles]) {
                const normalized = (0, pathUtils_1.normalizePath)(file.path);
                if (!seenPaths.has(normalized)) {
                    seenPaths.add(normalized);
                    mergedFiles.push(file);
                }
            }
            const totalSize = mergedFiles.reduce((sum, f) => sum + f.size, 0);
            const index = {
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
    const index = {
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
function getWorkspaceIndex(workspaceId) {
    return indexCache.get(workspaceId) ?? null;
}
function getCurrentCommit(rootPath) {
    return (0, child_process_1.execSync)("git rev-parse HEAD", {
        cwd: rootPath,
    }).toString().trim();
}
function getChangedFiles(rootPath, fromCommit) {
    try {
        const output = (0, child_process_1.execSync)(`git diff --name-only ${fromCommit} HEAD`, {
            cwd: rootPath,
        }).toString().trim();
        if (!output) {
            return [];
        }
        return output.split("\n").filter(Boolean).map(pathUtils_1.normalizePath);
    }
    catch {
        // If diff fails (e.g., commit no longer exists), return empty to trigger full reindex
        return [];
    }
}
function getDirtyFiles(rootPath) {
    try {
        // git status --porcelain returns lines like "M  file.ts" or "?? newfile.ts"
        const output = (0, child_process_1.execSync)("git status --porcelain", {
            cwd: rootPath,
        }).toString().trim();
        if (!output) {
            return [];
        }
        return output
            .split("\n")
            .filter(Boolean)
            .map(line => (0, pathUtils_1.normalizePath)(line.substring(3))); // Skip status prefix (e.g., "M  ")
    }
    catch {
        return [];
    }
}
async function getIndexedFilesFromGit(rootPath, depth) {
    const fsPromises = await Promise.resolve().then(() => __importStar(require("fs/promises")));
    try {
        // Get all tracked files from git
        const output = (0, child_process_1.execSync)("git ls-files", {
            cwd: rootPath,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large repos
        }).toString().trim();
        if (!output) {
            return fallbackTreeScan(rootPath, depth);
        }
        const files = output.split("\n").filter(Boolean);
        const result = [];
        const seenDirs = new Set();
        for (const filePath of files) {
            const normalized = (0, pathUtils_1.normalizePath)(filePath);
            const parts = normalized.split("/");
            // Check depth limit
            if (parts.length > depth + 1) {
                continue;
            }
            if (!(0, filterRules_1.shouldIndexFile)(normalized, "file", rootPath)) {
                continue;
            }
            // Add parent directories
            for (let i = 1; i < parts.length; i++) {
                const dirPath = parts.slice(0, i).join("/");
                if (!seenDirs.has(dirPath) && (0, filterRules_1.shouldIndexFile)(dirPath, "directory", rootPath)) {
                    seenDirs.add(dirPath);
                    result.push({ path: dirPath, size: 0, type: "directory" });
                }
            }
            // Get file size with symlink protection
            try {
                const fullPath = await (0, pathUtils_1.resolveSafePathAsync)(rootPath, normalized);
                const stat = await fsPromises.stat(fullPath);
                if (stat.size <= MAX_FILE_SIZE) {
                    result.push({ path: normalized, size: stat.size, type: "file" });
                }
            }
            catch {
                // File may have been deleted or path escape - skip
            }
        }
        return result;
    }
    catch {
        // Not a git repo or git command failed - fallback to tree scan
        return fallbackTreeScan(rootPath, depth);
    }
}
async function fallbackTreeScan(rootPath, depth) {
    const result = await listDirectoryTool_1.listDirectoryTool.execute({
        rootPath,
        directory: "",
        maxDepth: depth
    });
    return flattenTree(result.tree, rootPath);
}
async function indexSpecificPaths(rootPath, paths, depth) {
    const fsPromises = await Promise.resolve().then(() => __importStar(require("fs/promises")));
    const result = [];
    for (const filePath of paths) {
        const normalized = (0, pathUtils_1.normalizePath)(filePath);
        try {
            // Use safe path resolution with symlink protection
            const fullPath = await (0, pathUtils_1.resolveSafePathAsync)(rootPath, normalized);
            const stat = await fsPromises.stat(fullPath);
            const type = stat.isDirectory() ? "directory" : "file";
            if (!(0, filterRules_1.shouldIndexFile)(normalized, type, rootPath)) {
                continue;
            }
            if (stat.isDirectory()) {
                // Recurse into directory using listDirectoryTool
                const subResult = await listDirectoryTool_1.listDirectoryTool.execute({
                    rootPath,
                    directory: normalized,
                    maxDepth: depth
                });
                result.push(...flattenTree(subResult.tree, rootPath));
            }
            else if (stat.isFile() && stat.size <= MAX_FILE_SIZE) {
                result.push({
                    path: normalized,
                    size: stat.size,
                    type: "file"
                });
            }
        }
        catch {
            // File was deleted, inaccessible, or path escape - skip it
            continue;
        }
    }
    return result;
}
function flattenTree(nodes, rootPath) {
    const result = [];
    for (const node of nodes) {
        const fullPath = (0, pathUtils_1.normalizePath)(node.path);
        if (!(0, filterRules_1.shouldIndexFile)(fullPath, node.type, rootPath)) {
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
                result.push(...flattenTree(node.children, rootPath));
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
