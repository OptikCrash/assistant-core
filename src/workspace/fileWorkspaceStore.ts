import fs from "fs/promises";
import path from "path";
import { WorkspaceContext } from "./types";
import { WorkspaceStore } from "./workspaceStore";

const STORE_FILE = path.resolve(".workspace-store.json");

export class FileWorkspaceStore implements WorkspaceStore {

    private async load(): Promise<WorkspaceContext[]> {
        try {
            const data = await fs.readFile(STORE_FILE, "utf-8");
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    private async save(workspaces: WorkspaceContext[]) {
        await fs.writeFile(
            STORE_FILE,
            JSON.stringify(workspaces, null, 2)
        );
    }

    async register(workspace: WorkspaceContext) {
        const list = await this.load();
        const filtered = list.filter(w => w.id !== workspace.id);
        filtered.push(workspace);
        await this.save(filtered);
    }

    async get(id: string) {
        const list = await this.load();
        return list.find(w => w.id === id);
    }

    async list() {
        return this.load();
    }

    async remove(id: string) {
        const list = await this.load();
        await this.save(list.filter(w => w.id !== id));
    }
}