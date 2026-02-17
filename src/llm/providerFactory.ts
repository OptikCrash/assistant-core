import { OpenAIProvider } from './openaiProvider';
import { LLMProvider } from './types';

export function createProvider(): LLMProvider {
    const provider = process.env.LLM_PROVIDER || 'openai';

    switch (provider) {
        case 'openai':
            return new OpenAIProvider(process.env.OPENAI_API_KEY || '');

        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}
