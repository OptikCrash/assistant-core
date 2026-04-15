"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDirectoryTool = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const pathUtils_1 = require("./pathUtils");
const ListDirectorySchema = zod_1.z.object({
    workspaceId: zod_1.z.string(),
    directory: zod_1.z.string().optional(),
    maxDepth: zod_1.z.number().min(1).max(5).optional(),
    extensions: zod_1.z.array(zod_1.z.string()).optional()
});
// Legacy schema for internal use (accepts rootPath directly)
const ListDirectoryLegacySchema = zod_1.z.object({
    rootPath: zod_1.z.string(),
    directory: zod_1.z.string().optional(),
    maxDepth: zod_1.z.number().min(1).max(5).optional(),
    extensions: zod_1.z.array(zod_1.z.string()).optional()
});
const IGNORE_DIRS = new Set([
    "node_modules",
    "dist",
    ".git",
    "build",
    "coverage"
]);
async function walkDirectory(root, currentPath, depth, maxDepth, extensions) {
    if (depth > maxDepth)
        return [];
    const entries = await fs_1.promises.readdir(currentPath, {
        withFileTypes: true
    });
    const results = [];
    for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name))
            continue;
        const absolute = path_1.default.join(currentPath, entry.name);
        const relative = (0, pathUtils_1.normalizePath)(path_1.default.relative(root, absolute));
        if (entry.isDirectory()) {
            results.push({
                name: entry.name,
                path: relative,
                type: "directory",
                children: await walkDirectory(root, absolute, depth + 1, maxDepth, extensions)
            });
        }
        else {
            if (extensions) {
                const ext = path_1.default.extname(entry.name);
                if (!extensions.includes(ext))
                    continue;
            }
            const stat = await fs_1.promises.stat(absolute);
            results.push({
                name: entry.name,
                path: relative,
                type: "file",
                size: stat.size
            });
        }
    }
    return results;
}
exports.listDirectoryTool = {
    name: "list_directory",
    risk: "LOW",
    schema: ListDirectorySchema,
    async execute(input) {
        // Support both workspaceId and legacy rootPath
        let root;
        if ("workspaceId" in input) {
            root = await (0, pathUtils_1.resolveWorkspacePath)(input.workspaceId);
        }
        else {
            root = path_1.default.resolve(input.rootPath);
        }
        const startDir = await (0, pathUtils_1.resolveSafePathAsync)(root, input.directory ?? "");
        const maxDepth = input.maxDepth ?? 3;
        return {
            tree: await walkDirectory(root, startDir, 1, maxDepth, input.extensions)
        };
    }
};
