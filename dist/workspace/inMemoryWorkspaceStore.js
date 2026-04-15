"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryWorkspaceStore = void 0;
class InMemoryWorkspaceStore {
    constructor() {
        this.workspaces = new Map();
    }
    async register(workspace) {
        this.workspaces.set(workspace.id, workspace);
    }
    async get(id) {
        return this.workspaces.get(id);
    }
    async list() {
        return Array.from(this.workspaces.values());
    }
    async remove(id) {
        this.workspaces.delete(id);
    }
}
exports.InMemoryWorkspaceStore = InMemoryWorkspaceStore;
