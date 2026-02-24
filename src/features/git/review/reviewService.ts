import { z } from 'zod';
import { createProvider } from '../../../llm/providerFactory';
import { getGitDiffTool } from '../../../tools/getGitDiff';
import { RiskLevel } from '../../../tools/types';
import { buildReviewPrompt } from './prompt';
import { DiffReview } from './types';

const provider = createProvider();

export async function reviewDiff(
    workspaceId: string,
    staged = true
): Promise<DiffReview> {

    // 1. Get diff from tool
    const diffResult = await getGitDiffTool.execute({ workspaceId, staged });

    const diff = diffResult.diff;

    if (!diff || diff.trim().length === 0) {
        throw new Error("No diff found.");
    }

    // 2. Build review prompt
    const prompt = buildReviewPrompt(diff);

    // 3. Ask LLM for structured review
    const completion = await provider.generateRawJson<DiffReview>(prompt);

    const DiffReviewSchema = z.object({
        summary: z.string(),
        breakingChanges: z.array(z.string()),
        risks: z.array(z.string()),
        suggestions: z.array(z.string()),
        missingTests: z.array(z.string()),
        schemaConcerns: z.array(z.string())
    });

    const parsed = DiffReviewSchema.parse(completion);

    return {
        ...parsed,
        overallRisk: thisInferRisk(parsed),
        confidence: 50 // baseline heuristic
    };
}

function thisInferRisk(parsed: {
    breakingChanges: string[];
    risks: string[];
}): RiskLevel {

    if (parsed.breakingChanges.length > 0) return "HIGH";
    if (parsed.risks.length > 2) return "MEDIUM";
    return "LOW";
}