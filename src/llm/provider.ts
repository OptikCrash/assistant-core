import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function generatePlanFromLLM(message: string) {
    const systemPrompt = `
You are an AI software engineering orchestrator.
You must respond ONLY with valid JSON.

The JSON must follow this structure:

{
  "intent": string,
  "reasoning": string,
  "steps": string[],
  "suggestedTools": string[]
}

No prose outside JSON.
`;

    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ]
    });

    const content = completion.choices[0].message.content;

    if (!content) {
        throw new Error("LLM returned empty response");
    }

    try {
        return JSON.parse(content);
    } catch (err) {
        console.error("Invalid JSON from LLM:", content);
        throw new Error("Failed to parse LLM response");
    }
}
