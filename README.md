# Assistant Core

**Custom AI Dev Orchestrator Core** - An intelligent TypeScript/Express server that uses LLMs to plan and execute development tasks with built-in safety controls and risk assessment.

## Overview

Assistant Core acts as an AI orchestrator for development tasks, providing a structured workflow that:

1. Accepts natural language requests from developers
2. Generates execution plans using LLM (OpenAI)
3. Validates risk levels before execution
4. Executes approved tasks using registered tools
5. Maintains audit logs of all executions
6. Tracks workspaces for context-aware tooling and reviews

The system includes multiple safety layers including risk classification (LOW/MEDIUM/HIGH/CRITICAL) and approval workflows to prevent unintended changes.

## Features

- **🤖 AI-Powered Planning**: Converts natural language requests into structured task plans
- **🛡️ Risk Assessment**: Automatic risk calculation based on tool usage
- **✅ Approval Workflow**: Requires confirmation for high-risk operations
- **📝 Execution Logging**: Complete audit trail of all executed tasks
- **🔍 Git Review**: AI-powered code review of git diffs
- **🧭 Smart Review Engine**: Per-file analysis plus cross-file risk detection
- **🗂️ Workspace Registry**: Register workspaces for safer, scoped tools
- **🔧 Extensible Tools**: Pluggable tool system for database migrations, code modifications, and more

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API Key

## Installation

1. Clone the repository:

```bash
git clone https://github.com/OptikCrash/assistant-core.git
cd assistant-core
```

1. Install dependencies:

```bash
npm install
```

1. Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
LLM_PROVIDER=openai
```

## Running the Server

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:4000` with auto-reload enabled.

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### POST `/chat`

Create a task plan from a natural language request.

**Request:**

```json
{
  "message": "Create a migration to add an email column to the users table",
  "workspacePath": "/path/to/workspace",
  "openFiles": ["src/models/user.ts"]
}
```

**Response:**

```json
{
  "planId": "uuid-here",
  "plan": {
    "intent": "Add email column to users table",
    "reasoning": "User needs to store email addresses",
    "steps": ["Read current schema", "Generate migration"],
    "toolCalls": [
      {
        "tool": "read_schema",
        "input": { "table": "users" }
      },
      {
        "tool": "generate_migration",
        "input": { "table": "users", "column": "email", "type": "VARCHAR(255)" }
      }
    ]
  },
  "requiresApproval": true,
  "riskLevel": "HIGH"
}
```

### POST `/execute`

Execute a previously created plan.

**Request:**

```json
{
  "planId": "uuid-from-chat-response",
  "confirmRisk": true
}
```

**Response:**

```json
{
  "executed": true,
  "executionId": "uuid-here",
  "status": "COMPLETED",
  "riskLevel": "HIGH",
  "results": [
    {
      "tool": "read_schema",
      "success": true,
      "result": { "schema": "..." }
    },
    {
      "tool": "generate_migration",
      "success": true,
      "result": { "filePath": "migrations/20260217_add_email.sql" }
    }
  ]
}
```

### GET `/audit/:executionId`

Retrieve execution logs for a specific execution.

**Response:**

```json
{
  "executionId": "uuid-here",
  "planId": "original-plan-uuid",
  "timestamp": "2026-02-17T10:30:00.000Z",
  "riskLevel": "HIGH",
  "confirmed": true,
  "status": "COMPLETED",
  "toolResults": [...]
}
```

### POST `/review`

Get an AI-powered review of staged git changes.

This is the legacy single-pass reviewer. For cross-file analysis and workspace-aware context, use `/review-smart`.

**Response:**

```json
{
  "summary": "Added email column to users table with migration",
  "breakingChanges": ["Database schema change requires migration"],
  "risks": ["Existing data won't have email values"],
  "suggestions": ["Consider adding a default value or allowing NULL"],
  "missingTests": ["Migration rollback test"],
  "schemaConcerns": ["Email validation not enforced at DB level"]
}
```

### POST `/review-smart`

Run the smart review engine, which performs per-file analysis and cross-file dependency checks.

**Request:**

