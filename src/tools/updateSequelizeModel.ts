import { z } from "zod";
import { Tool } from "./types";

const UpdateSequelizeSchema = z.object({
    modelName: z.string(),
    associations: z.array(z.any())
});

export const updateSequelizeTool: Tool<any> = {
    name: "update_sequelize_model",
    risk: "HIGH",
    schema: UpdateSequelizeSchema,

    async execute() {
        throw new Error("Tool not implemented: update_sequelize_model");
    }
};
