import {
    getWorkspace,
    listWorkspaces,
    registerWorkspace,
    unregisterWorkspace,
    updateWorkspaceRuntime
} from "../workspace/workspaceRegistry";

import { detectWorkspaceRuntime } from "../workspace/runtimeDetector";

import {
    getWorkspaceIndex,
    refreshWorkspaceIndex
} from "../workspace/workspaceIndexer";

import { WorkspaceContext } from "../workspace/types";

export class WorkspaceService {

    // ---------------------------------------------------
    // Registration
    // ---------------------------------------------------

    async register(id: string, rootPath: string): Promise<WorkspaceContext> {
        return registerWorkspace(id, rootPath);
    }

    async unregister(id: string): Promise<void> {
        await unregisterWorkspace(id);
    }

    // ---------------------------------------------------
    // Retrieval
    // ---------------------------------------------------

    async get(id: string): Promise<WorkspaceContext> {
        return getWorkspace(id);
    }

    async list(): Promise<WorkspaceContext[]> {
        return listWorkspaces();
    }

    // ---------------------------------------------------
    // Runtime Refresh (fast)
    // ---------------------------------------------------

    async refreshRuntime(id: string): Promise<WorkspaceContext> {

        const workspace = await getWorkspace(id);

        const runtime = detectWorkspaceRuntime(workspace.rootPath);

        return updateWorkspaceRuntime(id, runtime);
    }

    // ---------------------------------------------------
    // Indexing
    // ---------------------------------------------------

    async refreshIndex(id: string, depth = 5) {
        return refreshWorkspaceIndex(id, depth);
    }

    async getIndex(id: string) {
        return getWorkspaceIndex(id);
    }

    // ---------------------------------------------------
    // Full Refresh (optional helper)
    // ---------------------------------------------------

    async refreshAll(id: string, depth = 5) {

        const workspace = await getWorkspace(id);

        workspace.runtime = detectWorkspaceRuntime(workspace.rootPath);

        const index = await refreshWorkspaceIndex(id, depth);

        return {
            workspace,
            index
        };
    }
}