import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { Tool } from "./types";

const ReadFileSchema = z.object({
    rootPath: z.string(),
    filePath: z.string()
});

type ReadFileInput = z.infer<typeof ReadFileSchema>;

export const readFileTool: Tool<ReadFileInput> = {
    name: "read_file",
    risk: "LOW",
    schema: ReadFileSchema,

    async execute(input) {

        const absolutePath = path.resolve(
            input.rootPath,
            input.filePath
        );

        if (!absolutePath.startsWith(path.resolve(input.rootPath))) {
            throw new Error("File path escapes workspace root");
        }

        const stat = await fs.stat(absolutePath);

        if (!stat.isFile()) {
            throw new Error("Not a file");
        }

        const content = await fs.readFile(absolutePath, "utf8");

        return { content };
    }
};