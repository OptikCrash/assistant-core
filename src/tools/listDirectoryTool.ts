import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { isSensitivePath } from "../workspace/securityGuard";
import { normalizePath, resolveSafePathAsync, resolveWorkspacePath } from "./pathUtils";
import { Tool } from "./types";

const ListDirectorySchema = z.object({
    workspaceId: z.string(),
    directory: z.string().optional(),
    maxDepth: z.number().min(1).max(5).optional(),
    extensions: z.array(z.string()).optional()
});

// Legacy schema for internal use (accepts rootPath directly)
const ListDirectoryLegacySchema = z.object({
    rootPath: z.string(),
    directory: z.string().optional(),
    maxDepth: z.number().min(1).max(5).optional(),
    extensions: z.array(z.string()).optional()
});

type ListDirectoryInput = z.infer<typeof ListDirectorySchema>;
type ListDirectoryLegacyInput = z.infer<typeof ListDirectoryLegacySchema>;

export interface DirectoryNode {
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
    children?: DirectoryNode[];
}

const IGNORE_DIRS = new Set([
    "node_modules",
    "dist",
    ".git",
    "build",
    "coverage"
]);

async function walkDirectory(
    root: string,
    currentPath: string,
    depth: number,
    maxDepth: number,
    extensions?: string[]
): Promise<DirectoryNode[]> {
    if (depth > maxDepth) return [];

    const entries = await fs.readdir(currentPath, {
        withFileTypes: true
    });

    const results: DirectoryNode[] = [];

    for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name)) continue;

        const absolute = path.join(currentPath, entry.name);
        const relative = normalizePath(path.relative(root, absolute));

        if (isSensitivePath(relative)) continue;

        if (entry.isDirectory()) {
            results.push({
                name: entry.name,
                path: relative,
                type: "directory",
                children: await walkDirectory(root, absolute, depth + 1, maxDepth, extensions)
            });
        } else {
            if (extensions) {
                const ext = path.extname(entry.name);
                if (!extensions.includes(ext)) continue;
            }

            const stat = await fs.stat(absolute);
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

export const listDirectoryTool: Tool<ListDirectoryInput> & {
    execute(input: ListDirectoryInput | ListDirectoryLegacyInput): Promise<{ tree: DirectoryNode[] }>;
} = {
    name: "list_directory",
    risk: "LOW",
    schema: ListDirectorySchema,

    async execute(input: ListDirectoryInput | ListDirectoryLegacyInput) {
        // Support both workspaceId and legacy rootPath
        let root: string;
        if ("workspaceId" in input) {
            root = await resolveWorkspacePath(input.workspaceId);
        } else {
            root = path.resolve(input.rootPath);
        }

        const startDir = await resolveSafePathAsync(root, input.directory ?? "");
        const maxDepth = input.maxDepth ?? 3;

        return {
            tree: await walkDirectory(root, startDir, 1, maxDepth, input.extensions)
        };
    }
};