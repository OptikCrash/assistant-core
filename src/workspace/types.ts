export interface WorkspaceStaticMetadata {
    languages: string[];
    frameworks: string[];
    databases: string[];
    orm: string[];
    testFrameworks: string[];
    packageManager?: string;
    hasDocker: boolean;
    defaultBranch?: string;
}

export interface WorkspaceRuntimeState {
    currentBranch?: string;
    defaultBranch?: string;
    hasUncommittedChanges: boolean;
    hasStagedChanges: boolean;
    aheadBy?: number;
    behindBy?: number;
    dirty: boolean;
    untrackedFiles: number;
    lastCommitHash: string;
    lastCommitDate: string;
}

export interface WorkspaceContext {
    id: string;
    rootPath: string;
    metadata: WorkspaceStaticMetadata;     // static
    runtime?: WorkspaceRuntimeState; // refreshable
}