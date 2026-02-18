# LLM (Large Language Model)

This directory contains the abstraction layer for Large Language Model providers, allowing the system to interface with different AI services through a common interface.

## Overview

The LLM module provides:

- **Provider abstraction** - Unified interface for different LLM services
- **Factory pattern** - Easy switching between providers via configuration
- **Type safety** - TypeScript interfaces for all LLM interactions
- **Error handling** - Consistent error handling across providers

## Architecture

```text
LLM Module
│
├── types.ts           → LLMProvider interface definition
├── providerFactory.ts → Factory to create provider instances
└── openaiProvider.ts  → OpenAI implementation
```

## Files

### [types.ts](types.ts)

Defines the contract that all LLM providers must implement.

#### LLMProvider Interface

```typescript
interface LLMProvider {
  generatePlan(message: string): Promise<TaskPlan>;
  generateRawJson<T>(prompt: string): Promise<T>;
}
```

**Methods:**

**`generatePlan(message: string): Promise<TaskPlan>`**

- Converts a natural language message into a structured TaskPlan
- Includes tool selection, reasoning, and execution steps
- Validates that selected tools exist in the registry

**`generateRawJson<T>(prompt: string): Promise<T>`**

- Generic method for getting structured JSON responses
- Used for specialized tasks like code review
- Type parameter `T` ensures type safety for the response

---

### [providerFactory.ts](providerFactory.ts)

Factory function that creates and configures the appropriate LLM provider based on environment configuration.

#### Key Function

**`createProvider(): LLMProvider`**

Creates an LLM provider instance based on environment variables.

**Configuration:**

- Reads `LLM_PROVIDER` environment variable (defaults to "openai")
- Validates provider is supported
- Passes necessary API keys from environment

**Environment Variables:**

- `LLM_PROVIDER` - Provider name ("openai" is currently the only supported option)
- `OPENAI_API_KEY` - API key for OpenAI (required when using OpenAI)

**Example Usage:**

```typescript
// In .env file:
// LLM_PROVIDER=openai
// OPENAI_API_KEY=sk-...

const provider = createProvider();
const plan = await provider.generatePlan("Add email field to users");
```

**Error Handling:**

- Throws if provider is not recognized
- OpenAI provider throws if API key is missing

---

### [openaiProvider.ts](openaiProvider.ts)

Concrete implementation of the LLMProvider interface using OpenAI's API.

#### OpenAIProvider Class

**Constructor:**

```typescript
constructor(apiKey: string)
```

- Validates API key is provided
- Initializes OpenAI client

**Configuration:**

- Model: `gpt-4o-mini` (cost-effective and fast)
- Temperature: `0.2` (low randomness for consistent outputs)

---

#### Methods

**`generatePlan(message: string): Promise<TaskPlan>`**

Generates a structured task plan from a natural language request.

**Process:**

1. Constructs system prompt with tool registry
2. Sends message to OpenAI chat completions API
3. Parses JSON response
4. Validates tool selection against registry
5. Validates input objects are present
6. Returns validated TaskPlan

**System Prompt Structure:**

```typescript
{
  role: "system",
  content: `
    You are an AI software engineering orchestrator.
    
    Respond ONLY with valid JSON in this structure:
    {
      "intent": string,
      "reasoning": string,
      "steps": string[],
      "toolCalls": [...]
    }
    
    Available tools:
    - read_schema: Read database schema metadata
    - generate_migration: Generate SQL migration file
    ...
  `
}
```

**Validation:**

- Ensures response is valid JSON
- Verifies all tool names exist in TOOL_REGISTRY
- Confirms each tool call has an input object
- Throws errors for invalid responses

**Example:**

```typescript
const provider = new OpenAIProvider(process.env.OPENAI_API_KEY);
const plan = await provider.generatePlan(
  "Create a migration to add an index on the users.email field"
);
// Returns:
// {
//   intent: "Add database index for email lookups",
//   reasoning: "Improve query performance for email searches",
//   steps: ["Read current schema", "Generate migration with index"],
//   toolCalls: [
//     { tool: "read_schema", input: { table: "users" } },
//     { tool: "generate_migration", input: { ... } }
//   ]
// }
```

