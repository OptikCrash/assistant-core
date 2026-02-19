import OpenAI from 'openai';
import { DiffReview } from '../features/git/review/types';
import { TOOL_REGISTRY } from '../tools/registry';
import { TaskPlan } from '../types/messages';
import { LLMProvider } from './types';

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("OpenAI API key is missing.");
        }

        this.client = new OpenAI({ apiKey });
    }

    async generatePlan(message: string): Promise<TaskPlan> {
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

            ${TOOL_REGISTRY.map(t => `- ${t.name}: ${t.description}`).join("\n")}

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

            const plan: TaskPlan = JSON.parse(content);

            // Validate tool selection
            const allowedTools = TOOL_REGISTRY.map(t => t.name);

            for (const call of plan.toolCalls) {
                if (!allowedTools.includes(call.tool)) {
                    throw new Error(`Invalid tool selected: ${call.tool}`);
                }

                if (typeof call.input !== "object" || call.input === null) {
                    throw new Error(`Tool ${call.tool} missing valid input object`);
                }
            }

            return plan;

        } catch (err) {
            console.error("Invalid JSON or invalid tools from LLM:", content);
            throw err;
        }

    }

    async generateRawJson<T>(prompt: string): Promise<T> {
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

    async generateStructuredJson<T>(prompt: string): Promise<T> {
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

        return JSON.parse(cleaned) as T;
    }

}

export function buildCrossFilePrompt(reviews: DiffReview[]): string {
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

export function stripMarkdown(text: string): string {
    return text
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/, "")
        .trim();
}