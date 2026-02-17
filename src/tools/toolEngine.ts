import { generateMigrationTool } from "./generateMigration";
import { Tool } from "./types";

const tools: Tool[] = [
    generateMigrationTool
];

export async function executeToolCall(toolName: string, input: any) {
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
        throw new Error(`Tool not implemented: ${toolName}`);
    }

    return tool.execute(input);
}
