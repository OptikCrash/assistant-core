export interface WorkspaceContext {
    rootPath: string;
    name?: string;
    gitBranch?: string;
    metadata?: Record<string, any>;
}
