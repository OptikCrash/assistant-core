"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSequelizeTool = void 0;
const zod_1 = require("zod");
const UpdateSequelizeSchema = zod_1.z.object({
    workspaceId: zod_1.z.string(),
    modelName: zod_1.z.string(),
    associations: zod_1.z.array(zod_1.z.any())
});
exports.updateSequelizeTool = {
    name: "update_sequelize_model",
    risk: "HIGH",
    schema: UpdateSequelizeSchema,
    async execute() {
        throw new Error("NOT_IMPLEMENTED: update_sequelize_model");
    }
};
