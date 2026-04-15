"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWorkspace = registerWorkspace;
exports.getWorkspace = getWorkspace;
exports.listWorkspaces = listWorkspaces;
exports.unregisterWorkspace = unregisterWorkspace;
exports.updateWorkspaceRuntime = updateWorkspaceRuntime;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fileWorkspaceStore_1 = require("./fileWorkspaceStore");
const metadataDetector_1 = require("./metadataDetector");
const store = new fileWorkspaceStore_1.FileWorkspaceStore();
async function registerWorkspace(id, rootPath) {
    const normalizedPath = path_1.default.resolve(rootPath);
    if (!fs_1.default.existsSync(normalizedPath)) {
        throw new Error(`Path does not exist: ${normalizedPath}`);
    }
    if (!fs_1.default.existsSync(path_1.default.join(normalizedPath, ".git"))) {
        throw new Error("Not a git repository");
    }
    const metadata = await (0, metadataDetector_1.detectWorkspaceMetadata)(normalizedPath);
    const workspace = {
        id,
        rootPath: normalizedPath,
        metadata
    };
    await store.register(workspace);
    return workspace;
}
async function getWorkspace(id) {
    const workspace = await store.get(id);
    if (!workspace) {
        throw new Error(`Workspace not found: ${id}`);
    }
    return workspace;
}
async function listWorkspaces() {
    return store.list();
}
async function unregisterWorkspace(id) {
    await store.remove(id);
}
async function updateWorkspaceRuntime(id, runtime) {
    return store.update(id, { runtime });
}
