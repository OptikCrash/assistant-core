import fs from "fs";
import path from "path";
import { FileWorkspaceStore } from "./fileWorkspaceStore";
import { detectWorkspaceMetadata } from "./metadataDetector";
import { WorkspaceContext } from "./types";

const store = new FileWorkspaceStore();

export async function registerWorkspace(
    id: string,
    rootPath: string
): Promise<WorkspaceContext> {

    const normalizedPath = path.resolve(rootPath);

    if (!fs.existsSync(normalizedPath)) {
        throw new Error(`Path does not exist: ${normalizedPath}`);
    }

    if (!fs.existsSync(path.join(normalizedPath, ".git"))) {
        throw new Error("Not a git repository");
    }

    const metadata = await detectWorkspaceMetadata(normalizedPath);

    const workspace: WorkspaceContext = {
        id,
        rootPath: normalizedPath,
        metadata
    };

    await store.register(workspace);

    return workspace;
}

export async function getWorkspace(id: string): Promise<WorkspaceContext> {
    const workspace = await store.get(id);

    if (!workspace) {
        throw new Error(`Workspace not found: ${id}`);
    }

    return workspace;
}

export async function listWorkspaces(): Promise<WorkspaceContext[]> {
    return store.list();
}

export async function unregisterWorkspace(id: string): Promise<void> {
    await store.remove(id);
}