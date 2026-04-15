"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectWorkspaceStack = detectWorkspaceStack;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function detectWorkspaceStack(rootPath) {
    const result = {
        isNode: false,
        isAngular: false,
        isSequelize: false,
        isPostgres: false,
        isGitRepo: false
    };
    try {
        await promises_1.default.access(path_1.default.join(rootPath, ".git"));
        result.isGitRepo = true;
    }
    catch { }
    try {
        const pkg = JSON.parse(await promises_1.default.readFile(path_1.default.join(rootPath, "package.json"), "utf-8"));
        result.isNode = true;
        if (pkg.dependencies?.["@angular/core"])
            result.isAngular = true;
        if (pkg.dependencies?.["sequelize"])
            result.isSequelize = true;
        if (pkg.dependencies?.["pg"])
            result.isPostgres = true;
    }
    catch { }
    return result;
}
