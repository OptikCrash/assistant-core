import { WorkspaceContext } from "./types";
import { WorkspaceStore } from "./workspaceStore";

export class InMemoryWorkspaceStore implements WorkspaceStore {
    private workspaces = new Map<string, WorkspaceContext>();

    async register(workspace: WorkspaceContext) {
        this.workspaces.set(workspace.id, workspace);
    }

    async get(id: string) {
        return this.workspaces.get(id);
    }

    async list() {
        return Array.from(this.workspaces.values());
    }

    async remove(id: string) {
        this.workspaces.delete(id);
    }
}