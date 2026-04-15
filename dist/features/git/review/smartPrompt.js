"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSmartFilePrompt = buildSmartFilePrompt;
function buildSmartFilePrompt(filename, fileType, analysisContent, diff) {
    return `
        You are a senior software engineer performing static analysis.

        You are reviewing a single updated file.

        FILE NAME:
        ${filename}

        FILE TYPE:
        ${fileType}

        IMPORTANT:
        You may be given only PARTIAL file content focused around changed areas.
        Do NOT assume you are seeing the entire file.
        Only analyze what is provided.

        ========================
        RELEVANT UPDATED CONTENT
        ========================
        ${analysisContent}

        ========================
        GIT DIFF (for reference)
        ========================
        ${diff}

        ========================
        ANALYSIS INSTRUCTIONS
        ========================

        Focus ONLY on concrete technical issues such as:

        • Logical errors
        • Async/await mistakes
        • Incorrect return paths
        • Unhandled null/undefined
        • Type mismatches
        • Broken imports/exports
        • Incorrect Sequelize associations
        • Migration safety risks
        • DTO/model drift
        • Many-to-many relationship correctness
        • Foreign key integrity issues
        • Transaction safety
        • Angular form/model inconsistencies
        • Breaking API contract changes

        DO NOT:
        • Summarize the PR
        • Restate the diff
        • Give generic advice
        • Suggest stylistic improvements
        • Invent issues outside provided content

        If no real issues exist, return empty arrays.

        ========================
        RESPONSE FORMAT
        ========================

        Respond ONLY with valid JSON in this structure:

        {
        "summary": string,
        "breakingChanges": string[],
        "risks": string[],
        "suggestions": string[],
        "missingTests": string[],
        "schemaConcerns": string[]
        }
    `;
}
