"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EXCLUDES = void 0;
exports.shouldIndexFile = shouldIndexFile;
exports.loadAssistantIgnore = loadAssistantIgnore;
exports.clearIgnoreCache = clearIgnoreCache;
const fs_1 = __importDefault(require("fs"));
const micromatch_1 = __importDefault(require("micromatch"));
const path_1 = __importDefault(require("path"));
// Per-workspace cache for parsed ignore rules
const ignoreCache = new Map();
exports.DEFAULT_EXCLUDES = [
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
function shouldIndexFile(filePath, type, rootPath) {
    // Path segment exclusion (directories in path)
    const parts = filePath.split("/");
    if (parts.some(p => EXCLUDED_DIRECTORIES.has(p))) {
        return false;
    }
    // DEFAULT_EXCLUDES check (exact segment match for any part of path)
    if (parts.some(p => exports.DEFAULT_EXCLUDES.includes(p))) {
        return false;
    }
    // Check .assistantignore glob patterns
    if (rootPath) {
        const ignorePatterns = loadAssistantIgnore(rootPath);
        if (ignorePatterns.length > 0 && micromatch_1.default.isMatch(filePath, ignorePatterns, { dot: true })) {
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
function loadAssistantIgnore(rootPath) {
    const cached = ignoreCache.get(rootPath);
    if (cached)
        return cached;
    const ignorePath = path_1.default.join(rootPath, ".assistantignore");
    if (!fs_1.default.existsSync(ignorePath)) {
        ignoreCache.set(rootPath, []);
        return [];
    }
    const patterns = fs_1.default
        .readFileSync(ignorePath, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#")); // Filter empty lines and comments
    ignoreCache.set(rootPath, patterns);
    return patterns;
}
function clearIgnoreCache(rootPath) {
    if (rootPath) {
        ignoreCache.delete(rootPath);
    }
    else {
        ignoreCache.clear();
    }
}
