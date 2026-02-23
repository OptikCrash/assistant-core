import fs from "fs";
import path from "path";

let assistantIgnoreCache: string[] | null = null;

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
    type: "file" | "directory"
): boolean {

    // Directory exclusion
    const parts = filePath.split("/");

    if (parts.some(p => EXCLUDED_DIRECTORIES.has(p))) {
        return false;
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
    if (assistantIgnoreCache) return assistantIgnoreCache;

    const ignorePath = path.join(rootPath, ".assistantignore");

    if (!fs.existsSync(ignorePath)) {
        assistantIgnoreCache = [];
        return [];
    }

    assistantIgnoreCache = fs
        .readFileSync(ignorePath, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

    return assistantIgnoreCache;
}