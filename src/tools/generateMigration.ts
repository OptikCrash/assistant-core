import { Tool } from "./types";

export const generateMigrationTool: Tool = {
    name: "generate_migration",
    risk: "HIGH",

    async execute(input: Record<string, any>) {
        console.log("Generating migration with input:", input);

        return {
            success: true,
            fileCreated: `migrations/${input.migrationName}.sql`
        };
    }
};
