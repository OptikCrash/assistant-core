# 🔥 BACK BURNER

This document captures higher-level enhancements that are intentionally deferred while we prioritize:

- Workspace support
- UI integration
- Core stability

These items represent strategic future upgrades.

---

# 🧠 Deepening the Diff Engine

The current diff engine supports:

- Export diff detection
- Method signature change detection
- Cross-file ripple analysis
- Risk scoring matrix
- Confidence scoring

The following improvements would elevate it to production-grade PR safety analysis.

---

## 1️⃣ Rename Detection Heuristics

Detect probable renames:

```bash
-export class Foo
+export class Bar
```

Enhancements:

- Token similarity scoring
- Method body comparison
- Dependency graph similarity
- Confidence boost for rename patterns

Outcome:

- “Likely rename Foo → Bar (confidence 82%)”
- Reduce false-positive breaking change flags

---

## 2️⃣ Migration Safety Analysis

Deep inspection of migration files:

- Column drops
- NOT NULL additions
- Foreign key changes
- Index changes
- Missing transactions
- Data transformation risks

Risk amplification rules:

- Column drop → HIGH minimum
- Non-null without default → HIGH
- FK modification → MEDIUM+

Goal:
> Database Safety Layer

---

## 3️⃣ API Contract Drift Detection

Detect breaking API changes:

- DTO property removals
- Type narrowing (string → number)
- Optional → required transitions
- Controller return type changes

Add ripple awareness:

- DTO changes impacting service layers
- Service changes impacting controllers

Goal:
> Backward Compatibility Analyzer

---

## 4️⃣ Blame & Change Context Awareness

Incorporate Git history signals:

- `git blame` to identify ownership
- File churn detection
- Recently modified core modules
- Wide-scope diffs risk multiplier

Use in risk scoring:

- High churn files increase confidence
- Core module changes raise severity

Goal:
> Contextual Risk Amplification

---

## 5️⃣ Structural Change Amplifiers

Enhance risk scoring for:

- Large diff surface area
- Many files touched
- Central dependency nodes modified
- Cross-layer edits (DTO + model + migration)

Goal:
> Change Heatmap Engine

---

# 🚀 Broader Feature Scope

Beyond diff analysis, the assistant can evolve into a development intelligence platform.

---

## 1️⃣ Architectural Review Mode

Allow analysis of:

- Entire directories
- Module boundaries
- Circular dependencies
- Layer violations
- Inversion-of-control leaks

Goal:
> Static Architecture Guardian

---

## 2️⃣ Refactor Suggestion Engine

Detect:

- Duplicate code
- Large methods
- God classes
- Tight coupling
- Poor separation of concerns

Enhancements:

- Suggest structured refactors
- Generate migration-safe patch suggestions

Goal:
> Intelligent Refactoring Assistant

---

## 3️⃣ Change Impact Preview

Simulate:

- If this export is removed, what breaks?
- If this method signature changes, who is affected?
- If this column drops, what services depend on it?

Goal:
> Pre-Change Impact Simulator

---

## 4️⃣ CI/CD Risk Gate

Enable:

- Fail CI if `overallRisk >= HIGH`
- Require manual approval if `confidence > 70%`
- Auto-comment PR with structured risk summary

Goal:
> Dev Safety Enforcement Layer

---

## 5️⃣ Patch Generation

Add:

- Suggested fixes for rename propagation
- Automatic import update patches
- Method signature alignment suggestions

Goal:
> Auto-Fix Assistant

---

# 🧭 Future Vision

Long-term direction options:

### A — Elite PR Safety Engine

Focus deeply on:

- Static analysis
- Risk prediction
- Database & API contract integrity

### B — Developer Intelligence Platform

Expand into:

- Architecture analysis
- Refactoring intelligence
- Codebase health scoring
- Multi-repo awareness

### C — Full Dev Copilot Alternative

Integrate:

- Planning engine
- Task orchestration
- Code generation
- Repo-wide reasoning

---

# 🎯 Current Priority

We are intentionally focusing on:

1. Workspace support
2. Multi-repo awareness
3. UI integration for structured results

These will unlock real-world usability before deeper engine refinement.

---

# 🧠 Principle

Intelligence without usability is wasted.

First make it usable.
Then make it elite.
