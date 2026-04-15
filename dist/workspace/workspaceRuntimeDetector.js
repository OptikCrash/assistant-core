"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectWorkspaceRuntime = detectWorkspaceRuntime;
const child_process_1 = require("child_process");
function detectWorkspaceRuntime(rootPath) {
    const runtime = {
        hasUncommittedChanges: false,
        hasStagedChanges: false
    };
    try {
        runtime.currentBranch = (0, child_process_1.execSync)("git rev-parse --abbrev-ref HEAD", { cwd: rootPath }).toString().trim();
        try {
            runtime.defaultBranch = (0, child_process_1.execSync)("git symbolic-ref refs/remotes/origin/HEAD", { cwd: rootPath })
                .toString()
                .trim()
                .replace("refs/remotes/origin/", "");
        }
        catch {
            runtime.defaultBranch = "main";
        }
        const status = (0, child_process_1.execSync)("git status --porcelain", { cwd: rootPath }).toString();
        runtime.hasUncommittedChanges = status
            .split("\n")
            .some(line => line.startsWith(" M") || line.startsWith("??"));
        runtime.hasStagedChanges = status
            .split("\n")
            .some(line => line.startsWith("M ") || line.startsWith("A "));
        // --- Ahead / Behind Detection ---
        if (runtime.defaultBranch) {
            const aheadBehind = (0, child_process_1.execSync)(`git rev-list --left-right --count ${runtime.defaultBranch}...HEAD`, { cwd: rootPath })
                .toString()
                .trim()
                .split("\t");
            const behind = parseInt(aheadBehind[0], 10);
            const ahead = parseInt(aheadBehind[1], 10);
            runtime.behindBy = isNaN(behind) ? 0 : behind;
            runtime.aheadBy = isNaN(ahead) ? 0 : ahead;
        }
    }
    catch {
        // Fail silently — runtime detection should never crash engine
    }
    return runtime;
}
