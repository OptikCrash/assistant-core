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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkspacePath = resolveWorkspacePath;
exports.normalizePath = normalizePath;
exports.resolveSafePath = resolveSafePath;
exports.resolveSafePathAsync = resolveSafePathAsync;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const workspaceRegistry_1 = require("../workspace/workspaceRegistry");
/**
 * Resolves a workspace ID to its root path with validation
 */
async function resolveWorkspacePath(workspaceId) {
    const workspace = await (0, workspaceRegistry_1.getWorkspace)(workspaceId);
    return workspace.rootPath;
}
/**
 * Normalizes a path for consistent storage and comparison
 */
function normalizePath(p) {
    return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}
/**
 * Resolves a relative path within a workspace and validates it doesn't escape
 * the workspace root (prevents symlink attacks and path traversal)
 */
function resolveSafePath(rootPath, relativePath) {
    const normalized = normalizePath(relativePath);
    const resolved = path_1.default.resolve(rootPath, normalized);
    const realRoot = fs_1.default.realpathSync(rootPath);
    // Check if resolved path escapes workspace (handles ../ traversal)
    if (!resolved.startsWith(path_1.default.resolve(rootPath))) {
        throw new Error(`Path escape detected: ${relativePath}`);
    }
    // Check symlink resolution for actual path escape
    try {
        const realPath = fs_1.default.realpathSync(resolved);
        if (!realPath.startsWith(realRoot)) {
            throw new Error(`Symlink escape detected: ${relativePath} -> ${realPath}`);
        }
        return realPath;
    }
    catch (err) {
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
async function resolveSafePathAsync(rootPath, relativePath) {
    const fsPromises = await Promise.resolve().then(() => __importStar(require("fs/promises")));
    const normalized = normalizePath(relativePath);
    const resolved = path_1.default.resolve(rootPath, normalized);
    let realRoot;
    try {
        realRoot = await fsPromises.realpath(rootPath);
    }
    catch {
        realRoot = path_1.default.resolve(rootPath);
    }
    // Check if resolved path escapes workspace (handles ../ traversal)
    if (!resolved.startsWith(path_1.default.resolve(rootPath))) {
        throw new Error(`Path escape detected: ${relativePath}`);
    }
    // Check symlink resolution for actual path escape
    try {
        const realPath = await fsPromises.realpath(resolved);
        if (!realPath.startsWith(realRoot)) {
            throw new Error(`Symlink escape detected: ${relativePath} -> ${realPath}`);
        }
        return realPath;
    }
    catch (err) {
        // File doesn't exist yet - that's ok, just return resolved path
        if (err.code === "ENOENT") {
            return resolved;
        }
        throw err;
    }
}
