# Git Review

This feature provides AI-powered code review of git diffs with a focus on TypeScript, Express, Sequelize, PostgreSQL, and Angular projects.

## Overview

The git review feature:

- Retrieves git diffs (staged or compared to a branch)
- Performs per-file static analysis with partial file context
- Runs cross-file dependency checks for breaking changes
- Returns structured feedback covering common issues and risks
- Validates the response against a strict schema

This is a specialized feature separate from the general tool system, providing developers with intelligent code review feedback before committing changes.

## Location

```text
src/features/git/review/
├── ReviewEngine.ts         → Smart review pipeline
├── buildCrossFilePrompt.ts → Cross-file analysis prompt builder
├── dependencyScanner.ts    → Import/export and dependency scanner
├── prompt.ts               → Basic review prompt builder
├── reviewService.ts        → Legacy staged diff review
├── reviewSmartService.ts   → Smart review entry point
├── smartPrompt.ts          → Per-file analysis prompt builder
└── types.ts                → Type definitions for review responses
```

## Files

### [types.ts](types.ts)

Defines the structure of code review responses.

#### DiffReview Interface

```typescript
interface DiffReview {
  summary: string;             // High-level summary of changes
  breakingChanges: string[];   // Potential breaking changes identified
  risks: string[];             // Risk areas that need attention
  suggestions: string[];       // Improvement suggestions
  missingTests: string[];      // Areas lacking test coverage
  schemaConcerns: string[];    // Database/API schema issues
  crossFileRisks?: StructuredIssue[];
  architecturalConcerns?: StructuredIssue[];
  overallRisk: RiskLevel;      // LOW | MEDIUM | HIGH | CRITICAL
  confidence: number;          // 0-100
  runtime?: WorkspaceRuntimeState;
}
```

#### StructuredIssue Interface

```typescript
interface StructuredIssue {
  message: string;
  risk: RiskLevel;
}
```

#### WorkspaceRuntimeState (optional)

```typescript
interface WorkspaceRuntimeState {
  currentBranch?: string;
  defaultBranch?: string;
  hasUncommittedChanges: boolean;
  hasStagedChanges: boolean;
  aheadBy?: number;
  behindBy?: number;
}
```

**Example Response:**

```typescript
{
  summary: "Added email column to users table with migration and model updates",
  breakingChanges: [
    "Database schema change requires migration before deployment"
  ],
  risks: [
    "Existing user records will have NULL email values",
    "No unique constraint on email could allow duplicates"
  ],
  suggestions: [
    "Add unique index on email column",
    "Consider adding email validation in the model",
    "Update user registration form to include email field"
  ],
  missingTests: [
    "Migration rollback test",
    "Email validation test",
    "Duplicate email prevention test"
  ],
  schemaConcerns: [
    "Email column allows NULL - consider if this is intended",
    "No email format validation at database level"
  ],
  crossFileRisks: [
    { message: "UserDTO not updated after model change", risk: "MEDIUM" }
  ],
  architecturalConcerns: [],
  overallRisk: "HIGH",
  confidence: 78
}
```

---

### [prompt.ts](prompt.ts)

Constructs the LLM prompt with technical context and review criteria.

#### Function: `buildReviewPrompt(diff: string): string`

Generates a comprehensive prompt for the LLM to review code changes.

**Context Provided:**

- Reviewer role: "Senior software engineer"
- Tech stack details:
  - Node 18
  - Express
  - Sequelize ORM
  - PostgreSQL
  - Angular 15+
  - Strict TypeScript
  - Zod for validation

**Review Focus Areas:**

1. **Sequelize Association Correctness**
   - Proper belongsTo/hasMany/belongsToMany relationships
   - Foreign key configuration
   - Cascade behavior

2. **Migration Safety**
   - Backward compatibility
   - Rollback capability
   - Data preservation

3. **DTO Consistency**
   - Frontend/backend type alignment
   - API contract stability

4. **Null Handling**
   - Nullable vs non-nullable fields
   - Default values
   - Type safety

5. **Type Safety**
   - Strict TypeScript compliance
   - Any type usage
   - Type assertions

