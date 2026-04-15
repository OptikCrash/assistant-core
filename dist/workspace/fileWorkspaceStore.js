"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWorkspaceStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const STORE_FILE = path_1.default.resolve(".workspace-store.json");
class FileWorkspaceStore {
    async readAll() {
        try {
            const data = await promises_1.default.readFile(STORE_FILE, "utf-8");
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    async writeAll(workspaces) {
        await promises_1.default.mkdir(path_1.default.dirname(STORE_FILE), { recursive: true });
        await promises_1.default.writeFile(STORE_FILE, JSON.stringify(workspaces, null, 2), "utf8");
    }
    async register(workspace) {
        const all = await this.readAll();
        const idx = all.findIndex(w => w.id === workspace.id);
        if (idx >= 0)
            all[idx] = workspace;
        else
            all.push(workspace);
        await this.writeAll(all);
    }
    async get(id) {
        const list = await this.readAll();
        return list.find(w => w.id === id);
    }
    async list() {
        return this.readAll();
    }
    async remove(id) {
        const list = await this.readAll();
        await this.writeAll(list.filter(w => w.id !== id));
    }
    async update(id, patch) {
        const all = await this.readAll();
        const idx = all.findIndex(w => w.id === id);
        if (idx < 0)
            throw new Error(`Workspace not found: ${id}`);
        const updated = {
            ...all[idx],
            ...patch,
            // merge nested objects safely
            metadata: { ...all[idx].metadata, ...patch.metadata },
            runtime: { ...all[idx].runtime, ...patch.runtime }
        };
        all[idx] = updated;
        await this.writeAll(all);
        return updated;
    }
}
exports.FileWorkspaceStore = FileWorkspaceStore;
