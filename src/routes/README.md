# Routes

This directory contains all Express route handlers that define the API endpoints for the Assistant Core server.

## Overview

Each route file exports a configured Express `Router` instance that handles specific functionality. These routers are mounted in the main server file ([server.ts](../server.ts)).

## Route Files

### [chat.ts](chat.ts)

**Endpoint:** `POST /chat`

Handles natural language requests and converts them into structured task plans using the LLM.

**Responsibilities:**

- Receives chat requests with a user message
- Delegates to the task planner to generate an execution plan
- Returns the plan ID, full plan details, and risk assessment

**Request Body:**

```typescript
{
  message: string;           // Natural language task description
  workspacePath?: string;    // Optional workspace path
  openFiles?: string[];      // Optional list of currently open files
}
```

**Response:**

```typescript
{
  planId: string;            // UUID for executing the plan later
  plan: TaskPlan;            // Full plan with steps and tool calls
  requiresApproval: boolean; // Always true currently
  riskLevel: RiskLevel;      // LOW | MEDIUM | HIGH | CRITICAL
}
```

**Example:**

```bash
curl -X POST http://localhost:1339/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Add validation to the user email field"}'
```

---

### [execute.ts](execute.ts)

**Endpoint:** `POST /execute`

Executes a previously generated plan with proper risk validation and approval checks.

**Responsibilities:**

- Retrieves the plan from storage using plan ID
- Recalculates risk level to ensure it hasn't changed
- Enforces approval requirements based on risk
- Executes all tool calls in the plan sequentially
- Saves execution results to audit log
- Returns execution status and results

**Request Body:**

```typescript
{
  planId: string;        // UUID from /chat response
  confirmRisk?: boolean; // Required for HIGH risk operations
}
```

**Response:**

```typescript
{
  executed: boolean;
  executionId: string;   // UUID for audit trail
  status: 'COMPLETED' | 'FAILED';
  riskLevel: RiskLevel;
  results: Array<{
    tool: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
}
```

**Risk Validation:**

- `CRITICAL` risk: Always blocked, returns 403 error
- `HIGH` risk: Requires `confirmRisk: true`, otherwise returns 403
- `MEDIUM/LOW` risk: Executes immediately

**Example:**

```bash
curl -X POST http://localhost:1339/execute \
  -H "Content-Type: application/json" \
  -d '{"planId": "abc-123", "confirmRisk": true}'
```

---

### [audit.ts](audit.ts)

**Endpoint:** `GET /audit/:executionId`

Retrieves execution logs for a specific execution, providing full audit trail information.

**Responsibilities:**

- Looks up execution record by ID
- Returns complete execution details including all tool results
- Provides 404 if execution not found

**Response:**

```typescript
{
  executionId: string;
  planId: string;                    // Original plan that was executed
  timestamp: string;                 // ISO 8601 timestamp
  riskLevel: RiskLevel;
  confirmed: boolean;                // Whether risk was confirmed
  status: 'COMPLETED' | 'FAILED';
  toolResults: ToolExecutionResult[];
}
```

**Example:**

```bash
curl http://localhost:1339/audit/execution-uuid-here
```

---

### [review.ts](review.ts)

**Endpoint:** `POST /review`

Performs AI-powered code review of staged git changes.

This is the legacy review endpoint. Use `/review-smart` for cross-file analysis and workspace-aware context.

**Responsibilities:**

- Retrieves staged git diff
- Sends diff to LLM for analysis
- Returns structured review feedback

**Response:**

```typescript
{
  summary: string;                  // Overall summary of changes
  breakingChanges: string[];        // Potential breaking changes
  risks: string[];                  // Identified risks
  suggestions: string[];            // Improvement suggestions
  missingTests: string[];           // Areas lacking test coverage
  schemaConcerns: string[];         // Database/API schema issues
}
```

**Example:**

```bash
curl -X POST http://localhost:1339/review
```

**Note:** Currently only reviews staged changes. To review unstaged changes, stage them first with `git add`.

---

### [reviewSmart.ts](reviewSmart.ts)

**Endpoint:** `POST /review-smart`

Runs the smart review engine, which performs per-file analysis plus cross-file dependency checks.

**Responsibilities:**

- Validates the workspace ID
- Loads workspace metadata for context
- Executes the ReviewEngine pipeline
- Returns a richer DiffReview with cross-file risks and confidence

**Request Body:**

```typescript
{
  workspaceId: string; // ID from /workspace/register
}
```

**Response (truncated):**

```typescript
{
  summary: string;
  breakingChanges: string[];
  risks: string[];
  suggestions: string[];
  missingTests: string[];
  schemaConcerns: string[];
  crossFileRisks: Array<{ message: string; risk: RiskLevel }>;
  architecturalConcerns: Array<{ message: string; risk: RiskLevel }>;
  overallRisk: RiskLevel;
  confidence: number; // 0-100
}
```

**Example:**

```bash
curl -X POST http://localhost:1339/review-smart \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "BOSS"}'
```

---

### [workspace.ts](workspace.ts)

Workspace lifecycle endpoints used by tools and smart review.

#### GET `/workspace`

List registered workspaces.

#### POST `/workspace/validate`

Validate a path before registration.

**Request Body:**

```typescript
{
  rootPath: string;
}
```

**Response:**

```typescript
{
  exists: boolean;
  isGitRepo: boolean;
  hasPackageJson: boolean;
}
```

#### POST `/workspace/register`

Register a workspace for scoped tooling.

**Request Body:**

```typescript
{
  id: string;
  rootPath: string;
}
```

**Response:**

```typescript
{
  id: string;
  rootPath: string;
  metadata: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    orm: string[];
    testFrameworks: string[];
    packageManager?: string;
    hasDocker: boolean;
    defaultBranch?: string;
  };
}
```

#### GET `/workspace/:id/status`

Runtime git status for a workspace.

**Response:**

```typescript
{
  currentBranch?: string;
  defaultBranch?: string;
  hasUncommittedChanges: boolean;
  hasStagedChanges: boolean;
  aheadBy?: number;
  behindBy?: number;
}
```

#### DELETE `/workspace/:id`

Unregister a workspace.

## Common Patterns

### Error Handling

All routes use try-catch blocks (where applicable) and return appropriate HTTP status codes:

- `400` - Bad Request (missing required parameters)
- `403` - Forbidden (risk validation failed)
- `404` - Not Found (plan or execution not found)
- `500` - Internal Server Error (execution failures)

### Response Format

All routes return JSON responses. Successful operations return relevant data objects, while errors return:

```typescript
{ error: string }
```

### Dependencies

Routes depend on:

- **Planner** (`../planner/`) - For task planning and plan storage
- **Tools** (`../tools/`) - For tool execution
- **Audit** (`../audit/`) - For execution logging
- **Features** (`../features/`) - For specialized functionality like git review

## Adding New Routes

To add a new route:

1. Create a new file in this directory (e.g., `myRoute.ts`)
2. Define and export a Router:

```typescript
import { Router } from 'express';

export const myRouter = Router();

myRouter.post('/', async (req, res) => {
  // Handle request
  res.json({ result: 'success' });
});
```

1. Mount it in [server.ts](../server.ts):

```typescript
import { myRouter } from './routes/myRoute';
app.use('/my-endpoint', myRouter);
```

## Security Notes

- All routes accept JSON bodies (configured in server.ts with `express.json()`)
- CORS is enabled for all origins (configured in server.ts)
- **Production deployments should:**
  - Add authentication middleware
  - Restrict CORS origins
  - Add rate limiting
  - Validate request bodies with Zod schemas
  - Add request logging
