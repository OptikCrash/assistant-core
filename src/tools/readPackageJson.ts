import fs from "fs/promises";
import { z } from "zod";
import { resolveSafePathAsync, resolveWorkspacePath } from "./pathUtils";
import { Tool } from "./types";

const ReadPackageJsonSchema = z.object({
    workspaceId: z.string()
});

type ReadPackageJsonInput = z.infer<typeof ReadPackageJsonSchema>;

export const readPackageJsonTool: Tool<ReadPackageJsonInput> = {
    name: "read_package_json",
    risk: "LOW",
    schema: ReadPackageJsonSchema,

    async execute({ workspaceId }) {
        const rootPath = await resolveWorkspacePath(workspaceId);
        const filePath = await resolveSafePathAsync(rootPath, "package.json");
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content);
    }
};
