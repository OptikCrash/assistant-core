# Audit

This directory contains the execution logging system that maintains a complete audit trail of all plan executions, tool results, and risk decisions.

## Overview

The audit module provides:

- **Execution tracking** - Records every plan execution with full details
- **Tool result logging** - Captures success/failure of individual tool calls
- **Risk documentation** - Logs risk levels and approval decisions
- **Status tracking** - Maintains execution status (COMPLETED/FAILED)
- **Audit trail** - Enables review and debugging of past operations

## Files

### [executionLogStore.ts](executionLogStore.ts)

In-memory storage for execution records with simple CRUD operations.

---

## Type Definitions

### ToolExecutionResult

```typescript
interface ToolExecutionResult {
  tool: string;       // Name of the tool executed
  success: boolean;   // Whether execution succeeded
  result?: any;       // Tool output (if successful)
  error?: string;     // Error message (if failed)
}
```

Captures the outcome of a single tool execution within a plan.

**Example:**

```typescript
{
  tool: "generate_migration",
  success: true,
  result: { fileCreated: "migrations/20260217_add_email.sql" }
}

// Or on failure:
{
  tool: "generate_migration",
  success: false,
  error: "Permission denied: cannot write to migrations directory"
}
```

---

### ExecutionRecord

```typescript
interface ExecutionRecord {
  executionId: string;                 // Unique UUID for this execution
  planId: string;                      // Reference to original plan
  timestamp: string;                   // ISO 8601 timestamp of execution
  riskLevel: RiskLevel;                // Risk level at execution time
  confirmed: boolean;                  // Whether risk was explicitly confirmed
  status: 'COMPLETED' | 'FAILED';      // Overall execution status
  toolResults: ToolExecutionResult[];  // Results from all tool calls
}
```

Complete record of a plan execution.

**Status Rules:**

- `COMPLETED`: All tools succeeded
- `FAILED`: At least one tool failed

**Example:**

```typescript
{
  executionId: "exec-abc-123",
  planId: "plan-xyz-789",
  timestamp: "2026-02-17T10:30:45.123Z",
  riskLevel: "HIGH",
  confirmed: true,
  status: "COMPLETED",
  toolResults: [
    { tool: "read_schema", success: true, result: {...} },
    { tool: "generate_migration", success: true, result: {...} }
  ]
}
```

---

## Functions

### `saveExecution(record: Omit<ExecutionRecord, 'executionId'>): ExecutionRecord`

Saves a new execution record and returns it with a generated ID.

**Parameters:**

```typescript
{
  planId: string;
  timestamp: string;
  riskLevel: RiskLevel;
  confirmed: boolean;
  status: 'COMPLETED' | 'FAILED';
  toolResults: ToolExecutionResult[];
}
```

**Process:**

1. Generates a unique UUID for the execution
2. Creates full ExecutionRecord with the ID
3. Stores in Map with ID as key
4. Returns the complete record

**Usage:**

```typescript
const record = saveExecution({
  planId: "plan-123",
  timestamp: new Date().toISOString(),
  riskLevel: "HIGH",
  confirmed: true,
  status: "COMPLETED",
  toolResults: [
    { tool: "read_schema", success: true, result: {...} }
  ]
});

console.log(record.executionId); // "exec-abc-xyz"
```

**Called By:**

- Execute route (after completing plan execution)

---

### `getExecution(executionId: string): ExecutionRecord | undefined`

Retrieves an execution record by its ID.

**Returns:**

- The ExecutionRecord if found
- `undefined` if no record exists with that ID

**Usage:**

```typescript
const record = getExecution("exec-abc-123");

if (!record) {
  console.error("Execution not found");
  return;
}

console.log(`Status: ${record.status}`);
console.log(`Tools executed: ${record.toolResults.length}`);
```

**Called By:**

- Audit route (for retrieving execution details)
- Internal debugging/monitoring tools

---

## Data Flow

```text
Plan Execution Flow:
1. User approves plan
   ↓
2. Execute route begins execution
   ↓
3. Each tool call executed sequentially
   ↓
4. Results collected in array
   ↓
5. Overall status determined (COMPLETED/FAILED)
   ↓
6. saveExecution() called with all details
   ↓
7. ExecutionRecord created with UUID
   ↓
8. Stored in executionStore Map
   ↓
9. Execution ID returned to user

Later Audit Query:
1. User requests /audit/:executionId
   ↓
2. Audit route calls getExecution(id)
   ↓
3. Record retrieved from Map
   ↓
4. Full details returned to user
```

## Storage Characteristics

**Current Implementation:**

- **Type:** In-memory Map
- **Persistence:** None (lost on server restart)
- **Capacity:** Limited by available RAM
- **Performance:** O(1) lookup and insert

**Limitations:**

- No persistence across restarts
- No backup/recovery
- No search/filtering capabilities
- No pagination for large datasets
- Single-server only (not distributed)

---

## Use Cases

### 1. Debugging Failed Executions

```typescript
const record = getExecution(executionId);

if (record.status === 'FAILED') {
  const failedTools = record.toolResults.filter(r => !r.success);
  
  failedTools.forEach(tool => {
    console.log(`${tool.tool} failed: ${tool.error}`);
  });
}
```

### 2. Compliance & Auditing

```typescript
// Check if high-risk operation was confirmed
const record = getExecution(executionId);

if (record.riskLevel === 'HIGH' && !record.confirmed) {
  console.warn('HIGH risk operation executed without confirmation!');
}
```

### 3. Performance Monitoring

```typescript
// Analyze execution patterns
const record = getExecution(executionId);
console.log(`Executed ${record.toolResults.length} tools`);
console.log(`Success rate: ${
  record.toolResults.filter(r => r.success).length / 
  record.toolResults.length * 100
}%`);
```

