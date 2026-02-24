import fs from "fs";
import micromatch from "micromatch";
import path from "path";

// Per-workspace cache for parsed ignore rules
const ignoreCache = new Map<string, string[]>();

export const DEFAULT_EXCLUDES = [
    ".git",
    "node_modules",
    ".DS_Store",
    "dist",
    "build"
];

const SOURCE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".sql",
    ".json",
    ".md"
]);

const EXCLUDED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo"
]);

const SENSITIVE_FILES = [
    ".env",
    ".pem",
    ".key",
    "id_rsa"
];

export function shouldIndexFile(
    filePath: string,
    type: "file" | "directory",
    rootPath?: string
): boolean {

    // Path segment exclusion (directories in path)
    const parts = filePath.split("/");

    if (parts.some(p => EXCLUDED_DIRECTORIES.has(p))) {
        return false;
    }

    // DEFAULT_EXCLUDES check (exact segment match for any part of path)
    if (parts.some(p => DEFAULT_EXCLUDES.includes(p))) {
        return false;
    }

    // Check .assistantignore glob patterns
    if (rootPath) {
        const ignorePatterns = loadAssistantIgnore(rootPath);
        if (ignorePatterns.length > 0 && micromatch.isMatch(filePath, ignorePatterns, { dot: true })) {
            return false;
        }
    }

    if (type === "directory") {
        return true;
    }

    // Sensitive file exclusion
    if (SENSITIVE_FILES.some(name => filePath.endsWith(name))) {
        return false;
    }

    const ext = filePath.substring(filePath.lastIndexOf("."));

    return SOURCE_EXTENSIONS.has(ext);
}

export function loadAssistantIgnore(rootPath: string): string[] {
    const cached = ignoreCache.get(rootPath);
    if (cached) return cached;

    const ignorePath = path.join(rootPath, ".assistantignore");

    if (!fs.existsSync(ignorePath)) {
        ignoreCache.set(rootPath, []);
        return [];
    }

    const patterns = fs
        .readFileSync(ignorePath, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#")); // Filter empty lines and comments

    ignoreCache.set(rootPath, patterns);
    return patterns;
}

export function clearIgnoreCache(rootPath?: string): void {
    if (rootPath) {
        ignoreCache.delete(rootPath);
    } else {
        ignoreCache.clear();
    }
}