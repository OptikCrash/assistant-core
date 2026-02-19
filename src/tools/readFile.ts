import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { Tool } from "./types";

const ReadFileSchema = z.object({
    filePath: z.string()
});

type ReadFileInput = z.infer<typeof ReadFileSchema>;

export const readFileTool: Tool<ReadFileInput> = {
    name: "read_file",
    risk: "LOW",
    schema: ReadFileSchema,

    async execute({ filePath }) {
        const content = await fs.readFile(path.resolve(filePath), "utf-8");
        return { content };
    }
};
