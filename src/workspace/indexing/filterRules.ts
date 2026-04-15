import fs from "fs";
import micromatch from "micromatch";
import path from "path";
import {
    isSensitivePath,
    SOURCE_EXTENSIONS
} from "../securityGuard";

// Per-workspace cache for parsed ignore rules
const ignoreCache = new Map<string, string[]>();

export function shouldIndexFile(filePath: string, type: "file" | "directory", rootPath?: string): boolean {
    const normalized = filePath.replace(/\\/g, "/");

    // Exclude sensitive paths for BOTH files and directories
    if (isSensitivePath(normalized)) return false;

    // .assistantignore patterns
    if (rootPath) {
        const ignorePatterns = loadAssistantIgnore(rootPath);
        if (ignorePatterns.length > 0 && micromatch.isMatch(normalized, ignorePatterns, { dot: true })) {
            return false;
        }
    }

    if (type === "directory") return true;

    const dot = normalized.lastIndexOf(".");
    const ext = dot >= 0 ? normalized.substring(dot) : "";

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