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
