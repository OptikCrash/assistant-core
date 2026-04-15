"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewDiff = reviewDiff;
const zod_1 = require("zod");
const providerFactory_1 = require("../../../llm/providerFactory");
const getGitDiff_1 = require("../../../tools/getGitDiff");
const prompt_1 = require("./prompt");
const provider = (0, providerFactory_1.createProvider)();
async function reviewDiff(workspaceId, staged = true) {
    // 1. Get diff from tool
    const diffResult = await getGitDiff_1.getGitDiffTool.execute({ workspaceId, staged });
    const diff = diffResult.diff;
    if (!diff || diff.trim().length === 0) {
        throw new Error("No diff found.");
    }
    // 2. Build review prompt
    const prompt = (0, prompt_1.buildReviewPrompt)(diff);
    // 3. Ask LLM for structured review
    const completion = await provider.generateRawJson(prompt);
    const DiffReviewSchema = zod_1.z.object({
        summary: zod_1.z.string(),
        breakingChanges: zod_1.z.array(zod_1.z.string()),
        risks: zod_1.z.array(zod_1.z.string()),
        suggestions: zod_1.z.array(zod_1.z.string()),
        missingTests: zod_1.z.array(zod_1.z.string()),
        schemaConcerns: zod_1.z.array(zod_1.z.string())
    });
    const parsed = DiffReviewSchema.parse(completion);
    return {
        ...parsed,
        overallRisk: thisInferRisk(parsed),
        confidence: 50 // baseline heuristic
    };
}
function thisInferRisk(parsed) {
    if (parsed.breakingChanges.length > 0)
        return "HIGH";
    if (parsed.risks.length > 2)
        return "MEDIUM";
    return "LOW";
}