```json
{
  "workspaceId": "workspace-id-here"
}
```

**Response (truncated):**

```json
{
  "summary": "Updated review engine and workspace routing",
  "breakingChanges": [],
  "risks": ["Potential breaking export removal in review module"],
  "suggestions": [],
  "missingTests": [],
  "schemaConcerns": [],
  "crossFileRisks": [
    { "message": "Removed export still imported in review service", "risk": "HIGH" }
  ],
  "architecturalConcerns": [],
  "overallRisk": "HIGH",
  "confidence": 82
}
```

### Workspace Endpoints

Register and validate workspaces for tools that require a repository context.

**POST** `/workspace/validate`

```json
{
  "rootPath": "/path/to/repo"
}
```

**POST** `/workspace/register`

```json
{
  "id": "BOSS",
  "rootPath": "/path/to/repo"
}
```

**GET** `/workspace/:id/status`

```json
{
  "currentBranch": "main",
  "hasUncommittedChanges": true,
  "hasStagedChanges": false,
  "aheadBy": 1,
  "behindBy": 0
}
```

## Risk Levels

The system classifies operations into four risk levels:

- **LOW**: Read-only operations (e.g., reading schema, getting git diff)
- **MEDIUM**: UI/DTO modifications that don't affect data
- **HIGH**: Code or database changes that could impact functionality (requires confirmation)
- **CRITICAL**: Operations that could cause data loss or system-wide issues (blocked by default)

## Available Tools

Current tools registered in the system:

- `read_schema` - Read database schema metadata (LOW risk)
- `generate_migration` - Generate SQL migration file (HIGH risk)
- `update_sequelize_model` - Modify Sequelize model definitions (HIGH risk)
- `update_angular_dto` - Modify Angular DTO and form structures (MEDIUM risk)
- `get_git_diff` - Retrieve git diff for review (LOW risk)
- `read_package_json` - Read and parse package.json (LOW risk)
- `read_file` - Read a file within a registered workspace (LOW risk)

Note: `read_file` is used directly by the smart review engine and is not currently exposed to the LLM planner.

## Project Structure

```text
assistant-core/
├── src/
│   ├── server.ts              # Express server entry point
│   ├── routes/                # API route handlers
│   ├── planner/               # Task planning and storage
│   ├── llm/                   # LLM provider abstraction
│   ├── tools/                 # Executable tool implementations
│   ├── audit/                 # Execution logging
│   ├── workspace/             # Workspace registry and metadata detection
│   ├── features/              # Feature-specific modules
│   │   └── git/review/        # Git diff review functionality
│   └── types/                 # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md
```

See individual README.md files in each directory for detailed documentation.

## Development Workflow Example

1. **Send a natural language request:**

```bash
curl -X POST http://localhost:4000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Add a created_at timestamp to the posts table"}'
```

1. **Review the generated plan** - Check the risk level and tool calls

2. **Execute the plan if approved:**

```bash
curl -X POST http://localhost:4000/execute \
  -H "Content-Type: application/json" \
  -d '{"planId": "plan-uuid-from-step-1", "confirmRisk": true}'
```

1. **Audit the execution:**

```bash
curl http://localhost:4000/audit/execution-uuid-from-step-3
```

1. **Register a workspace for smart reviews:**

```bash
curl -X POST http://localhost:4000/workspace/register \
  -H "Content-Type: application/json" \
  -d '{"id": "BOSS", "rootPath": "/path/to/repo"}'
```

1. **Run a smart review:**

```bash
curl -X POST http://localhost:4000/review-smart \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "BOSS"}'
```

## Security Considerations

- Never commit your `.env` file with real API keys
- Review all HIGH and CRITICAL risk operations before execution
- Maintain audit logs for compliance and debugging
- Consider implementing authentication for production deployments
- Validate all tool inputs to prevent injection attacks

## Contributing

This is currently a custom tool for internal use. Contributions should follow:

- TypeScript strict mode
- Zod schema validation for all inputs
- Risk classification for new tools
- Comprehensive error handling

## License

ISC

## Support

For issues or questions, please open an issue on the GitHub repository.