6. **API Contract Risks**
   - Breaking changes to endpoints
   - Response format changes
   - Query parameter changes

7. **Many-to-Many Relationships**
   - Junction table correctness
   - Through model configuration

8. **Transaction Safety**
   - Proper transaction usage
   - Rollback handling
   - Atomicity concerns

9. **Foreign Key Integrity**
   - Cascade rules
   - Orphan record prevention
   - Constraint validation

10. **Angular Form/Model Drift**
    - Form structure matches backend DTOs
    - Validation consistency

**Response Format:**
The prompt explicitly requires JSON-only responses with the DiffReview structure.

**Customization:**
To adapt for different tech stacks, modify the tech stack list and focus areas:

```typescript
export function buildReviewPrompt(diff: string): string {
  return `
    You are reviewing a Python/Django project using:
    - Python 3.11
    - Django 4.2
    - PostgreSQL
    - Django REST Framework
    
    Focus on:
    - Django ORM query efficiency
    - Migration safety
    - Serializer validation
    ...
  `;
}
```

---

### [reviewService.ts](reviewService.ts)

Main orchestration logic for the review workflow.

This is the legacy staged-diff reviewer. The smart review engine is documented below.

#### Function: `reviewDiff(staged: boolean = true): Promise<DiffReview>`

Executes the complete review workflow.

**Parameters:**

- `staged` (boolean, default: true) - Whether to review staged changes

**Process:**

1. **Get Diff**: Calls `getGitDiffTool.execute({ staged })`
2. **Validate**: Ensures diff is not empty
3. **Build Prompt**: Calls `buildReviewPrompt(diff)`
4. **Query LLM**: Uses `provider.generateRawJson<DiffReview>(prompt)`
5. **Validate Response**: Parses with Zod schema
6. **Return**: Returns validated DiffReview object

**Example:**

```typescript
// Review staged changes
const review = await reviewDiff(true);

console.log(review.summary);
// "Added user authentication with JWT tokens"

console.log(review.risks);
// ["JWT secret stored in code", "No token expiration"]

// Review unstaged changes (working directory vs HEAD)
const review = await reviewDiff(false);
```

**Error Handling:**

- Throws `"No diff found"` if diff is empty
- Propagates LLM provider errors
- Throws Zod validation errors if response doesn't match schema

**Schema Validation:**

```typescript
const DiffReviewSchema = z.object({
  summary: z.string(),
  breakingChanges: z.array(z.string()),
  risks: z.array(z.string()),
  suggestions: z.array(z.string()),
  missingTests: z.array(z.string()),
  schemaConcerns: z.array(z.string())
});

const parsed = DiffReviewSchema.parse(completion);
```

This ensures the LLM response conforms exactly to the expected structure.

---

### [reviewSmartService.ts](reviewSmartService.ts)

Entry point for the smart review engine.

**Function:** `reviewSmartDiff(workspaceId: string)`

**Process:**

1. Loads the workspace from the registry
2. Constructs a `ReviewEngine` with the workspace root
3. Runs the smart pipeline and returns a full DiffReview

**Example:**

```typescript
const review = await reviewSmartDiff("BOSS");
```

---

### [ReviewEngine.ts](ReviewEngine.ts)

Multi-stage review pipeline with per-file analysis and cross-file validation.

**High-Level Stages:**

1. **Diff Retrieval**: Uses `getGitDiffTool` with `workspaceId`
2. **Task Preparation**: Splits diff by file, loads file context via `readFileTool`, scans dependencies
3. **Parallel Execution**: Runs per-file reviews with token budgeting
4. **Cross-File Analysis**: Detects breaking export changes and contract drift
5. **Aggregation**: Produces a unified DiffReview with overall risk and confidence

**Key Capabilities:**

- File-level analysis on changed regions only (partial context)
- Import/export scanning for dependency impact
- Signature and export change tracking
- Cross-file risk weighting and aggregation

---

### [smartPrompt.ts](smartPrompt.ts)

