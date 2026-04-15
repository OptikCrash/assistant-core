"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
exports.buildCrossFilePrompt = buildCrossFilePrompt;
exports.stripMarkdown = stripMarkdown;
const openai_1 = __importDefault(require("openai"));
const registry_1 = require("../tools/registry");
class OpenAIProvider {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error("OpenAI API key is missing.");
        }
        this.client = new openai_1.default({ apiKey });
    }
    async generatePlan(message) {
        const systemPrompt = `
            You are an AI software engineering orchestrator.

            Respond ONLY with valid JSON in this structure:

            {
            "intent": string,
            "reasoning": string,
            "steps": string[],
            "toolCalls": [
                {
                "tool": string,
                "input": object
                }
            ]
            }

            You may only select tools from the following list:

            ${registry_1.TOOL_REGISTRY.map(t => `- ${t.name}: ${t.description}`).join("\n")}

            Do not invent tools.
            Every tool call must include an input object.
            `;
        const completion = await this.client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ]
        });
        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("Empty response from LLM.");
        }
        try {
            const plan = JSON.parse(content);
            // Validate tool selection
            const allowedTools = registry_1.TOOL_REGISTRY.map(t => t.name);
            for (const call of plan.toolCalls) {
                if (!allowedTools.includes(call.tool)) {
                    throw new Error(`Invalid tool selected: ${call.tool}`);
                }
                if (typeof call.input !== "object" || call.input === null) {
                    throw new Error(`Tool ${call.tool} missing valid input object`);
                }
            }
            return plan;
        }
        catch (err) {
            console.error("Invalid JSON or invalid tools from LLM:", content);
            throw err;
        }
    }
    async generateRawJson(prompt) {
        const completion = await this.client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            messages: [
                { role: "system", content: "Respond ONLY with valid JSON." },
                { role: "user", content: prompt }
            ]
        });
        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("Empty response from LLM.");
        }
        return JSON.parse(content);
    }
    async generateStructuredJson(prompt) {
        const completion = await this.client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            messages: [
                { role: "system", content: "Respond ONLY with valid JSON." },
                { role: "user", content: prompt }
            ]
        });
        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("Empty response from LLM.");
        }
        const cleaned = stripMarkdown(content);
        return JSON.parse(cleaned);
    }
}
exports.OpenAIProvider = OpenAIProvider;
function buildCrossFilePrompt(reviews) {
    return `
        You are analyzing multiple file-level static analysis results.

        Here are the results:

        ${JSON.stringify(reviews, null, 4)}

        Identify cross-file inconsistencies such as:
        - Migration added but model not updated
        - Model updated but DTO unchanged
        - DTO updated but API layer unchanged
        - Association change without migration
        - Breaking change without version update

        Return structured JSON:
        {
        "crossFileRisks": string[],
        "architecturalConcerns": string[]
        }
    `;
}
function stripMarkdown(text) {
    return text
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/, "")
        .trim();
}
