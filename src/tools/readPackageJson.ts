import fs from "fs/promises";
import { z } from "zod";
import { Tool } from "./types";

const ReadPackageJsonSchema = z.object({});

type ReadPackageJsonInput = z.infer<typeof ReadPackageJsonSchema>;

export const readPackageJsonTool: Tool<ReadPackageJsonInput> = {
    name: "read_package_json",
    risk: "LOW",
    schema: ReadPackageJsonSchema,

    async execute() {
        const content = await fs.readFile("package.json", "utf-8");
        return JSON.parse(content);
    }
};
