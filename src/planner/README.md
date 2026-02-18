# Planner

This directory contains the task planning system that converts natural language requests into structured, executable plans with automatic risk assessment.

## Overview

The planner is responsible for:

1. Interfacing with the LLM to generate task plans
2. Calculating risk levels based on tool usage
3. Storing plans for later execution
4. Retrieving plans when needed for execution

## Files

### [taskPlanner.ts](taskPlanner.ts)

The core planning engine that orchestrates plan generation and risk calculation.

#### Key Functions

**`createPlan(request: ChatRequest): Promise<PlanResponse>`**

Main entry point for creating a new task plan.

**Process:**

1. Takes a natural language message from the user
2. Sends it to the LLM provider with the tool registry
3. Receives a structured plan with tool calls
4. Saves the plan to storage
5. Calculates the risk level
6. Returns plan details with ID and risk assessment

**Parameters:**

```typescript
request: ChatRequest {
  message: string;           // Natural language task description
  workspacePath?: string;    // Optional workspace context
  openFiles?: string[];      // Optional open files context
}
```

**Returns:**

```typescript
PlanResponse {
  planId: string;            // UUID to reference this plan
  plan: TaskPlan;            // Complete task plan
  requiresApproval: boolean; // Always true (can be customized)
  riskLevel: RiskLevel;      // Calculated risk level
}
```

**Example:**

```typescript
const response = await createPlan({
  message: "Add a migration to create an index on users.email"
});

// response.planId: "abc-123-uuid"
// response.riskLevel: "HIGH"
// response.plan.toolCalls: [{ tool: "generate_migration", input: {...} }]
```

---

**`calculateRisk(plan: TaskPlan): RiskLevel`**

Analyzes a plan and returns the highest risk level among all tool calls.

**Logic:**

- Iterates through all tool calls in the plan
- Looks up each tool's risk rating in the TOOL_REGISTRY
- Returns the highest risk level found
- If a tool is not found in registry, it's ignored (defaults to LOW)

**Risk Hierarchy:**

```text
CRITICAL (4) > HIGH (3) > MEDIUM (2) > LOW (1)
```

**Example:**

```typescript
const plan = {
  toolCalls: [
    { tool: "read_schema", input: {} },      // LOW
    { tool: "generate_migration", input: {} } // HIGH
  ]
};

const risk = calculateRisk(plan); // Returns "HIGH"
```

**Use Cases:**

- Initial risk assessment when creating a plan
- Re-validation before execution (in case tool registry changed)
- Filtering plans by risk level

---

### [planStore.ts](planStore.ts)

In-memory storage for task plans, providing simple CRUD operations.

#### Storage Operations

**`savePlan(plan: TaskPlan): string`**

Stores a task plan and returns a unique ID.

**Implementation:**

- Generates a UUID for the plan
- Stores the plan in a Map using the UUID as key
- Returns the UUID for future retrieval

**Example:**

```typescript
const plan = {
  intent: "Add index",
  reasoning: "Improve query performance",
  steps: ["Generate migration"],
  toolCalls: [...]
};

const planId = savePlan(plan); // Returns UUID like "abc-123"
```

---

**`getPlan(id: string): TaskPlan | undefined`**

Retrieves a previously stored plan by its ID.

**Returns:**

- The TaskPlan if found
- `undefined` if no plan exists with that ID

**Example:**

```typescript
const plan = getPlan("abc-123");
if (!plan) {
  console.error("Plan not found");
  return;
}
```

---

## Data Flow

```text
1. User Request (via /chat route)
   ↓
2. createPlan() called
   ↓
3. LLM generates TaskPlan
   ↓
4. savePlan() stores it with UUID
   ↓
5. calculateRisk() determines risk level
   ↓
6. Return planId + plan + risk to user
   ↓
7. User reviews and approves
   ↓
8. Execute route calls getPlan(planId)
   ↓
9. Re-validates risk with calculateRisk()
   ↓
10. Executes tools if approved
```

## Type Definitions

### TaskPlan

```typescript
interface TaskPlan {
  intent: string;        // What the user wants to accomplish
  reasoning: string;     // Why this approach was chosen
  steps: string[];       // Human-readable steps
  toolCalls: ToolCall[]; // Actual executable tool calls
}
```

### ToolCall

```typescript
interface ToolCall {
  tool: string;                  // Tool name from registry
  input: Record<string, any>;    // Tool-specific parameters
}
```

### PlanResponse

```typescript
interface PlanResponse {
  planId: string;            // UUID for execution
  plan: TaskPlan;            // Complete plan details
  requiresApproval: boolean; // Whether manual approval needed
  riskLevel: RiskLevel;      // LOW | MEDIUM | HIGH | CRITICAL
}
```

## Storage Considerations

**Current Implementation:**

- Uses in-memory Map storage
- Plans are lost when server restarts
- No persistence layer

**Production Recommendations:**

- Implement persistent storage (database, Redis, etc.)
- Add plan expiration/TTL
- Add plan ownership/authentication
- Add plan versioning
- Add plan history/audit trail
- Implement plan search/filtering

**Example Migration to Database:**

```typescript
export async function savePlan(plan: TaskPlan): Promise<string> {
  const id = randomUUID();
  await db.plans.create({
    id,
    plan: JSON.stringify(plan),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  });
  return id;
}
```

## Risk Assessment Details

Risk levels are determined by the most dangerous tool in a plan:

| Level | When Used | Execution Behavior |
| ------- | ----------- | ------------------- |
| LOW | Read-only operations | Auto-executes |
| MEDIUM | Non-breaking changes | Auto-executes |
| HIGH | Data/code modifications | Requires `confirmRisk: true` |
| CRITICAL | Potentially destructive | Blocked (returns 403) |

## Error Handling

The planner relies on:

- **LLM Provider** - Can throw if API fails or returns invalid JSON
- **Tool Registry** - Validates that only known tools are used

**Potential Errors:**

- LLM returns invalid JSON
- LLM suggests a tool not in registry (caught by OpenAIProvider)
- Plan storage failure (memory constraints)

Always wrap `createPlan()` calls in try-catch:

```typescript
try {
  const response = await createPlan(request);
  // Success path
} catch (error) {
  // Handle LLM or validation errors
  console.error("Plan creation failed:", error);
}
```

## Testing Considerations

When testing the planner:

- Mock the LLM provider to return predictable plans
- Test risk calculation with various tool combinations
- Test plan storage and retrieval
- Verify edge cases (empty plans, unknown tools, etc.)

Example:

```typescript
// Mock provider
const mockProvider = {
  generatePlan: async () => ({
    intent: "Test",
    reasoning: "Test",
    steps: [],
    toolCalls: [{ tool: "read_schema", input: {} }]
  })
};

// Test risk calculation
const lowRiskPlan = { toolCalls: [{ tool: "read_schema", input: {} }] };
expect(calculateRisk(lowRiskPlan)).toBe("LOW");
```