### 4. Rollback Information

```typescript
// Identify what was changed
const record = getExecution(executionId);

record.toolResults.forEach(result => {
  if (result.tool === 'generate_migration' && result.success) {
    console.log(`Migration created: ${result.result.fileCreated}`);
    // User can now manually rollback if needed
  }
});
```

---

## Production Recommendations

### 1. Persistent Storage

Replace in-memory Map with database storage:

```typescript
import { db } from './database';

export async function saveExecution(record: Omit<ExecutionRecord, 'executionId'>): Promise<ExecutionRecord> {
  const executionId = randomUUID();
  
  const fullRecord = { executionId, ...record };
  
  await db.executions.create({
    id: executionId,
    plan_id: record.planId,
    timestamp: record.timestamp,
    risk_level: record.riskLevel,
    confirmed: record.confirmed,
    status: record.status,
    tool_results: JSON.stringify(record.toolResults)
  });
  
  return fullRecord;
}

export async function getExecution(executionId: string): Promise<ExecutionRecord | undefined> {
  const row = await db.executions.findById(executionId);
  
  if (!row) return undefined;
  
  return {
    executionId: row.id,
    planId: row.plan_id,
    timestamp: row.timestamp,
    riskLevel: row.risk_level as RiskLevel,
    confirmed: row.confirmed,
    status: row.status as 'COMPLETED' | 'FAILED',
    toolResults: JSON.parse(row.tool_results)
  };
}
```

### 2. Add Search/Filtering

```typescript
export function searchExecutions(filters: {
  planId?: string;
  status?: 'COMPLETED' | 'FAILED';
  riskLevel?: RiskLevel;
  startDate?: Date;
  endDate?: Date;
}): ExecutionRecord[] {
  // Implementation with database query or in-memory filtering
}
```

### 3. Add Pagination

```typescript
export function getExecutions(page: number = 1, pageSize: number = 50): {
  records: ExecutionRecord[];
  total: number;
  page: number;
  pageSize: number;
} {
  // Implementation with pagination
}
```

### 4. Add Retention Policy

```typescript
// Clean up old executions
export function cleanupOldExecutions(daysToKeep: number = 90): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  // Delete executions older than cutoff
  // Return count of deleted records
}
```

### 5. Add Analytics

```typescript
export function getExecutionStats(timeRange: { start: Date; end: Date }) {
  return {
    totalExecutions: number;
    successRate: number;
    failureRate: number;
    averageToolsPerExecution: number;
    riskDistribution: Record<RiskLevel, number>;
    mostUsedTools: Array<{ tool: string; count: number }>;
  };
}
```

---

## Security Considerations

### Data Sensitivity

Execution records may contain:

- File paths
- Database schema information
- Error messages with stack traces
- Tool inputs and outputs

**Recommendations:**

- Implement access control for audit endpoints
- Consider data retention policies
- Sanitize sensitive information before logging
- Encrypt at rest if storing credentials or PII

### Audit Integrity

- Make records immutable (no update/delete functions currently)
- Consider cryptographic signatures for tamper-proof logs
- Log access to audit records themselves
- Implement append-only storage

---

## Testing

### Unit Tests

```typescript
describe('executionLogStore', () => {
  it('should save and retrieve execution', () => {
    const record = saveExecution({
      planId: "test-plan",
      timestamp: new Date().toISOString(),
      riskLevel: "LOW",
      confirmed: false,
      status: "COMPLETED",
      toolResults: []
    });
    
    expect(record.executionId).toBeDefined();
    
    const retrieved = getExecution(record.executionId);
    expect(retrieved).toEqual(record);
  });
  
  it('should return undefined for non-existent execution', () => {
    const result = getExecution("non-existent-id");
    expect(result).toBeUndefined();
  });
  
  it('should mark as FAILED when any tool fails', () => {
    const record = saveExecution({
      planId: "test",
      timestamp: new Date().toISOString(),
      riskLevel: "LOW",
      confirmed: false,
      status: "FAILED",
      toolResults: [
        { tool: "tool1", success: true, result: {} },
        { tool: "tool2", success: false, error: "Failed" }
      ]
    });
    
    expect(record.status).toBe("FAILED");
  });
});
```

---

## Integration with Other Modules

### Execute Route

Calls `saveExecution()` after completing plan:

```typescript
const executionRecord = saveExecution({
  planId,
  timestamp: new Date().toISOString(),
  riskLevel,
  confirmed: !!confirmRisk,
  status: results.some(r => !r.success) ? 'FAILED' : 'COMPLETED',
  toolResults: results
});
```

### Audit Route

Calls `getExecution()` to retrieve records:

```typescript
const record = getExecution(executionId);
if (!record) {
  return res.status(404).json({ error: "Execution not found" });
}
return res.json(record);
```

---

## Monitoring & Alerting

Consider adding:

- Alerts for HIGH/CRITICAL risk executions
- Notifications on execution failures
- Metrics on execution patterns
- Dashboard for real-time monitoring
- Slack/email integration for important events

```typescript
// Example: Alert on high-risk execution
export function saveExecution(record: Omit<ExecutionRecord, 'executionId'>): ExecutionRecord {
  const fullRecord = { executionId: randomUUID(), ...record };
  executionStore.set(fullRecord.executionId, fullRecord);
  
  // Alert on high risk
  if (fullRecord.riskLevel === 'HIGH' || fullRecord.riskLevel === 'CRITICAL') {
    alertHighRiskExecution(fullRecord);
  }
  
  return fullRecord;
}
```
