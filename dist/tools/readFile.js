"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileTool = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const pathUtils_1 = require("./pathUtils");
const ReadFileSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().optional(),
    rootPath: zod_1.z.string().optional(), // Legacy support
    filePath: zod_1.z.string()
}).refine(data => data.workspaceId || data.rootPath, {
    message: "Either workspaceId or rootPath must be provided"
});
exports.readFileTool = {
    name: "read_file",
    risk: "LOW",
    schema: ReadFileSchema,
    async execute(input) {
        // Support both workspaceId and legacy rootPath
        const rootPath = input.workspaceId
            ? await (0, pathUtils_1.resolveWorkspacePath)(input.workspaceId)
            : path_1.default.resolve(input.rootPath);
        const absolutePath = await (0, pathUtils_1.resolveSafePathAsync)(rootPath, input.filePath);
        const stat = await fs_1.promises.stat(absolutePath);
        if (!stat.isFile()) {
            throw new Error("Not a file");
        }
        const content = await fs_1.promises.readFile(absolutePath, "utf8");
        return { content };
    }
};