Builds per-file analysis prompts that focus on concrete technical issues and avoid generic advice. The prompt emphasizes partial-file context and strict JSON output.

---

### [buildCrossFilePrompt.ts](buildCrossFilePrompt.ts)

Generates the cross-file analysis prompt, focusing on breaking exports, signature drift, and architectural boundary violations.

---

### [dependencyScanner.ts](dependencyScanner.ts)

Lightweight parser that extracts imports and exports to support cross-file dependency mapping and impact detection.

---

## Usage

### Via API Endpoint

```bash
# Review staged changes
curl -X POST http://localhost:4000/review

# Response:
{
  "summary": "...",
  "breakingChanges": [...],
  "risks": [...],
  "suggestions": [...],
  "missingTests": [...],
  "schemaConcerns": [...]
}
```

### Smart Review (Workspace-Based)

```bash
# Register workspace
curl -X POST http://localhost:4000/workspace/register \
  -H "Content-Type: application/json" \
  -d '{"id": "BOSS", "rootPath": "/path/to/repo"}'

# Run smart review
curl -X POST http://localhost:4000/review-smart \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "BOSS"}'
```

### Programmatic Usage

```typescript
import { reviewDiff } from './features/git/review/reviewService';

// Review staged changes before commit
async function preCommitReview() {
  try {
    const review = await reviewDiff(true);
    
    if (review.breakingChanges.length > 0) {
      console.warn('⚠️  Breaking changes detected:');
      review.breakingChanges.forEach(change => console.log(`  - ${change}`));
    }
    
    if (review.risks.length > 0) {
      console.warn('⚠️  Risks identified:');
      review.risks.forEach(risk => console.log(`  - ${risk}`));
    }
    
    if (review.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      review.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }
    
  } catch (error) {
    console.error('Review failed:', error.message);
  }
}
```

---

## Workflow Integration

### 1. Pre-Commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running AI code review..."

