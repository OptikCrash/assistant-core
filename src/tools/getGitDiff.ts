import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import { resolveWorkspacePath } from './pathUtils';
import { Tool } from './types';

const execAsync = promisify(exec);

const GetGitDiffSchema = z.object({
    workspaceId: z.string().optional(),
    rootPath: z.string().optional(), // Legacy support
    staged: z.boolean().optional(),
    baseBranch: z.string().optional()
}).refine(data => data.workspaceId || data.rootPath, {
    message: "Either workspaceId or rootPath must be provided"
});

type GetGitDiffInput = z.infer<typeof GetGitDiffSchema>;

export const getGitDiffTool: Tool<GetGitDiffInput> = {
    name: "get_git_diff",
    risk: "LOW",
    schema: GetGitDiffSchema,

    async execute(input) {
        // Support both workspaceId and legacy rootPath
        const rootPath = input.workspaceId
            ? await resolveWorkspacePath(input.workspaceId)
            : path.resolve(input.rootPath!);

        const { staged, baseBranch } = input;

        let command = "git diff";

        if (staged) {
            command = "git diff --staged";
        } else if (baseBranch) {
            command = `git diff ${baseBranch}`;
        }

        const { stdout } = await execAsync(command, {
            cwd: rootPath,
            maxBuffer: 10 * 1024 * 1024
        });

        return { diff: stdout };
    }
};
