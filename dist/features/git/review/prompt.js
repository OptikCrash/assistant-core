"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReviewPrompt = buildReviewPrompt;
function buildReviewPrompt(diff) {
    return `
        You are a senior software engineer reviewing a Git diff.

        You are reviewing a TypeScript project using:
        - Node 18
        - Express
        - Sequelize ORM
        - PostgreSQL
        - Angular 15+
        - Strict TypeScript
        - Zod for validation

        Respond ONLY with valid JSON in this structure:

        {
        "summary": string,
        "breakingChanges": string[],
        "risks": string[],
        "suggestions": string[],
        "missingTests": string[],
        "schemaConcerns": string[]
        }

        Review the following diff carefully.


        Focus on:
        - Sequelize association correctness
        - Migration safety
        - DTO consistency
        - Null handling
        - Type safety
        - Risk of breaking API contracts
        - Many-to-many relationship correctness
        - Transaction safety
        - Foreign key integrity
        - Angular form/model drift

        Here is the diff:

        ${diff}
        `;
}
