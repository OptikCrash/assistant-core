import { z } from "zod";
import { Tool } from "./types";

const UpdateSequelizeSchema = z.object({
    workspaceId: z.string(),
    modelName: z.string(),
    associations: z.array(z.any())
});

type UpdateSequelizeInput = z.infer<typeof UpdateSequelizeSchema>;

export const updateSequelizeTool: Tool<UpdateSequelizeInput> = {
    name: "update_sequelize_model",
    risk: "HIGH",
    schema: UpdateSequelizeSchema,

    async execute() {
        throw new Error("NOT_IMPLEMENTED: update_sequelize_model");
    }
};
