"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCrossFilePrompt = buildCrossFilePrompt;
function buildCrossFilePrompt(fileReviews) {
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
            "crossFileRisks": [
                {
                "message": string,
                "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
                }
            ],
            "architecturalConcerns": [
                {
                "message": string,
                "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
                }
            ]
        }

        Severity guidance:

        CRITICAL:
        - Removed exports still imported
        - Breaking signature changes across files
        - Async to sync conversion
        - Removed methods still referenced

        HIGH:
        - Return type changes affecting callers
        - Interface contract drift
        - Many-to-many mismatch across layers

        MEDIUM:
        - Rename not propagated
        - DTO / model misalignment
        - Layering violations

        LOW:
        - Structural smells without immediate breakage

        Here is the structured file review data:

        ${JSON.stringify(fileReviews, null, 4)}
    `;
}
