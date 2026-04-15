"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeToolCall = executeToolCall;
const generateMigration_1 = require("./generateMigration");
const getGitDiff_1 = require("./getGitDiff");
const tools = [
    generateMigration_1.generateMigrationTool,
    getGitDiff_1.getGitDiffTool
];
async function executeToolCall(toolName, input) {
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
        throw new Error(`Tool not implemented: ${toolName}`);
    }
    const parsed = tool.schema.safeParse(input);
    if (!parsed.success) {
        throw new Error(`Invalid input for tool ${toolName}: ${parsed.error.message}`);
    }
    return tool.execute(parsed.data);
}
