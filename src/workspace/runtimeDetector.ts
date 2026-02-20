import { execSync } from "child_process";
import { WorkspaceRuntimeState } from "./types";

export function detectWorkspaceRuntime(
    rootPath: string
): WorkspaceRuntimeState {

    let currentBranch = "unknown";
    let hasUncommittedChanges = false;
    let hasStagedChanges = false;

    try {
        currentBranch = execSync(
            "git rev-parse --abbrev-ref HEAD",
            { cwd: rootPath }
        ).toString().trim();
    } catch { }

    try {
        const status = execSync(
            "git status --porcelain",
            { cwd: rootPath }
        ).toString();

        const lines = status.split("\n").filter(Boolean);

        for (const line of lines) {
            if (line.startsWith("M") || line.startsWith("A") || line.startsWith("D")) {
                hasStagedChanges = true;
            }

            if (line[1] === "M" || line[1] === "A" || line[1] === "D") {
                hasUncommittedChanges = true;
            }
        }

    } catch { }

    return {
        currentBranch,
        hasUncommittedChanges,
        hasStagedChanges
    };
}