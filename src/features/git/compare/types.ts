export interface BranchComparisonRequest {
    workspaceId: string;
    yourRef: string;
    theirBaseRef: string;
    theirMergeRefs?: string[];
    baseRef?: string;
    fetch?: boolean;
    remote?: string;
    includePatches?: boolean;
}

export interface DiffShortStat {
    filesChanged: number;
    insertions: number;
    deletions: number;
}

export interface BranchDiffArtifact {
    ref: string;
    files: string[];
    fileCount: number;
    shortStat: DiffShortStat;
    stat: string;
    patch?: string;
}

export interface BranchComparisonResult {
    workspaceId: string;
    baseRef: string;
    fetched: boolean;
    yourRef: string;
    theirCombined: {
        baseRef: string;
        mergeRefs: string[];
        combinedLabel: string;
    };
    your: BranchDiffArtifact;
    theirs: BranchDiffArtifact;
    overlappingFiles: string[];
    overlapCount: number;
    overlapPercentOfYours: number;
    overlapPercentOfTheirs: number;
    onlyInYours: string[];
    onlyInTheirs: string[];
}

export class BranchMergeConflictError extends Error {
    constructor(
        public readonly mergeRef: string,
        public readonly conflictFiles: string[],
        public readonly commandOutput?: string
    ) {
        super(
            conflictFiles.length > 0
                ? `Unable to merge ${mergeRef} into comparison branch. Conflicts in: ${conflictFiles.join(", ")}`
                : `Unable to merge ${mergeRef} into comparison branch.`
        );

        this.name = "BranchMergeConflictError";
    }
}
