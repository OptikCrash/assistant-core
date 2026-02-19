import { FileReview } from "./types";

export function buildCrossFilePrompt(
    fileReviews: FileReview[]
): string {

    return `
        You are a senior software architect performing cross-file dependency analysis.

        Each file review contains:

        - filename: string
        - imports: array of { module: string, symbols: string[], isTypeOnly?: boolean }
        - exports: string[]
        - exportChanges:
            {
            added: string[],
            removed: string[]
            }
        - methodChanges:
            {
            added: string[],
            removed: string[]
            }
        - review: file-level structured review

        IMPORTANT:
        - imports[].module refers to the normalized module path of another file.
        - If imports[].module matches another file's filename,
        that file is a dependency.

        Your responsibilities:

        1. Breaking export detection:
        - If File A has exportChanges.removed including symbol X
        - AND File B imports symbol X from File A
        - This is a HIGH confidence breaking change.

        2. Rename detection:
        - If File A has both exportChanges.removed: X
            AND exportChanges.added: Y
        - AND File B imports X
        - This likely indicates a rename not propagated.

        3. Method signature contract drift:
        - If methodChanges.removed contains signature S
        - AND methodChanges.added contains a similar method name with different parameters or return type
        - Treat this as a signature change.
        - If callers import the class containing this method,
            this is a HIGH confidence ripple risk.

        4. Layer integrity:
        - Detect schema drift across DTO ↔ model ↔ migration layers.
        - Detect many-to-many mismatches.
        - Detect architectural boundary violations.

        5. Only report REAL structural risks.
        - Do NOT speculate.
        - Do NOT repeat file-level summaries.
        - Do NOT mention changes unless they create cross-file impact.

        Respond ONLY with valid JSON in this structure:

        {
        "crossFileRisks": string[],
        "architecturalConcerns": string[]
        }

        Here is the structured file review data:

        ${JSON.stringify(fileReviews, null, 4)}
    `;
}
