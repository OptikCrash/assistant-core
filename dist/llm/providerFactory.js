"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProvider = createProvider;
const openaiProvider_1 = require("./openaiProvider");
function createProvider() {
    const provider = process.env.LLM_PROVIDER || 'openai';
    switch (provider) {
        case 'openai':
            return new openaiProvider_1.OpenAIProvider(process.env.OPENAI_API_KEY || '');
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}
