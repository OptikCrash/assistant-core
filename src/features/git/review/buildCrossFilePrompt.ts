import { FileReview } from "./types";

export function buildCrossFilePrompt(
    fileReviews: FileReview[]
): string {

    return `
        You are a senior software architect performing cross-file impact analysis.

        Each file review contains:

        - filename: string
        - fileType: string
        - imports: array of:
            {
                module: string,
                symbols: string[],
                isTypeOnly?: boolean
            }
        - exports: string[]
        - changedExports: string[]
        - review: structured file-level analysis

        Your task is to analyze structural ripple effects across files.

        You MUST:

        1. Detect dependency propagation risks:
        - If File A has changedExports including symbol X
        - AND File B imports symbol X from File A
        - THEN assess whether File B may break or require updates.

        2. Detect:
        - Exported symbol renames
        - Removed exports
        - Return type changes affecting callers
        - Interface changes affecting consumers
        - Schema drift across layers (DTO ↔ model ↔ migration)
        - Many-to-many relationship inconsistencies
        - Contract mismatches between files

        3. Ignore stylistic changes and formatting.

        4. Only report REAL structural risks.
        Do not speculate beyond the provided data.

        Respond ONLY with valid JSON in this structure:

        {
            "crossFileRisks": string[],
            "architecturalConcerns": string[]
        }

        Cross-file risks should:
        - Reference specific filenames when possible
        - Reference specific symbols when possible
        - Explain the ripple clearly and concisely

        Architectural concerns should:
        - Identify layering violations
        - Identify contract boundary erosion
        - Identify cross-layer drift

        Here is the structured file review data:

        ${JSON.stringify(fileReviews, null, 4)}

    `;
}
