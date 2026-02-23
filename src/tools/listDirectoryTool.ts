import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { Tool } from "./types";

const ListDirectorySchema = z.object({
    rootPath: z.string(),
    directory: z.string().optional(),
    maxDepth: z.number().min(1).max(5).optional(),
    extensions: z.array(z.string()).optional()
});

type ListDirectoryInput = z.infer<typeof ListDirectorySchema>;

export interface DirectoryNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: DirectoryNode[];
}

const IGNORE_DIRS = new Set([
    "node_modules",
    "dist",
    ".git",
    "build",
    "coverage"
]);

export const listDirectoryTool: Tool<ListDirectoryInput> = {
    name: "list_directory",
    risk: "LOW",
    schema: ListDirectorySchema,

    async execute(input) {
        const root = path.resolve(input.rootPath);
        const startDir = path.resolve(
            root,
            input.directory ?? ""
        );

        if (!startDir.startsWith(root)) {
            throw new Error("Directory escapes workspace root");
        }

        const maxDepth = input.maxDepth ?? 3;

        async function walk(
            currentPath: string,
            depth: number
        ): Promise<DirectoryNode[]> {

            if (depth > maxDepth) return [];

            const entries = await fs.readdir(currentPath, {
                withFileTypes: true
            });

            const results: DirectoryNode[] = [];

            for (const entry of entries) {

                if (IGNORE_DIRS.has(entry.name)) continue;

                const absolute = path.join(currentPath, entry.name);
                const relative = path.relative(root, absolute);

                if (entry.isDirectory()) {
                    results.push({
                        name: entry.name,
                        path: relative,
                        type: "directory",
                        children: await walk(absolute, depth + 1)
                    });
                } else {

                    if (input.extensions) {
                        const ext = path.extname(entry.name);
                        if (!input.extensions.includes(ext)) continue;
                    }

                    results.push({
                        name: entry.name,
                        path: relative,
                        type: "file"
                    });
                }
            }

            return results;
        }

        return {
            tree: await walk(startDir, 1)
        };
    }
};