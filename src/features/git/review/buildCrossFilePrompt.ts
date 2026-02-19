import { FileReview } from "./types";

export function buildCrossFilePrompt(
    fileReviews: FileReview[]
): string {

    return `
        You are a senior software architect performing cross-file impact analysis.

        Each file review contains:

        - filename
        - imports: array of { module, symbols, isTypeOnly }
        - exports: string[]
        - exportChanges:
            {
            added: string[],
            removed: string[]
            }
        - review: file-level structured review

        Your task:

        1. Detect breaking ripple effects:
        - If a file has exportChanges.removed including symbol X
        - AND another file imports symbol X
        - THEN this is a HIGH confidence break.

        2. Detect renames:
        - If a file has both removed: X and added: Y
        - AND another file imports X
        - This likely indicates a rename not propagated.

        3. Detect contract drift:
        - Return type changes affecting callers
        - Interface changes affecting consumers
        - Schema drift across layers

        4. Only report real structural risks.
        Do NOT speculate.
        Do NOT repeat file-level summary comments.

        Respond ONLY with valid JSON:

        {
        "crossFileRisks": string[],
        "architecturalConcerns": string[]
        }

        Here is the structured file data:

        ${JSON.stringify(fileReviews, null, 4)}
    `;
}
