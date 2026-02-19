import { RiskLevel } from "../../../tools/types";

export interface StructuredIssue {
    message: string;
    risk: RiskLevel;
}

export interface DiffReview {
    summary: string;
    breakingChanges: string[];
    risks: string[];
    suggestions: string[];
    missingTests: string[];
    schemaConcerns: string[];
    crossFileRisks?: StructuredIssue[];
    architecturalConcerns?: StructuredIssue[];
    overallRisk: RiskLevel;
    confidence: number; // 0-100
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
