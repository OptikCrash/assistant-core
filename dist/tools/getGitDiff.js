"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitDiffTool = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const zod_1 = require("zod");
const pathUtils_1 = require("./pathUtils");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const GetGitDiffSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().optional(),
    rootPath: zod_1.z.string().optional(), // Legacy support
    staged: zod_1.z.boolean().optional(),
    baseBranch: zod_1.z.string().optional()
}).refine(data => data.workspaceId || data.rootPath, {
    message: "Either workspaceId or rootPath must be provided"
});
exports.getGitDiffTool = {
    name: "get_git_diff",
    risk: "LOW",
    schema: GetGitDiffSchema,
    async execute(input) {
        // Support both workspaceId and legacy rootPath
        const rootPath = input.workspaceId
            ? await (0, pathUtils_1.resolveWorkspacePath)(input.workspaceId)
            : path_1.default.resolve(input.rootPath);
        const { staged, baseBranch } = input;
        let command = "git diff";
        if (staged) {
            command = "git diff --staged";
        }
        else if (baseBranch) {
            command = `git diff ${baseBranch}`;
        }
        const { stdout } = await execAsync(command, {
            cwd: rootPath,
            maxBuffer: 10 * 1024 * 1024
        });
        return { diff: stdout };
    }
};
