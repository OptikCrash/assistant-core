import path from "path";
import { isSensitivePath } from "../workspace/securityGuard";
import { generateMigrationTool } from "./generateMigration";
import { getGitDiffTool } from "./getGitDiff";
import { normalizePath, resolveSafePathAsync, resolveWorkspacePath } from "./pathUtils";
import { CandidatePath, Tool, ToolCallContext } from "./types";

const tools: Tool[] = [
    generateMigrationTool,
    getGitDiffTool
];

async function getToolRoot(validatedInput: unknown): Promise<string> {
    const obj = validatedInput as Record<string, unknown>;

    const workspaceId = typeof obj.workspaceId === "string" ? obj.workspaceId : undefined;
    if (workspaceId) return await resolveWorkspacePath(workspaceId);

    const rootPath = typeof obj.rootPath === "string" ? obj.rootPath : undefined;
    if (rootPath) return path.resolve(rootPath);

    throw new Error("No workspaceId/rootPath available to resolve tool root.");
}

/**
 * Recursively walk an object/array and collect any string values that look like paths.
 * Conservative heuristic: only checks keys that commonly represent paths.
 */
function collectCandidatePaths(value: unknown): Array<{ key: string; value: string }> {
    const results: Array<{ key: string; value: string }> = [];

    const PATH_KEYS = new Set([
        "path",
        "filePath",
        "filepath",
        "file",
        "dir",
        "directory",
        "directoryPath",
        "targetPath",
        "sourcePath",
    ]);

    function walk(node: unknown): void {
        if (node == null) return;

        if (Array.isArray(node)) {
            for (const item of node) walk(item);
            return;
        }

        if (typeof node === "object") {
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                if (PATH_KEYS.has(k) && typeof v === "string") {
                    results.push({ key: k, value: v });
                } else {
                    walk(v);
                }
            }
        }
    }

    walk(value);
    return results;
}

/**
 * Enforce sensitive path denial based on validated tool input.
 * Canonicalizes user paths via resolveSafePathAsync and checks the resulting
 * workspace-relative path using isSensitivePath().
 */

async function enforceNoSensitivePaths(
    toolName: string,
    validatedInput: unknown,
    candidates?: CandidatePath
) {
    const c = candidates ?? collectCandidatePaths(validatedInput);
    if (c.length === 0) return;

    const root = await getToolRoot(validatedInput);

    for (const { key, value: userPath } of c) {
        const abs = await resolveSafePathAsync(root, userPath);
        const rel = normalizePath(path.relative(root, abs));

        if (isSensitivePath(rel)) {
            throw new Error(
                `Access denied: tool "${toolName}" attempted a sensitive path via "${key}": "${userPath}" (resolved: "${rel}")`
            );
        }
    }
}

export async function executeToolCall(
    toolName: string,
    input: unknown,
    ctx: ToolCallContext = { source: "external" }
) {
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) throw new Error(`Tool not implemented: ${toolName}`);

    // 1) Validate input
    const parsed = tool.schema.safeParse(input);
    if (!parsed.success) {
        throw new Error(`Invalid input for tool ${toolName}: ${parsed.error.message}`);
    }

    const candidates = collectCandidatePaths(parsed.data);
    // 1.5) Enforce "no rootPath from external callers"
    enforceRootPathPolicy(toolName, parsed.data, ctx, candidates);

    // 2) Enforce sensitive path rules on canonicalized paths
    await enforceNoSensitivePaths(toolName, parsed.data, candidates);

    // 3) Execute
    return tool.execute(parsed.data as any);
}

function enforceRootPathPolicy(
    toolName: string,
    validatedInput: unknown,
    ctx: ToolCallContext,
    candidates?: CandidatePath
) {
    const c = candidates ?? collectCandidatePaths(validatedInput);
    if (c.length === 0) return;

    const obj = validatedInput as Record<string, unknown>;
    const workspaceId = typeof obj.workspaceId === "string" ? obj.workspaceId : undefined;
    const rootPath = typeof obj.rootPath === "string" ? obj.rootPath : undefined;

    if (ctx.source === "external") {
        if (rootPath) {
            throw new Error(
                `Tool "${toolName}" may not accept rootPath from external calls. Use workspaceId.`
            );
        }
        if (!workspaceId) {
            throw new Error(`Tool "${toolName}" requires workspaceId for external calls.`);
        }
    }
}