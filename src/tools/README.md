# Tools

This directory contains the executable tools that can be invoked by the AI orchestrator to perform development tasks. Each tool is a self-contained module with input validation, execution logic, and risk classification.

## Overview

Tools are the building blocks that the LLM can compose into execution plans. The system provides:

- **Type-safe inputs** - Zod schema validation for all tool parameters
- **Risk classification** - Each tool declares its risk level
- **Consistent interface** - All tools implement the same Tool interface
- **Centralized registry** - Tools are registered for LLM discovery and execution

## Architecture

```text
Tools Module
│
├── types.ts              → Tool interface and RiskLevel type
├── registry.ts           → Central registry of available tools
├── toolEngine.ts         → Tool execution engine with validation
│
├── generateMigration.ts  → Database migration generation (HIGH risk)
├── getGitDiff.ts         → Git diff retrieval (LOW risk)
├── readPackageJson.ts    → Package.json reader (LOW risk)
├── readSchema.ts         → Database schema reader (LOW risk)
├── updateSequelizeModel.ts → Sequelize model updater (HIGH risk)
└── updateAngularDTO.ts   → Angular DTO updater (MEDIUM risk)
```

## Core Files

### [types.ts](types.ts)

Defines the fundamental types for the tool system.

#### RiskLevel Type

```typescript
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
```

**Risk Guidelines:**

- **LOW**: Read-only operations with no side effects
- **MEDIUM**: Write operations to UI/non-critical code
- **HIGH**: Database changes, model updates, file generation
- **CRITICAL**: Destructive operations, system-wide changes

#### Tool Interface

```typescript
interface Tool<TInput = unknown> {
  name: string;                        // Unique tool identifier
  risk: RiskLevel;                     // Risk classification
  schema: ZodType<TInput>;             // Input validation schema
  execute(input: TInput): Promise<any>; // Execution function
}
```

---

### [registry.ts](registry.ts)

Central registry that catalogs all available tools for the LLM.

**Purpose:**

- Provides tool metadata (name, description, risk) to the LLM
- Used by the planner to calculate overall plan risk
- Separated from actual implementations for lighter LLM context

**Structure:**

```typescript
interface ToolDefinition {
  name: string;        // Must match tool's actual name
  description: string; // Shown to LLM for tool selection
  risk: RiskLevel;     // Risk classification
}
```

**Current Registry:**

```typescript
export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: "read_schema",
    description: "Read database schema metadata.",
    risk: "LOW"
  },
  {
    name: "generate_migration",
    description: "Generate SQL migration file.",
    risk: "HIGH"
  },
  // ... more tools
];
```

**Important:** When adding a new tool, you must register it here for the LLM to know about it.

---

### [toolEngine.ts](toolEngine.ts)

The execution engine that runs tool calls with validation.

#### Function: `executeToolCall(toolName: string, input: any)`

**Process:**

1. Looks up tool by name in the tools array
2. Validates input against tool's Zod schema
3. Executes tool with validated input
4. Returns result or throws error

**Error Handling:**

- Throws `"Tool not implemented"` if tool not found
- Throws `"Invalid input"` if Zod validation fails
- Propagates any execution errors

**Example:**

```typescript
const result = await executeToolCall("read_schema", { table: "users" });
// Tool validates input, executes, returns result
```

---

## Tool Implementations

### [generateMigration.ts](generateMigration.ts)

**Risk:** HIGH

Generates SQL migration files for database schema changes.

**Input Schema:**

```typescript
{
  migrationName: string;      // Name for migration file
  tableName: string;          // Target table
  columns?: any[];            // Optional column definitions
}
```

**Output:**

```typescript
{
  success: boolean;
  fileCreated: string;  // Path to created migration file
}
```

**Example:**

```typescript
{
  migrationName: "add_email_to_users",
  tableName: "users",
  columns: [{ name: "email", type: "VARCHAR(255)", nullable: false }]
}
```

---

### [getGitDiff.ts](getGitDiff.ts)

**Risk:** LOW

Retrieves git diff output for code review and analysis.

**Input Schema:**

```typescript
{
  staged?: boolean;      // Get staged changes (git diff --staged)
  baseBranch?: string;   // Compare against branch (git diff <branch>)
}
```

**Output:**

```typescript
{
  diff: string;  // Raw git diff output
}
```

**Implementation:**

- Uses Node's `child_process.exec` to run git commands
- Supports large diffs with 10MB max buffer
- Async execution with error handling

**Example:**

```typescript
// Get staged changes
await getGitDiffTool.execute({ staged: true });

// Compare against main branch
await getGitDiffTool.execute({ baseBranch: "main" });
```

---

### [readPackageJson.ts](readPackageJson.ts)

**Risk:** LOW

Reads and parses the workspace's package.json file.

**Input Schema:**

```typescript
{}  // No input required
```

**Output:**

```typescript
// Parsed package.json object
{
  name: string;
  version: string;
  dependencies: Record<string, string>;
  // ... etc
}
```

**Implementation:**

- Uses fs/promises for async file reading
- Reads from current working directory
- Parses JSON and returns object

---

### [readSchema.ts](readSchema.ts)

**Risk:** LOW

Reads database schema metadata (implementation not shown in workspace, but registered).

**Typical Usage:**

- Query database for table structure
- Get column definitions, types, constraints
- Inform migration or model generation

