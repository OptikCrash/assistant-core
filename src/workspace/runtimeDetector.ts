import { execSync } from "child_process";
import { WorkspaceRuntimeState } from "./types";

function safeExec(command: string, cwd: string): string | undefined {
    try {
        return execSync(command, { cwd }).toString().trim();
    } catch {
        return undefined;
    }
}

export function detectWorkspaceRuntime(
    rootPath: string
): WorkspaceRuntimeState {

    // --- Branch ---
    let currentBranch =
        safeExec("git rev-parse --abbrev-ref HEAD", rootPath) ?? "unknown";

    if (currentBranch === "HEAD") {
        currentBranch = safeExec("git describe --all", rootPath) ?? "unknown";
    }
    // --- Default branch ---
    let defaultBranch = "main";
    const symbolic = safeExec(
        "git symbolic-ref refs/remotes/origin/HEAD",
        rootPath
    );

    if (symbolic) {
        defaultBranch = symbolic.replace(
            "refs/remotes/origin/",
            ""
        );
    }

    // --- Ahead / Behind ---
    let aheadBy = 0;
    let behindBy = 0;

    const aheadBehind = safeExec(
        `git rev-list --left-right --count ${defaultBranch}...HEAD`,
        rootPath
    );

    if (aheadBehind) {
        const [behind, ahead] =
            aheadBehind.split(" ").map(Number);

        aheadBy = ahead || 0;
        behindBy = behind || 0;
    }

    // --- Porcelain status ---
    let hasStagedChanges = false;
    let hasUncommittedChanges = false;
    let untrackedFiles = 0;

    const status = safeExec("git status --porcelain", rootPath);

    if (status) {
        const lines = status.split("\n").filter(Boolean);

        for (const line of lines) {

            // Untracked
            if (line.startsWith("??")) {
                untrackedFiles++;
                continue;
            }

            // Staged = first column
            if (
                line[0] === "M" ||
                line[0] === "A" ||
                line[0] === "D" ||
                line[0] === "R"
            ) {
                hasStagedChanges = true;
            }

            // Unstaged = second column
            if (
                line[1] === "M" ||
                line[1] === "A" ||
                line[1] === "D"
            ) {
                hasUncommittedChanges = true;
            }
        }
    }

    const dirty =
        hasStagedChanges ||
        hasUncommittedChanges ||
        untrackedFiles > 0;

    // --- Last commit ---
    const lastCommitHash = safeExec("git rev-parse HEAD", rootPath) ?? "";

    const lastCommitDate = safeExec(
        "git log -1 --format=%cd --date=iso",
        rootPath
    ) ?? "";

    return {
        currentBranch,
        defaultBranch,
        aheadBy,
        behindBy,
        hasUncommittedChanges,
        hasStagedChanges,
        untrackedFiles,
        dirty,
        lastCommitHash,
        lastCommitDate
    };
}