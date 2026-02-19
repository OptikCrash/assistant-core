interface Workspace {
    id: string;
    rootPath: string;
}

const workspaces = new Map<string, Workspace>();

export function registerWorkspace(id: string, rootPath: string) {
    workspaces.set(id, { id, rootPath });
}

export function getWorkspace(id: string): Workspace {
    const ws = workspaces.get(id);
    if (!ws) throw new Error("Workspace not found");
    return ws;
}