---

**`generateRawJson<T>(prompt: string): Promise<T>`**

Generic method for getting structured JSON from the LLM.

**Use Cases:**

- Code review analysis
- Custom structured outputs
- Validation checks
- Any task requiring specific JSON schema

**Configuration:**

- Uses same model and temperature as generatePlan
- Simple system prompt: "Respond ONLY with valid JSON"
- Returns parsed JSON cast to type T

**Example:**

```typescript
interface CodeReview {
  summary: string;
  issues: string[];
  suggestions: string[];
}

const review = await provider.generateRawJson<CodeReview>(
  "Review this git diff and provide feedback: \\n" + diff
);
// Returns typed CodeReview object
```

---

## Adding a New Provider

To add support for a new LLM provider (e.g., Anthropic Claude, Google Gemini):

### 1. Create Provider Implementation

Create a new file `src/llm/anthropicProvider.ts`:

```typescript
import { LLMProvider } from './types';
import { TaskPlan } from '../types/messages';

export class AnthropicProvider implements LLMProvider {
  private client: any; // Anthropic client

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Anthropic API key is missing.");
    }
    // Initialize client
  }

  async generatePlan(message: string): Promise<TaskPlan> {
    // Implement using Anthropic API
  }

  async generateRawJson<T>(prompt: string): Promise<T> {
    // Implement using Anthropic API
  }
}
```

### 2. Register in Factory

Update [providerFactory.ts](providerFactory.ts):

```typescript
import { AnthropicProvider } from './anthropicProvider';

export function createProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'openai';

  switch (provider) {
    case 'openai':
      return new OpenAIProvider(process.env.OPENAI_API_KEY || '');
    
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY || '');
    
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
```

### 3. Update Environment Variables

Add to `.env`:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key-here
```

## Error Handling

Common errors and how they're handled:

| Error | Cause | Handling |
| ------- | ------- | ---------- |
| "OpenAI API key is missing" | No API key in env | Thrown in constructor |
| "Empty response from LLM" | API returned null content | Thrown after API call |
| "Invalid tool selected" | LLM chose non-existent tool | Thrown during validation |
| "Tool X missing valid input object" | Tool call has no/invalid input | Thrown during validation |
| "Unsupported LLM provider" | Unknown provider in factory | Thrown by factory |

All errors should be caught by the calling code (typically in routes or planner).

## Performance Considerations

**Current Configuration:**

- Model: `gpt-4o-mini` - Faster and cheaper than gpt-4
- Temperature: `0.2` - Reduces randomness, speeds up generation

**For Production:**

- Consider caching common plan patterns
- Implement request timeout handling
- Add retry logic for API failures
- Monitor token usage for cost optimization
- Consider streaming responses for long operations

## Testing

When testing LLM functionality:

**Mock the Provider:**

```typescript
const mockProvider: LLMProvider = {
  generatePlan: async (message: string) => ({
    intent: "Test intent",
    reasoning: "Test reasoning",
    steps: ["Step 1"],
    toolCalls: [{ tool: "read_schema", input: {} }]
  }),
  generateRawJson: async <T>(prompt: string) => ({} as T)
};
```

**Test Validation:**

```typescript
// Test that invalid tools are rejected
const invalidPlan = {
  toolCalls: [{ tool: "non_existent_tool", input: {} }]
};
// Should throw error
```

## Security Notes

- **Never commit API keys** - Always use environment variables
- **Validate all LLM outputs** - Don't trust JSON structure blindly
- **Rate limiting** - Implement to prevent abuse
- **Cost monitoring** - Track API usage to avoid surprise bills
- **Prompt injection** - Be aware of adversarial user inputs

## Dependencies

```json
{
  "openai": "^6.22.0"  // Official OpenAI Node.js SDK
}
```
