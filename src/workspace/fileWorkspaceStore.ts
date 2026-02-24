import fs from "fs/promises";
import path from "path";
import { WorkspaceContext } from "./types";
import { WorkspaceStore } from "./workspaceStore";

const STORE_FILE = path.resolve(".workspace-store.json");

export class FileWorkspaceStore implements WorkspaceStore {

    private async readAll(): Promise<WorkspaceContext[]> {
        try {
            const data = await fs.readFile(STORE_FILE, "utf-8");
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private async writeAll(workspaces: WorkspaceContext[]): Promise<void> {
        await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
        await fs.writeFile(STORE_FILE, JSON.stringify(workspaces, null, 2), "utf8");
    }

    async register(workspace: WorkspaceContext): Promise<void> {
        const all = await this.readAll();
        const idx = all.findIndex(w => w.id === workspace.id);
        if (idx >= 0) all[idx] = workspace;
        else all.push(workspace);
        await this.writeAll(all);
    }

    async get(id: string): Promise<WorkspaceContext | undefined> {
        const list = await this.readAll();
        return list.find(w => w.id === id);
    }

    async list(): Promise<WorkspaceContext[]> {
        return this.readAll();
    }

    async remove(id: string): Promise<void> {
        const list = await this.readAll();
        await this.writeAll(list.filter(w => w.id === id));
    }

    async update(id: string, patch: Partial<WorkspaceContext>): Promise<WorkspaceContext> {
        const all = await this.readAll();
        const idx = all.findIndex(w => w.id === id);
        if (idx < 0) throw new Error(`Workspace not found: ${id}`);

        const updated: WorkspaceContext = {
            ...all[idx],
            ...patch,
            // merge nested objects safely
            metadata: { ...all[idx].metadata, ...(patch as any).metadata },
            runtime: { ...all[idx].runtime, ...(patch as any).runtime }
        };

        all[idx] = updated;
        await this.writeAll(all);
        return updated;
    }
}