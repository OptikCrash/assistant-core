import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { Tool } from "./types";

const ReadPackageJsonSchema = z.object({
    workspacePath: z.string()
});

type ReadPackageJsonInput = z.infer<typeof ReadPackageJsonSchema>;

export const readPackageJsonTool: Tool<ReadPackageJsonInput> = {
    name: "read_package_json",
    risk: "LOW",
    schema: ReadPackageJsonSchema,

    async execute({ workspacePath }) {
        const filePath = path.join(workspacePath, "package.json");
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content);
    }
};
