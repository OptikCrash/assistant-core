"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSchemaTool = void 0;
const zod_1 = require("zod");
const ReadSchemaSchema = zod_1.z.object({
    workspaceId: zod_1.z.string()
});
exports.readSchemaTool = {
    name: "read_schema",
    risk: "LOW",
    schema: ReadSchemaSchema,
    async execute() {
        throw new Error("NOT_IMPLEMENTED: read_schema");
    }
};
