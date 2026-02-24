import { z } from "zod";
import { Tool } from "./types";

const ReadSchemaSchema = z.object({
    workspaceId: z.string()
});

type ReadSchemaInput = z.infer<typeof ReadSchemaSchema>;

export const readSchemaTool: Tool<ReadSchemaInput> = {
    name: "read_schema",
    risk: "LOW",
    schema: ReadSchemaSchema,

    async execute() {
        throw new Error("NOT_IMPLEMENTED: read_schema");
    }
};
