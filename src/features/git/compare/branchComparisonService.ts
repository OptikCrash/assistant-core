import { execFile } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getWorkspace } from "../../../workspace/workspaceRegistry";
import {
    BranchComparisonRequest,
    BranchComparisonResult,
    BranchDiffArtifact,
    BranchMergeConflictError,
    DiffShortStat
} from "./types";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 20 * 1024 * 1024;

async function runGit(
    cwd: string,
    args: string[]
): Promise<{ stdout: string; stderr: string }> {
    try {
        const { stdout, stderr } = await execFileAsync("git", args, {
            cwd,
            maxBuffer: MAX_BUFFER
        });

        return {
            stdout: stdout.toString(),
            stderr: stderr.toString()
        };
    } catch (error: any) {
        const stderr = error?.stderr?.toString?.() ?? "";
        const stdout = error?.stdout?.toString?.() ?? "";
        const details = stderr || stdout || error.message;
        throw new Error(`git ${args.join(" ")} failed: ${details}`.trim());
    }
}

async function runGitAllowFailure(
    cwd: string,
    args: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
        const { stdout, stderr } = await execFileAsync("git", args, {
            cwd,
            maxBuffer: MAX_BUFFER
        });

        return {
            exitCode: 0,
            stdout: stdout.toString(),
            stderr: stderr.toString()
        };
    } catch (error: any) {
        return {
            exitCode: typeof error?.code === "number" ? error.code : 1,
            stdout: error?.stdout?.toString?.() ?? "",
            stderr: error?.stderr?.toString?.() ?? error.message ?? ""
        };
    }
}

async function verifyRefExists(rootPath: string, ref: string): Promise<void> {
    const result = await runGitAllowFailure(
        rootPath,
        ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]
    );

    if (result.exitCode !== 0) {
        throw new Error(`Git ref not found: ${ref}`);
    }
}

async function getDiffOutput(
    rootPath: string,
    baseRef: string,
    targetRef: string,
    args: string[]
): Promise<string> {
    const result = await runGit(rootPath, [
        "diff",
        ...args,
        `${baseRef}...${targetRef}`
    ]);

    return result.stdout;
}

function parseShortStat(stat: string): DiffShortStat {
    const filesChanged = stat.match(/(\d+)\s+files?\s+changed/i);
    const insertions = stat.match(/(\d+)\s+insertions?\(\+\)/i);
    const deletions = stat.match(/(\d+)\s+deletions?\(-\)/i);

    return {
        filesChanged: filesChanged ? parseInt(filesChanged[1], 10) : 0,
        insertions: insertions ? parseInt(insertions[1], 10) : 0,
        deletions: deletions ? parseInt(deletions[1], 10) : 0
    };
}

function normalizeFileList(text: string): string[] {
    return text
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
}

function makePercent(count: number, total: number): number {
    if (total === 0) {
        return 0;
    }

    return Number(((count / total) * 100).toFixed(2));
}

async function buildDiffArtifact(
    rootPath: string,
    baseRef: string,
    targetRef: string,
    includePatches: boolean,
    displayRef = targetRef
): Promise<BranchDiffArtifact> {
    const [filesOutput, statOutput, shortStatOutput, patchOutput] =
        await Promise.all([
            getDiffOutput(rootPath, baseRef, targetRef, ["--name-only"]),
            getDiffOutput(rootPath, baseRef, targetRef, ["--stat"]),
            getDiffOutput(rootPath, baseRef, targetRef, ["--shortstat"]),
            includePatches
                ? getDiffOutput(rootPath, baseRef, targetRef, [])
                : Promise.resolve("")
        ]);

    const files = normalizeFileList(filesOutput);

    return {
        ref: displayRef,
        files,
        fileCount: files.length,
        shortStat: parseShortStat(shortStatOutput),
        stat: statOutput.trim(),
        patch: includePatches ? patchOutput : undefined
    };
}

async function getConflictFiles(rootPath: string): Promise<string[]> {
    const result = await runGitAllowFailure(
        rootPath,
        ["diff", "--name-only", "--diff-filter=U"]
    );

    return normalizeFileList(result.stdout);
}

