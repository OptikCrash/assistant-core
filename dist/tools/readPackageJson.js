"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPackageJsonTool = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const zod_1 = require("zod");
const pathUtils_1 = require("./pathUtils");
const ReadPackageJsonSchema = zod_1.z.object({
    workspaceId: zod_1.z.string()
});
exports.readPackageJsonTool = {
    name: "read_package_json",
    risk: "LOW",
    schema: ReadPackageJsonSchema,
    async execute({ workspaceId }) {
        const rootPath = await (0, pathUtils_1.resolveWorkspacePath)(workspaceId);
        const filePath = await (0, pathUtils_1.resolveSafePathAsync)(rootPath, "package.json");
        const content = await promises_1.default.readFile(filePath, "utf-8");
        return JSON.parse(content);
    }
};