response=$(curl -s -X POST http://localhost:4000/review)

breaking_changes=$(echo $response | jq '.breakingChanges | length')

if [ "$breaking_changes" -gt 0 ]; then
  echo "⚠️  Breaking changes detected!"
  echo $response | jq '.breakingChanges[]'
  read -p "Continue with commit? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

### 2. CI/CD Pipeline

```yaml
# GitHub Actions example
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Get diff
        run: git diff origin/main > changes.diff
      - name: AI Review
        run: |
          review=$(curl -X POST http://review-service/review)
          echo "$review" >> $GITHUB_STEP_SUMMARY
```

### 3. Manual Review Workflow

```bash
# 1. Make changes
git add .

# 2. Review before commit
curl -X POST http://localhost:4000/review | jq .

# 3. Address issues if needed
# ... make changes ...

# 4. Commit when satisfied
git commit -m "Your message"
```

---

## Customization

### Adjust Review Criteria

Edit [prompt.ts](prompt.ts) to add/remove focus areas:

```typescript
Focus on:
- Performance optimization opportunities
- Security vulnerabilities (SQL injection, XSS)
- Code duplication
- Complex logic that needs comments
- Error handling completeness
```

### Add Custom Validation

Extend the DiffReview interface in [types.ts](types.ts):

```typescript
export interface DiffReview {
  summary: string;
  breakingChanges: string[];
  risks: string[];
  suggestions: string[];
  missingTests: string[];
  schemaConcerns: string[];
  
  // Custom additions
  securityIssues: string[];
  performanceConcerns: string[];
  codeSmells: string[];
}
```

Then update the prompt and schema accordingly.

### Support Different Diff Sources

Modify [reviewService.ts](reviewService.ts) to accept different diff sources:

```typescript
export async function reviewDiff(options: {
  staged?: boolean;
  baseBranch?: string;
  commitRange?: string;
}): Promise<DiffReview> {
  
  let diffResult;
  
  if (options.commitRange) {
    // Review specific commit range
    diffResult = await getGitDiffTool.execute({ 
      commitRange: options.commitRange 
    });
  } else if (options.baseBranch) {
    // Review against branch
    diffResult = await getGitDiffTool.execute({ 
      baseBranch: options.baseBranch 
    });
  } else {
    // Review staged/unstaged
    diffResult = await getGitDiffTool.execute({ 
      staged: options.staged ?? true 
    });
  }
  
  // ... rest of review logic
}
```

---

## Best Practices

### 1. Review Early and Often

Run reviews on small, focused changes rather than large diffs:

```bash
# Good: Review after each feature
git add feature-file.ts
curl -X POST http://localhost:4000/review

# Avoid: Reviewing 50 files at once
```

### 2. Use as a Second Pair of Eyes

Don't rely solely on AI review - combine with human code review:

- AI catches common patterns and technical issues
- Humans evaluate business logic and architecture decisions

### 3. Keep Tech Stack Updated

If your project changes frameworks or libraries, update the prompt:

```typescript
// Update from Angular to React
"You are reviewing a TypeScript project using:
- React 18
- Next.js 14
- Prisma ORM
..."
```

### 4. Filter Noise

For large diffs, consider excluding generated files:

```bash
# Review only source files
git diff --staged -- '*.ts' ':(exclude)*.generated.ts'
```

---

## Limitations

**Current Limitations:**

- Only reviews staged changes or full diff (not file-specific)
- No support for reviewing specific commit ranges
- Response time depends on diff size (large diffs = slower)
- LLM context window limits (very large diffs may be truncated)
- No interactive follow-up questions

**Token Limits:**

- OpenAI models have context limits (~128k tokens for gpt-4o)
- Large diffs may exceed limits
- Consider splitting large changes or summarizing

---

## Error Scenarios

| Error | Cause | Solution |
| ------- | ------- | ---------- |
| "No diff found" | Nothing is staged | Stage changes with `git add` |
| LLM API timeout | Very large diff | Split changes into smaller chunks |
| Invalid JSON response | LLM formatting error | Retry or check prompt clarity |
| Validation error | LLM didn't follow schema | Check prompt instructions |

---

## Performance Optimization

### Cache Results

```typescript
const reviewCache = new Map<string, DiffReview>();

export async function reviewDiff(staged = true): Promise<DiffReview> {
  const diffResult = await getGitDiffTool.execute({ staged });
  const diffHash = hashDiff(diffResult.diff);
  
  if (reviewCache.has(diffHash)) {
    return reviewCache.get(diffHash)!;
  }
  
  const review = await performReview(diffResult.diff);
  reviewCache.set(diffHash, review);
  return review;
}
```

### Parallel Reviews

For multi-file changes, review files in parallel:

```typescript
async function reviewFiles(files: string[]): Promise<DiffReview[]> {
  const reviews = await Promise.all(
    files.map(file => reviewDiff({ file }))
  );
  return reviews;
}
```

---

## Testing

```typescript
describe('reviewDiff', () => {
  it('should return structured review', async () => {
    // Mock git diff
    jest.mock('../../../tools/getGitDiff', () => ({
      getGitDiffTool: {
        execute: async () => ({ diff: 'sample diff' })
      }
    }));
    
    const review = await reviewDiff(true);
    
    expect(review).toHaveProperty('summary');
    expect(review).toHaveProperty('breakingChanges');
    expect(review.breakingChanges).toBeInstanceOf(Array);
  });
  
  it('should throw on empty diff', async () => {
    jest.mock('../../../tools/getGitDiff', () => ({
      getGitDiffTool: {
        execute: async () => ({ diff: '' })
      }
    }));
    
    await expect(reviewDiff(true)).rejects.toThrow('No diff found');
  });
});
```

---

## Future Enhancements

Potential improvements:

- **File-specific reviews**: Review individual files instead of entire diff
- **Incremental reviews**: Review only changed lines, not full files
- **Interactive mode**: Ask follow-up questions to the LLM
- **Historical analysis**: Compare with previous reviews to track improvements
- **Custom rule sets**: Let users define project-specific review criteria
- **Auto-fix suggestions**: Generate code patches for common issues
- **PR integration**: Automatically comment on pull requests
- **Learning mode**: Train on accepted/rejected reviews to improve accuracy
