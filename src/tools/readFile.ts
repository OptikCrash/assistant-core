import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { resolveSafePathAsync, resolveWorkspacePath } from "./pathUtils";
import { Tool } from "./types";

const ReadFileSchema = z.object({
    workspaceId: z.string().optional(),
    rootPath: z.string().optional(), // Legacy support
    filePath: z.string()
}).refine(data => data.workspaceId || data.rootPath, {
    message: "Either workspaceId or rootPath must be provided"
});

type ReadFileInput = z.infer<typeof ReadFileSchema>;

export const readFileTool: Tool<ReadFileInput> = {
    name: "read_file",
    risk: "LOW",
    schema: ReadFileSchema,

    async execute(input) {
        // Support both workspaceId and legacy rootPath
        const rootPath = input.workspaceId
            ? await resolveWorkspacePath(input.workspaceId)
            : path.resolve(input.rootPath!);

        const absolutePath = await resolveSafePathAsync(rootPath, input.filePath);

        const stat = await fs.stat(absolutePath);

        if (!stat.isFile()) {
            throw new Error("Not a file");
        }

        const content = await fs.readFile(absolutePath, "utf8");

        return { content };
    }
};