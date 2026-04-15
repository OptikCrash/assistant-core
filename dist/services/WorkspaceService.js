"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const workspaceRegistry_1 = require("../workspace/workspaceRegistry");
const runtimeDetector_1 = require("../workspace/runtimeDetector");
const workspaceIndexer_1 = require("../workspace/workspaceIndexer");
class WorkspaceService {
    // ---------------------------------------------------
    // Registration
    // ---------------------------------------------------
    async register(id, rootPath) {
        return (0, workspaceRegistry_1.registerWorkspace)(id, rootPath);
    }
    async unregister(id) {
        await (0, workspaceRegistry_1.unregisterWorkspace)(id);
    }
    // ---------------------------------------------------
    // Retrieval
    // ---------------------------------------------------
    async get(id) {
        return (0, workspaceRegistry_1.getWorkspace)(id);
    }
    async list() {
        return (0, workspaceRegistry_1.listWorkspaces)();
    }
    // ---------------------------------------------------
    // Runtime Refresh (fast)
    // ---------------------------------------------------
    async refreshRuntime(id) {
        const workspace = await (0, workspaceRegistry_1.getWorkspace)(id);
        const runtime = (0, runtimeDetector_1.detectWorkspaceRuntime)(workspace.rootPath);
        return (0, workspaceRegistry_1.updateWorkspaceRuntime)(id, runtime);
    }
    // ---------------------------------------------------
    // Indexing
    // ---------------------------------------------------
    async refreshIndex(id, depth = 5) {
        return (0, workspaceIndexer_1.refreshWorkspaceIndex)(id, depth);
    }
    async getIndex(id) {
        return (0, workspaceIndexer_1.getWorkspaceIndex)(id);
    }
    // ---------------------------------------------------
    // Full Refresh (optional helper)
    // ---------------------------------------------------
    async refreshAll(id, depth = 5) {
        const workspace = await (0, workspaceRegistry_1.getWorkspace)(id);
        workspace.runtime = (0, runtimeDetector_1.detectWorkspaceRuntime)(workspace.rootPath);
        const index = await (0, workspaceIndexer_1.refreshWorkspaceIndex)(id, depth);
        return {
            workspace,
            index
        };
    }
}
exports.WorkspaceService = WorkspaceService;
