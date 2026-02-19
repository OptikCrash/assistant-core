export interface DiffReview {
    summary: string;
    breakingChanges: string[];
    risks: string[];
    suggestions: string[];
    missingTests: string[];
    schemaConcerns: string[];
    crossFileRisks?: string[];
    architecturalConcerns?: string[];
}

export interface FileReview {
    filename: string;
    fileType: string;
    imports: ImportSpec[];
    exports: string[];
    exportChanges: {
        added: string[];
        removed: string[];
    };
    methodChanges: {
        added: string[];
        removed: string[];
    };
    review: DiffReview;
}

export interface ImportSpec {
    module: string;      // e.g. "./ReviewEngine", "express"
    symbols: string[];   // e.g. ["ReviewEngine", "somethingElse"] or ["* as tools"]
    isTypeOnly?: boolean;
}
