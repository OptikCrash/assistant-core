import { DiffReview } from "./types";

export function buildCrossFilePrompt(
    fileReviews: DiffReview[]
): string {
    return `
        You are performing cross-file architectural analysis.

        Below are structured static analysis results for multiple files:

        ${JSON.stringify(fileReviews, null, 4)}

        Identify cross-file inconsistencies such as:

        • Migration added without model update
        • Model updated without migration
        • DTO changed without API update
        • Many-to-many relationship misalignment
        • Foreign key inconsistencies
        • Association changes without corresponding schema updates
        • Breaking changes not propagated across layers

        Respond ONLY with valid JSON:

        {
        "crossFileRisks": string[],
        "architecturalConcerns": string[]
        }

        If none exist, return empty arrays.
    `;
}
