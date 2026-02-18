import OpenAI from 'openai';
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

}
