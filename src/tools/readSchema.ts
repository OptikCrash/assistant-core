import { z } from "zod";
import { Tool } from "./types";

const ReadSchemaSchema = z.object({});

export const readSchemaTool: Tool<{}> = {
    name: "read_schema",
    risk: "LOW",
    schema: ReadSchemaSchema,

    async execute() {
        throw new Error("Tool not implemented: read_schema");
    }
};
