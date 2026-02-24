import { z } from "zod";
import { Tool } from "./types";

const UpdateAngularDtoSchema = z.object({
    workspaceId: z.string(),
    dtoName: z.string(),
    properties: z.array(z.any())
});

type UpdateAngularDtoInput = z.infer<typeof UpdateAngularDtoSchema>;

export const updateAngularDtoTool: Tool<UpdateAngularDtoInput> = {
    name: "update_angular_dto",
    risk: "MEDIUM",
    schema: UpdateAngularDtoSchema,

    async execute() {
        throw new Error("NOT_IMPLEMENTED: update_angular_dto");
    }
};
