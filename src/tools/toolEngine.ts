import { generateMigrationTool } from "./generateMigration";
import { getGitDiffTool } from "./getGitDiff";
import { Tool } from "./types";

const tools: Tool[] = [
    generateMigrationTool,
    getGitDiffTool
];

export async function executeToolCall(toolName: string, input: any) {
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
        throw new Error(`Tool not implemented: ${toolName}`);
    }

    const parsed = tool.schema.safeParse(input);

    if (!parsed.success) {
        throw new Error(
            `Invalid input for tool ${toolName}: ${parsed.error.message}`
        );
    }

    return tool.execute(parsed.data);
}