async function cleanupComparisonWorkspace(
    rootPath: string,
    worktreePath?: string,
    tempBranch?: string
): Promise<void> {
    if (worktreePath) {
        await runGitAllowFailure(rootPath, ["worktree", "remove", "--force", worktreePath]);
        await fs.rm(worktreePath, { recursive: true, force: true }).catch(() => undefined);
    }

    if (tempBranch) {
        await runGitAllowFailure(rootPath, ["branch", "-D", tempBranch]);
    }
}

function createCombinedLabel(baseRef: string, mergeRefs: string[]): string {
    if (mergeRefs.length === 0) {
        return baseRef;
    }

    return [baseRef, ...mergeRefs].join(" + ");
}

export async function compareBranches(
    input: BranchComparisonRequest
): Promise<BranchComparisonResult> {
    const workspace = await getWorkspace(input.workspaceId);
    const rootPath = workspace.rootPath;

    const baseRef = input.baseRef ?? "origin/develop";
    const remote = input.remote ?? "origin";
    const mergeRefs = input.theirMergeRefs ?? [];
    const includePatches = input.includePatches ?? false;
    const combinedLabel = createCombinedLabel(input.theirBaseRef, mergeRefs);

    if (input.fetch) {
        await runGit(rootPath, ["fetch", remote, "--prune"]);
    }

    await Promise.all([
        verifyRefExists(rootPath, baseRef),
        verifyRefExists(rootPath, input.yourRef),
        verifyRefExists(rootPath, input.theirBaseRef),
        ...mergeRefs.map(ref => verifyRefExists(rootPath, ref))
    ]);

    let worktreePath: string | undefined;
    let tempBranch: string | undefined;
    let comparisonRef = input.theirBaseRef;

    try {
        if (mergeRefs.length > 0) {
            worktreePath = await fs.mkdtemp(
                path.join(os.tmpdir(), "assistant-core-branch-compare-")
            );

            tempBranch = `assistant-core-compare-${randomUUID().replace(/-/g, "")}`;

            await runGit(rootPath, [
                "worktree",
                "add",
                "-b",
                tempBranch,
                worktreePath,
                input.theirBaseRef
            ]);

            for (const mergeRef of mergeRefs) {
                const mergeResult = await runGitAllowFailure(worktreePath, [
                    "-c",
                    "user.name=Assistant Core",
                    "-c",
                    "user.email=assistant-core@example.invalid",
                    "merge",
                    "--no-ff",
                    "--no-edit",
                    mergeRef
                ]);

                if (mergeResult.exitCode !== 0) {
                    const conflictFiles = await getConflictFiles(worktreePath);
                    throw new BranchMergeConflictError(
                        mergeRef,
                        conflictFiles,
                        mergeResult.stderr || mergeResult.stdout
                    );
                }
            }

            comparisonRef = tempBranch;
        }

        const [yourDiff, theirDiff] = await Promise.all([
            buildDiffArtifact(
                rootPath,
                baseRef,
                input.yourRef,
                includePatches,
                input.yourRef
            ),
            buildDiffArtifact(
                rootPath,
                baseRef,
                comparisonRef,
                includePatches,
                combinedLabel
            )
        ]);

        const theirFileSet = new Set(theirDiff.files);
        const yourFileSet = new Set(yourDiff.files);

        const overlappingFiles = yourDiff.files.filter(file => theirFileSet.has(file));
        const onlyInYours = yourDiff.files.filter(file => !theirFileSet.has(file));
        const onlyInTheirs = theirDiff.files.filter(file => !yourFileSet.has(file));

        return {
            workspaceId: input.workspaceId,
            baseRef,
            fetched: input.fetch ?? false,
            yourRef: input.yourRef,
            theirCombined: {
                baseRef: input.theirBaseRef,
                mergeRefs,
                combinedLabel
            },
            your: yourDiff,
            theirs: theirDiff,
            overlappingFiles,
            overlapCount: overlappingFiles.length,
            overlapPercentOfYours: makePercent(
                overlappingFiles.length,
                yourDiff.fileCount
            ),
            overlapPercentOfTheirs: makePercent(
                overlappingFiles.length,
                theirDiff.fileCount
            ),
            onlyInYours,
            onlyInTheirs
        };
    } finally {
        await cleanupComparisonWorkspace(rootPath, worktreePath, tempBranch);
    }
}
