import { WorkspaceContext } from "./types";

export interface WorkspaceStore {
    register(workspace: WorkspaceContext): Promise<void>;
    get(id: string): Promise<WorkspaceContext | undefined>;
    list(): Promise<WorkspaceContext[]>;
    remove(id: string): Promise<void>;
}