"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAngularDtoTool = void 0;
const zod_1 = require("zod");
const UpdateAngularDtoSchema = zod_1.z.object({
    workspaceId: zod_1.z.string(),
    dtoName: zod_1.z.string(),
    properties: zod_1.z.array(zod_1.z.any())
});
exports.updateAngularDtoTool = {
    name: "update_angular_dto",
    risk: "MEDIUM",
    schema: UpdateAngularDtoSchema,
    async execute() {
        throw new Error("NOT_IMPLEMENTED: update_angular_dto");
    }
};
