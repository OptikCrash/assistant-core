import { z } from 'zod';
import { Tool } from './types';

const GenerateMigrationSchema = z.object({
    migrationName: z.string(),
    tableName: z.string(),
    columns: z.array(z.any()).optional()
});

type GenerateMigrationInput = z.infer<typeof GenerateMigrationSchema>;

export const generateMigrationTool: Tool<GenerateMigrationInput> = {
    name: "generate_migration",
    risk: "HIGH",
    schema: GenerateMigrationSchema,

    async execute(input) {
        // input is now fully typed & validated
        return {
            success: true,
            fileCreated: `migrations/${input.migrationName}.sql`
        };
    }
};