---

### [updateSequelizeModel.ts](updateSequelizeModel.ts)

**Risk:** HIGH

Modifies Sequelize ORM model definitions (implementation not shown in workspace, but registered).

**Why HIGH Risk:**

- Changes code that affects database operations
- Could introduce bugs in data access layer
- Requires careful validation

---

### [updateAngularDTO.ts](updateAngularDTO.ts)

**Risk:** MEDIUM

Modifies Angular DTO and form structures (implementation not shown in workspace, but registered).

**Why MEDIUM Risk:**

- Changes UI data structures
- Less critical than backend/database changes
- Usually non-breaking if TypeScript compilation passes

---

## Creating a New Tool

Follow this template to add a new tool:

### 1. Create Tool File

`src/tools/myNewTool.ts`:

```typescript
import { z } from 'zod';
import { Tool } from './types';

// 1. Define input schema with Zod
const MyToolSchema = z.object({
  requiredParam: z.string(),
  optionalParam: z.number().optional()
});

// 2. Infer TypeScript type from schema
type MyToolInput = z.infer<typeof MyToolSchema>;

// 3. Export tool implementation
export const myNewTool: Tool<MyToolInput> = {
  name: "my_new_tool",
  risk: "MEDIUM",  // Choose appropriate risk level
  schema: MyToolSchema,

  async execute(input) {
    // Input is fully typed and validated!
    console.log(input.requiredParam);
    
    // Implement tool logic
    const result = await doSomething(input);
    
    // Return any result
    return { success: true, data: result };
  }
};
```

### 2. Register in Registry

Add to [registry.ts](registry.ts):

```typescript
export const TOOL_REGISTRY: ToolDefinition[] = [
  // ... existing tools
  {
    name: "my_new_tool",
    description: "Brief description for the LLM to understand when to use this tool.",
    risk: "MEDIUM"
  }
];
```

### 3. Add to Tool Engine

Update [toolEngine.ts](toolEngine.ts):

```typescript
import { myNewTool } from './myNewTool';

const tools: Tool[] = [
  // ... existing tools
  myNewTool
];
```

### 4. Test the Tool

```typescript
// Direct test
const result = await myNewTool.execute({
  requiredParam: "test",
  optionalParam: 123
});

// Via engine
const result = await executeToolCall("my_new_tool", {
  requiredParam: "test"
});
```

## Tool Best Practices

### Input Validation

- Use Zod schemas to validate all inputs
- Make parameters optional only when truly optional
- Use specific types (z.string().email(), z.number().positive())
- Add custom validation for complex rules

```typescript
const schema = z.object({
  email: z.string().email(),
  age: z.number().positive().int(),
  role: z.enum(['admin', 'user', 'guest'])
});
```

### Error Handling

- Throw descriptive errors
- Include context in error messages
- Don't swallow errors silently

```typescript
async execute(input) {
  try {
    const result = await riskyOperation(input);
    return result;
  } catch (error) {
    throw new Error(`Failed to execute my_tool for ${input.id}: ${error.message}`);
  }
}
```

### Risk Classification

Choose risk level based on:

- **Reversibility**: Can the operation be undone?
- **Scope**: How many files/systems affected?
- **Data safety**: Could this corrupt or lose data?
- **Breaking changes**: Could this break existing functionality?

### Return Values

- Return structured objects, not primitives
- Include success/error information
- Provide enough detail for audit logs
- Keep return values JSON-serializable

```typescript
// Good
return {
  success: true,
  filesModified: ['a.ts', 'b.ts'],
  changes: 42
};

// Avoid
return true;  // Not enough information
```

## Security Considerations

- **Input sanitization**: Never trust tool inputs to be safe
- **Path traversal**: Validate file paths don't escape workspace
- **Command injection**: Sanitize inputs used in shell commands
- **File permissions**: Check permissions before file operations
- **API secrets**: Never log or return sensitive credentials

### Example: Sanitizing file paths

```typescript
import path from 'path';

async execute(input) {
  const workspaceRoot = process.cwd();
  const targetPath = path.resolve(workspaceRoot, input.filePath);
  
  // Prevent path traversal
  if (!targetPath.startsWith(workspaceRoot)) {
    throw new Error("Invalid file path - outside workspace");
  }
  
  // Now safe to use
  await fs.readFile(targetPath);
}
```

## Testing Tools

### Unit Testing

```typescript
describe('myNewTool', () => {
  it('should validate input schema', async () => {
    await expect(
      myNewTool.execute({ /* invalid input */ })
    ).rejects.toThrow();
  });

  it('should execute successfully', async () => {
    const result = await myNewTool.execute({ requiredParam: "test" });
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe('toolEngine', () => {
  it('should execute tool by name', async () => {
    const result = await executeToolCall("my_new_tool", {
      requiredParam: "test"
    });
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

**"Tool not implemented" error:**

- Check tool is imported in toolEngine.ts
- Verify tool name matches registry exactly

**"Invalid input" error:**

- Check Zod schema matches input structure
- Log the validation error for details: `parsed.error.message`

**Tool execution fails silently:**

- Check for caught errors that aren't being rethrown
- Add logging to tool execution

**LLM never selects your tool:**

- Improve tool description in registry
- Check tool name doesn't conflict
- Verify risk level isn't blocking execution
