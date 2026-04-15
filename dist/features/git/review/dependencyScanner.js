"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExports = extractExports;
exports.extractImportSpecs = extractImportSpecs;
exports.scanDependencies = scanDependencies;
function extractExports(content) {
    const results = new Set();
    const namedRegex = /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|function|interface|type|const|let|var|enum)\s+([A-Za-z0-9_]+)/g;
    const reExportRegex = /export\s*\{([^}]+)\}/g;
    let match;
    while ((match = namedRegex.exec(content)) !== null) {
        if (match[1] && match[1] !== "default")
            results.add(match[1]);
    }
    while ((match = reExportRegex.exec(content)) !== null) {
        const inner = match[1];
        inner
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
            .forEach(part => {
            const asMatch = part.match(/\bas\b\s+([A-Za-z0-9_]+)$/);
            if (asMatch?.[1])
                results.add(asMatch[1]);
            else
                results.add(part.replace(/\s+as\s+.*/, "").trim());
        });
    }
    return [...results];
}
/**
 * Extracts:
 *  - import { A, B as C } from "mod"
 *  - import * as X from "mod"
 *  - import X from "mod"
 *  - import X, { A } from "mod"
 *  - import type { A } from "mod"
 *  - import "mod" (side-effect only; returns symbols: [])
 */
function extractImportSpecs(content) {
    const specs = [];
    // Matches both:
    //   import ... from "x";
    //   import type ... from "x";
    const fromRegex = /^\s*import\s+(type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
    // Side-effect import:
    const sideEffectRegex = /^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
    let match;
    while ((match = fromRegex.exec(content)) !== null) {
        const isTypeOnly = Boolean(match[1]);
        const clause = match[2].trim();
        const module = match[3].trim();
        const symbols = parseImportClause(clause);
        specs.push({
            module,
            symbols,
            isTypeOnly
        });
    }
    while ((match = sideEffectRegex.exec(content)) !== null) {
        specs.push({
            module: match[1].trim(),
            symbols: []
        });
    }
    // Merge duplicates (same module) by unioning symbols
    const merged = new Map();
    for (const s of specs) {
        const existing = merged.get(s.module);
        if (!existing) {
            merged.set(s.module, { ...s, symbols: [...new Set(s.symbols)] });
            continue;
        }
        merged.set(s.module, {
            module: s.module,
            isTypeOnly: existing.isTypeOnly && s.isTypeOnly, // conservative merge
            symbols: [...new Set([...existing.symbols, ...s.symbols])]
        });
    }
    return [...merged.values()];
}
function parseImportClause(clause) {
    // Examples of clause:
    //   DefaultImport
    //   * as ns
    //   { A, B as C }
    //   DefaultImport, { A, B }
    //   DefaultImport, * as ns
    const symbols = [];
    // Split on first comma to separate default import from the rest
    const parts = splitOnFirstComma(clause);
    const first = parts[0]?.trim() ?? "";
    const rest = parts[1]?.trim();
    // Default import (if it doesn't start with { or *)
    if (first && !first.startsWith("{") && !first.startsWith("*")) {
        symbols.push(first);
    }
    else if (first.startsWith("*")) {
        // import * as ns
        symbols.push(first); // keep literal: "* as ns"
    }
    else if (first.startsWith("{")) {
        symbols.push(...parseNamedBindings(first));
    }
    if (rest) {
        if (rest.startsWith("{"))
            symbols.push(...parseNamedBindings(rest));
        else if (rest.startsWith("*"))
            symbols.push(rest); // "* as ns"
    }
    return symbols.map(s => s.trim()).filter(Boolean);
}
function parseNamedBindings(named) {
    // "{ A, B as C }" -> ["A", "C"]
    const inner = named.replace(/^\{\s*/, "").replace(/\s*\}$/, "").trim();
    if (!inner)
        return [];
    return inner
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .map(part => {
        const asMatch = part.match(/\bas\b\s+([A-Za-z0-9_]+)$/);
        if (asMatch?.[1])
            return asMatch[1];
        return part.replace(/\s+as\s+.*/, "").trim();
    });
}
function splitOnFirstComma(text) {
    const idx = text.indexOf(",");
    if (idx === -1)
        return [text];
    return [text.slice(0, idx), text.slice(idx + 1)];
}
function scanDependencies(content) {
    return {
        imports: extractImportSpecs(content),
        exports: extractExports(content),
    };
}
